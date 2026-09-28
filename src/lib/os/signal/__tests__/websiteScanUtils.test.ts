import {
  createPinnedLookup,
  extractWebsitePage,
  isPublicIpAddress,
  parseWebsiteUrl,
  WEBSITE_SCAN_MAX_TEXT_CHARS,
} from '../websiteScanUtils'

describe('website scan utilities', () => {
  it('returns the pinned address in both Node lookup callback forms', () => {
    const pinnedAddress = '66.29.132.102'
    const pinnedFamily = 4
    const lookup = createPinnedLookup(pinnedAddress, pinnedFamily)

    lookup('example.com', { all: true }, (error, addresses, family) => {
      expect(error).toBeNull()
      expect(addresses).toEqual([{ address: pinnedAddress, family: pinnedFamily }])
      expect(family).toBeUndefined()
    })

    lookup('example.com', { all: false }, (error, address, family) => {
      expect(error).toBeNull()
      expect(address).toBe(pinnedAddress)
      expect(family).toBe(pinnedFamily)
    })
  })

  it('accepts HTTP and HTTPS on their standard ports only', () => {
    expect(parseWebsiteUrl('https://example.com/path').protocol).toBe('https:')
    expect(() => parseWebsiteUrl('ftp://example.com')).toThrow()
    expect(() => parseWebsiteUrl('http://example.com:8080')).toThrow()
    expect(() => parseWebsiteUrl('http://user:pass@example.com')).toThrow()
  })

  it('rejects local and non-public IP destinations', () => {
    expect(() => parseWebsiteUrl('http://localhost')).toThrow()
    expect(isPublicIpAddress('127.0.0.1')).toBe(false)
    expect(isPublicIpAddress('10.0.0.1')).toBe(false)
    expect(isPublicIpAddress('192.0.2.1')).toBe(false)
    expect(isPublicIpAddress('::ffff:127.0.0.1')).toBe(false)
    expect(isPublicIpAddress('8.8.8.8')).toBe(true)
    expect(isPublicIpAddress('2606:4700:4700::1111')).toBe(true)
  })

  it('extracts bounded page metadata, headings, and visible text', () => {
    const page = extractWebsitePage(`
      <html><head><title>Example Page</title>
      <meta name="description" content="A concise summary"></head>
      <body><script>do not include</script><h1>Welcome</h1>
      <p>${'Useful content '.repeat(400)}</p></body></html>
    `)

    expect(page.title).toBe('Example Page')
    expect(page.description).toBe('A concise summary')
    expect(page.headings).toEqual(['Welcome'])
    expect(page.text).not.toContain('do not include')
    expect(page.text.length).toBeLessThanOrEqual(WEBSITE_SCAN_MAX_TEXT_CHARS)
  })
})