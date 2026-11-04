import { robotsSiteCheck, sitemapSiteCheck, siteCheckEvidence, SITEMAP_MAX_BYTES } from '../websiteSiteChecks'

const origin = 'https://resources.example.org'
const inspect = (xml: string) => sitemapSiteCheck(Buffer.from(xml), origin + '/sitemap.xml', origin + '/sitemap.xml', 200)

it('retains actual robots status, final URL and bounded declarations without following external URLs', () => {
  const result = robotsSiteCheck('User-agent: *\nSitemap: https://external.example.org/index.xml\nSitemap: ' + origin + '/pages.xml', origin + '/robots.txt', origin + '/policy.txt', 200)
  expect(result).toMatchObject({ http_status: 200, final_url: origin + '/policy.txt', sitemap_refs: ['https://external.example.org/index.xml', origin + '/pages.xml'] })
  expect(robotsSiteCheck('', origin + '/robots.txt', origin + '/robots.txt', 404, 'missing').status).toBe('missing')
  expect(robotsSiteCheck(Array.from({ length: 100 }, (_, i) => `Sitemap: ${origin}/${i}.xml`).join('\n'), origin + '/robots.txt', null, 200).sitemap_refs).toHaveLength(10)
})

it.each(['<!DOCTYPE urlset SYSTEM "https://private.example.org/xxe">', '<!ENTITY x "hidden">'])('rejects XML declarations before parsing: %s', declaration => {
  expect(inspect(declaration + '<urlset/>').status).toBe('unsafe_xml_declaration')
})

it('counts bounded sitemap structures without fetching locations or claiming schema validation', () => {
  const result = inspect('<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">' + Array.from({ length: 30 }, (_, i) => `<sm:url><sm:loc>${origin}/${i}</sm:loc></sm:url>`).join('') + '</sm:urlset>')
  expect(result).toMatchObject({ status: 'parsed', document_type: 'urlset', url_count: 30, truncated: true })
  expect(result.references).toHaveLength(10)
  expect(siteCheckEvidence([result])).toContainEqual(expect.objectContaining({ value: 30 }))
  expect(inspect(`<sitemapindex><sitemap><loc>${origin}/child.xml</loc></sitemap></sitemapindex>`)).toMatchObject({ document_type: 'sitemapindex', url_count: 1 })
  expect(inspect('<html><body>Not a sitemap</body></html>').status).toBe('unrecognized_xml')
})

it('bounds XML bytes, nodes and supported encodings', () => {
  expect(sitemapSiteCheck(Buffer.alloc(SITEMAP_MAX_BYTES + 1), origin, origin, 200).status).toBe('size_limit')
  expect(inspect('<urlset>' + '<url/>'.repeat(10000) + '</urlset>').status).toBe('element_limit')
  expect(inspect('<?xml version="1.0" encoding="UTF-16"?><urlset/>').status).toBe('unsupported_encoding')
})
