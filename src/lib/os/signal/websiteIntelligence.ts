import * as cheerio from 'cheerio'

export interface WebsiteEvidence {
  id: string
  label: string
  value: string | number | boolean
}

/** Measurements of the returned HTML only; no business assumptions or synthetic scores. */
export function analyzeWebsiteHtml(html: string, url: URL, headers: Record<string, string | string[] | undefined>) {
  const $ = cheerio.load(html)
  const title = $('title').first().text().replace(/\s+/g, ' ').trim()
  const description = $('meta[name="description" i]').first().attr('content') ?? ''
  const images = $('img').toArray()
  const evidence: WebsiteEvidence[] = [
    { id: 'transport', label: 'Final page uses HTTPS', value: url.protocol === 'https:' },
    { id: 'title', label: 'HTML title', value: title.slice(0, 250) },
    { id: 'description', label: 'Meta description', value: description.slice(0, 500) },
    { id: 'language', label: 'Document language', value: ($('html').attr('lang') ?? '').slice(0, 100) },
    { id: 'h1', label: 'H1 count', value: $('h1').length },
    { id: 'canonical', label: 'Declared canonical URL (not verified)', value: ($('link[rel~="canonical"]').first().attr('href') ?? '').slice(0, 2048) },
    { id: 'viewport', label: 'Viewport metadata present', value: $('meta[name="viewport" i]').length > 0 },
    { id: 'images', label: 'Image count', value: images.length },
    { id: 'missing_alt', label: 'Images without an alt attribute', value: images.filter(el => $(el).attr('alt') === undefined).length },
    { id: 'links', label: 'Links with href attributes', value: $('a[href]').length },
    { id: 'scripts', label: 'Script element count', value: $('script').length },
    { id: 'structured_data', label: 'JSON-LD script count (not validated)', value: $('script[type="application/ld+json"]').length },
    { id: 'robots_meta', label: 'Meta robots directives', value: ($('meta[name="robots" i]').attr('content') ?? '').slice(0, 500) },
    { id: 'robots_header', label: 'X-Robots-Tag', value: String(headers['x-robots-tag'] ?? '').slice(0, 500) },
    { id: 'csp', label: 'Content-Security-Policy header present', value: Boolean(headers['content-security-policy']) },
  ]
  $('script,style,noscript,template,svg,iframe').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()
  evidence.push({ id: 'text_length', label: 'Visible HTML text characters', value: text.length })
  const limitations = ['Single fetched HTML page only; no site-wide crawl, rendered browser, performance audit, or ranking measurement.']
  if (text.length < 200) limitations.push('Little readable HTML was returned. JavaScript rendering or access restrictions may limit coverage; neither is proven.')
  const excludedFromAI = /(?:noai|noindex|nosnippet|none)/i.test(String(headers['x-robots-tag'] ?? '') + ' ' + String($('meta[name="robots" i]').attr('content') ?? ''))
  return { evidence, limitations, textExcerpt: text.slice(0, 2500), excludedFromAI }
}

/** Robots group selection and longest-match allow/disallow; no policy bypasses by domain. */
export function robotsAllows(body: string, url: URL): boolean {
  return evaluateRobotsPolicy(body, url).allowed
}

export function evaluateRobotsPolicy(body: string, url: URL): { allowed: boolean; crawlDelaySeconds: number } {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[]; delay: number }[] = []
  let group: typeof groups[number] | undefined
  let rulesStarted = false
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const match = line.match(/^([^:]+):\s*(.*)$/)
    if (!match) continue
    const key = match[1].trim().toLowerCase(), value = match[2].trim()
    if (key === 'user-agent') {
      if (!group || rulesStarted) { group = { agents: [], rules: [], delay: 0 }; groups.push(group); rulesStarted = false }
      if (value) group.agents.push(value.toLowerCase())
    } else if (group && ['allow', 'disallow'].includes(key)) {
      rulesStarted = true
      if (value) group.rules.push({ allow: key === 'allow', path: value })
    } else if (group && key === 'crawl-delay') {
      rulesStarted = true
      group.delay = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : Infinity
    }
  }
  const specificity = (agents: string[]) => Math.max(0, ...agents.filter(a => a !== '*' && 'alyoxa-websitescanner'.startsWith(a)).map(a => a.length))
  const best = Math.max(0, ...groups.map(g => specificity(g.agents)))
  const selected = best ? groups.filter(g => specificity(g.agents) === best) : groups.filter(g => g.agents.includes('*'))
  const target = url.pathname + url.search
  const matches = selected.flatMap(g => g.rules).filter(rule => {
    const pattern = rule.path.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$')
    return new RegExp('^' + pattern).test(target)
  }).sort((a, b) => b.path.replace(/[*$]/g, '').length - a.path.replace(/[*$]/g, '').length || Number(b.allow) - Number(a.allow))
  return { allowed: matches[0]?.allow ?? true, crawlDelaySeconds: Math.max(0, ...selected.map(group => group.delay)) }
}
