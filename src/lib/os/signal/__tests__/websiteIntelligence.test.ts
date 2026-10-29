import { analyzeWebsiteHtml, evaluateRobotsPolicy, robotsAllows } from '../websiteIntelligence'

describe('domain-independent HTML evidence', () => {
  it.each(['https://docs.example.org/guide', 'http://shop.example.net/catalog?q=1'])('measures returned content without domain branches: %s', value => {
    const result = analyzeWebsiteHtml('<html lang="fr"><head><title>Actual title</title><meta name="description" content="Real summary"></head><body><h1>Guide</h1><img src="a"><img src="b" alt=""><a href="/x">Link</a></body></html>', new URL(value), {})
    expect(result.evidence.find(x => x.id === 'title')?.value).toBe('Actual title')
    expect(result.evidence.find(x => x.id === 'missing_alt')?.value).toBe(1)
    expect(result.evidence.find(x => x.id === 'language')?.value).toBe('fr')
    expect(result.limitations.join(' ')).toContain('Single fetched HTML')
  })
  it('reports sparse JavaScript shells honestly and excludes noai content from recommendations', () => {
    const result = analyzeWebsiteHtml('<html><head><meta name="robots" content="noai"></head><body><div id="root"></div><script>business fiction</script></body></html>', new URL('https://app.example.org'), {})
    expect(result.textExcerpt).toBe('')
    expect(result.excludedFromAI).toBe(true)
    expect(result.limitations.join(' ')).toContain('neither is proven')
  })
})

describe('robots matching', () => {
  const url = (path: string) => new URL(path, 'https://host.example.org')
  it('honors wildcard groups, longest matches, allow ties, query patterns and end anchors', () => {
    const policy = 'User-agent: *\nDisallow: /private\nAllow: /private/open\nDisallow: /*?secret=*\nDisallow: /exact$'
    expect(robotsAllows(policy, url('/private'))).toBe(false)
    expect(robotsAllows(policy, url('/private/open'))).toBe(true)
    expect(robotsAllows(policy, url('/page?secret=1'))).toBe(false)
    expect(robotsAllows(policy, url('/exact'))).toBe(false)
    expect(robotsAllows(policy, url('/exactly'))).toBe(true)
    expect(robotsAllows('User-agent: *\nDisallow: /\nAllow: /', url('/'))).toBe(true)
  })
  it('prefers specific crawler groups and combines matching groups', () => {
    const policy = 'User-agent: *\nDisallow: /\nUser-agent: ALYOXA-WebsiteScanner\nAllow: /\nUser-agent: ALYOXA-WebsiteScanner\nDisallow: /closed'
    expect(robotsAllows(policy, url('/'))).toBe(true)
    expect(robotsAllows(policy, url('/closed'))).toBe(false)
  })
  it('preserves applicable crawl delays and ignores empty agent names', () => {
    expect(evaluateRobotsPolicy('User-agent: *\nCrawl-delay: 12\nDisallow: /private', url('/'))).toEqual({ allowed: true, crawlDelaySeconds: 12 })
    expect(robotsAllows('User-agent: *\nDisallow: /\nUser-agent:\nAllow: /', url('/'))).toBe(false)
  })
})
