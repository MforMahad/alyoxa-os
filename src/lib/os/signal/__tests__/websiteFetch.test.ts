jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }))
jest.mock('node:https', () => ({ request: jest.fn() }))
jest.mock('node:http', () => ({ request: jest.fn() }))
import { EventEmitter } from 'node:events'
import { lookup } from 'node:dns/promises'
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'
import { fetchWebsiteHtml } from '../websiteFetch'

type Reply = { status?: number; type?: string; location?: string; body?: string; encoding?: string }
function network(replies: Reply[]) {
  const request = jest.fn((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error: Error) => void }
    req.destroy = () => req.emit('close')
    req.end = () => {
      const reply = replies.shift()
      if (!reply) throw new Error('Unexpected request')
      const response = new EventEmitter() as EventEmitter & { statusCode: number; headers: Record<string, string | undefined>; destroy: () => void }
      response.statusCode = reply.status ?? 200
      response.headers = { 'content-type': reply.type ?? 'text/plain', location: reply.location, 'content-encoding': reply.encoding }
      response.destroy = () => {}
      callback(response)
      response.emit('data', Buffer.from(reply.body ?? ''))
      response.emit('end')
      req.emit('close')
    }
    return req
  })
  jest.mocked(httpsRequest).mockImplementation(request as never)
  jest.mocked(httpRequest).mockImplementation(request as never)
  return request
}
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(lookup).mockResolvedValue([{ address: '93.184.215.14', family: 4 }] as never)
})
it('checks robots before fetching content and pins request resolution', async () => {
  const request = network([{ body: 'User-agent: *\nAllow: /' }, { type: 'text/html', body: '<title>Actual HTML</title>' }])
  const result = await fetchWebsiteHtml(new URL('https://arbitrary.example.org/path'))
  expect(result.body.toString()).toContain('Actual HTML')
  expect(request.mock.calls.map(call => call[0].pathname)).toEqual(['/robots.txt', '/path'])
  expect(request.mock.calls[1][1].lookup).toEqual(expect.any(Function))
})
it('does not fetch disallowed content', async () => {
  const request = network([{ body: 'User-agent: *\nDisallow: /private' }])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/private'))).rejects.toThrow('disallow')
  expect(request).toHaveBeenCalledTimes(1)
})
it('does not bypass a crawl delay larger than its time budget', async () => {
  const request = network([{ body: 'User-agent: *\nCrawl-delay: 60' }])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/'))).rejects.toThrow('crawl delay exceeds')
  expect(request).toHaveBeenCalledTimes(1)
})
it('fails closed on robots restrictions or server failures', async () => {
  network([{ status: 403 }])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/'))).rejects.toThrow('Robots directives could not be verified')
})
it('accepts missing robots policy but reports blocked content', async () => {
  network([{ status: 404 }, { status: 403 }])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/'))).rejects.toThrow('HTTP 403')
})
it('revalidates redirect hosts and refuses private networks', async () => {
  network([{ status: 404 }, { status: 302, location: 'http://127.0.0.1/private' }])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/'))).rejects.toThrow('non-public')
})
it('rejects mixed public/private DNS answers before any request', async () => {
  jest.mocked(lookup).mockResolvedValue([{ address: '93.184.215.14', family: 4 }, { address: '10.0.0.1', family: 4 }] as never)
  const request = network([])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/'))).rejects.toThrow('non-public')
  expect(request).not.toHaveBeenCalled()
})
it('rejects non-HTML and oversized responses rather than inventing findings', async () => {
  network([{ status: 404 }, { type: 'application/json', body: '{}' }])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/'))).rejects.toThrow('not HTML')
  network([{ status: 404 }, { type: 'text/html', body: 'x'.repeat(2 * 1024 * 1024 + 1) }])
  await expect(fetchWebsiteHtml(new URL('https://arbitrary.example.org/'))).rejects.toThrow('size limit')
})
