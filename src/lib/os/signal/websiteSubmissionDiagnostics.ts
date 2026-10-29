function diagnosticText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  // Database messages may echo input. Keep SQL diagnostics but exclude URLs and credentials.
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[REDACTED_URL]')
    .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:authorization|cookie|set-cookie|access_token|refresh_token|api[_-]?key)\s*[:=]\s*[^\r\n]+/gi, '[REDACTED_CREDENTIAL]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/\b(?:sk-|sb_secret_|sb_publishable_)[A-Za-z0-9_-]+/g, '[REDACTED_KEY]')
    .slice(0, 4000)
}

/** Whitelist diagnostics; never serialize the client, request, user object, headers or cookies. */
export function logWebsiteSubmissionFailure(
  context: { operation: string; requestId: string; workspaceId: string; authenticatedUserId?: string },
  error: unknown,
) {
  const failure = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  console.error('[WebsiteSubmission] Submission failed.', {
    ...context,
    code: diagnosticText(failure.code),
    message: diagnosticText(failure.message) ?? 'Unexpected submission failure.',
    details: diagnosticText(failure.details),
    hint: diagnosticText(failure.hint),
  })
}
