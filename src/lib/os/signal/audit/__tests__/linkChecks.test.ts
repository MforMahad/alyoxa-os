jest.mock('../../websiteFetch', () => ({
  resolvePublicAddress: jest.fn(),
  requestPage: jest.fn(),
  WebsiteHttpError: class extends Error {
    constructor(public statusCode: number) { super(`Website returned HTTP ${statusCode}.`) }
  },
}))
import { requestPage, resolvePublicAddress, WebsiteHttpError } from '../../websiteFetch'
import { checkQuickInternalLinks } from '../linkChecks'

const origin = 'https://links.example.org'
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(resolvePublicAddress).mockResolvedValue({ address: '93.184.215.14', family: 4 })
})

async function check(html: string, robots = '') {
  jest.useFakeTimers()
  try {
    const pending = checkQuickInternalLinks(html, origin + '/', origin, robots, origin)
    await jest.advanceTimersByTimeAsync(60000)
    return await pending
  } finally { jest.useRealTimers() }
}

it('deduplicates normalized internal links and confirms returned 4xx responses', async () => {
  jest.mocked(requestPage).mockRejectedValue(new WebsiteHttpError(404))
  const result = await check('<a href="/missing#top">one</a><a href="/missing">two</a>')
  expect(result).toMatchObject({ candidate_count: 1, checked_count: 1,
    checks: [{ url: origin + '/missing', status: 'http_error', http_status: 404 }] })
  expect(requestPage).toHaveBeenCalledTimes(1)
  expect(resolvePublicAddress).toHaveBeenCalledWith('links.example.org', 8000)
})

it('distinguishes blocked, rate-limited, timeout responses and non-response failures', async () => {
  jest.mocked(requestPage).mockImplementation(async url => {
    const code = url.pathname === '/locked' ? 403 : url.pathname === '/limited' ? 429 : 408
    throw new WebsiteHttpError(code)
  })
  const result = await check('<a href="/locked">locked</a><a href="/limited">limited</a><a href="/timeout">timeout</a>')
  expect(result.checks.map(item => [item.status, item.http_status])).toEqual(expect.arrayContaining([
    ['blocked', 403], ['rate_limited', 429], ['http_timeout', 408],
  ]))
  jest.mocked(resolvePublicAddress).mockRejectedValue(new Error('non-public network address'))
  const unsafe = await check('<a href="/unsafe">unsafe</a>')
  expect(unsafe.checks[0]).toMatchObject({ status: 'unverified', reason: 'unsafe_destination' })
})

it('detects an observed redirect loop and never follows an external redirect', async () => {
  jest.mocked(requestPage).mockImplementation(async url => {
    if (url.pathname === '/loop') return { redirectLocation: '/again', statusCode: 302 }
    if (url.pathname === '/again') return { redirectLocation: '/loop', statusCode: 301 }
    return { redirectLocation: 'https://outside.example.org/', statusCode: 302 }
  })
  const result = await check('<a href="/loop">loop</a><a href="/external">external</a>')
  expect(result.checks).toEqual(expect.arrayContaining([
    { url: origin + '/loop', status: 'redirect_loop', http_status: 301, final_url: origin + '/loop' },
    { url: origin + '/external', status: 'outside_origin_redirect', http_status: 302 },
  ]))
})

it('honors robots exclusions and the five-link request limit', async () => {
  jest.mocked(requestPage).mockRejectedValue(new WebsiteHttpError(404))
  const html = '<a href="/blocked">blocked</a>' + Array.from({ length: 6 }, (_, index) => `<a href="/p${index}">page</a>`).join('')
  const result = await check(html, 'User-agent: *\nDisallow: /blocked')
  expect(result.checks[0]).toMatchObject({ status: 'robots_blocked', http_status: null })
  expect(result.candidate_count).toBe(7)
  expect(result.checks.filter(item => ['quick_check_limit', 'quick_check_time_budget'].includes(item.reason ?? ''))).toHaveLength(2)
  expect(requestPage).toHaveBeenCalledTimes(4)
})

it('does not make extra requests when crawl delay or robots policy origin cannot be safely honored', async () => {
  const delayed = await check('<a href="/page">page</a>', 'User-agent: *\nCrawl-delay: 7')
  expect(delayed.checks[0]).toMatchObject({ status: 'unverified', reason: 'crawl_delay_exceeds_quick_check_budget' })
  const mismatched = await check('<a href="/page">page</a>', '')
  expect(requestPage).toHaveBeenCalledTimes(1)
  const offOriginPolicy = await checkQuickInternalLinks('<a href="/page">page</a>', origin + '/', origin, '', 'https://other.example.org')
  expect(offOriginPolicy.checks[0]).toMatchObject({ status: 'unverified', reason: 'robots_policy_origin_mismatch' })
  expect(mismatched.checked_count).toBe(1)
})

it('keeps sequential checks within the shared time budget when robots permits long delays', async () => {
  jest.mocked(requestPage).mockRejectedValue(new WebsiteHttpError(404))
  const html = Array.from({ length: 5 }, (_, index) => `<a href="/p${index}">page</a>`).join('')
  const result = await check(html, 'User-agent: *\nCrawl-delay: 6')

  expect(result.checks[0]).toMatchObject({ status: 'http_error', http_status: 404 })
  expect(result.checks.slice(1)).toEqual(expect.arrayContaining([
    expect.objectContaining({ status: 'unverified', reason: 'quick_check_time_budget' }),
  ]))
  expect(requestPage).toHaveBeenCalledTimes(1)
})
