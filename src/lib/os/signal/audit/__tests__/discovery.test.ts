import { auditUrl, discoverAuditLinks } from '../discovery'

const origin = 'https://audit-fixture.example.org'
it('normalizes identity, preserves query distinctions and rejects other origins', () => {
  expect(auditUrl('/Page?q=1#x', origin)).toBe(origin + '/Page?q=1')
  expect(auditUrl('/Page?q=2', origin)).not.toBe(auditUrl('/Page?q=1', origin))
  expect(() => auditUrl('https://outside.example.org/', origin)).toThrow()
  expect(() => auditUrl('http://audit-fixture.example.org/', origin)).toThrow()
  expect(() => auditUrl('http://127.0.0.1/', origin)).toThrow()
  expect(() => auditUrl('javascript:alert(1)', origin)).toThrow()
})
it('prioritizes navigation, deduplicates fragments and never discovers forms/assets', () => {
  const found = discoverAuditLinks('<a href="/a#x">a</a><nav><a href="/a">a</a><a href="/b">b</a></nav><form action="/submit"></form><img src="/asset"><a href="mailto:x@y.org">email</a><a download href="/download">download</a>', origin + '/', origin)
  expect(found.links).toEqual([{ url: origin + '/a', priority: 10 }, { url: origin + '/b', priority: 10 }])
  expect(found.excluded).toBe(2)
})
it('does not invent same-origin URLs by ignoring an external HTML base', () => {
  const result = discoverAuditLinks(`<base href="https://outside.example.org/"><a href="/not-in-scope">outside</a><a href="${origin}/explicit">explicit</a>`, origin + '/', origin)
  expect(result.links).toEqual([{ url: origin + '/explicit', priority: 50 }])
  expect(result.excluded).toBe(1)
})
it('bounds both discovery count and serialized URL bytes', () => {
  const found = discoverAuditLinks(Array.from({ length: 300 }, (_, i) => `<a href="/${i}?q=${'x'.repeat(1500)}">page</a>`).join(''), origin + '/', origin)
  expect(found.truncated).toBe(true)
  expect(found.links.length).toBeLessThanOrEqual(100)
  expect(Buffer.byteLength(JSON.stringify(found.links))).toBeLessThan(35000)
})
