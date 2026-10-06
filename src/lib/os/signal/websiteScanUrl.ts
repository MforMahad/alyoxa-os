export interface CanonicalWebsiteUrl {
  url: URL
  canonicalUrl: string
  normalizedDomain: string
}

const RESERVED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.test',
  '.invalid',
  '.example',
]
const MAX_WEBSITE_DOMAIN_LENGTH = 92

export function canonicalizeWebsiteUrl(value: string): CanonicalWebsiteUrl {
  const input = value.trim()
  if (!input || input.length > 2048) {
    throw new Error('Website URL is invalid.')
  }

  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('Website URL is invalid.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Website URL must use HTTP or HTTPS.')
  }

  const authority = input.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i)?.[1]
  if (
    !authority ||
    authority.includes('@') ||
    url.username ||
    url.password
  ) {
    throw new Error('Website URLs containing credentials are not allowed.')
  }

  const expectedPort = url.protocol === 'https:' ? '443' : '80'
  if (url.port && url.port !== expectedPort) {
    throw new Error('Website URL uses a disallowed port.')
  }

  let normalizedDomain = url.hostname.toLowerCase()
  if (
    normalizedDomain.startsWith('[') ||
    /^\d+(?:\.\d+){0,3}$/.test(normalizedDomain)
  ) {
    throw new Error('Website IP literals are not supported.')
  }

  if (normalizedDomain.endsWith('.')) normalizedDomain = normalizedDomain.slice(0, -1)
  if (
    normalizedDomain.endsWith('.') ||
    normalizedDomain.length > MAX_WEBSITE_DOMAIN_LENGTH
  ) {
    throw new Error('Website hostname is invalid.')
  }

  const labels = normalizedDomain.split('.')
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length < 1 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    ) ||
    !/[a-z]/.test(labels[labels.length - 1])
  ) {
    throw new Error('Website hostname is invalid.')
  }

  if (
    normalizedDomain === 'localhost' ||
    RESERVED_HOST_SUFFIXES.some((suffix) => normalizedDomain.endsWith(suffix))
  ) {
    throw new Error('Local and reserved website destinations are not allowed.')
  }

  url.hostname = normalizedDomain
  url.hash = ''
  const canonicalUrl = url.toString()
  if (canonicalUrl.length > 2048) {
    throw new Error('Website URL is too long.')
  }

  return { url, canonicalUrl, normalizedDomain }
}