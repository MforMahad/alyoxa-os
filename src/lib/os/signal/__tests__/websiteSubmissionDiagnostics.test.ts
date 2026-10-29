import { logWebsiteSubmissionFailure } from '../websiteSubmissionDiagnostics'

it('redacts credentials echoed inside diagnostics and ignores unrelated error properties', () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    logWebsiteSubmissionFailure({ operation: 'submit_website_analysis', requestId: 'reference', workspaceId: 'workspace' }, {
      code: 'P0001',
      message: 'Failed URL https://public.example.org/?access_token=url-secret',
      details: 'Bearer header-secret\naccess_token=access-secret\nrefresh_token=refresh-secret\nCookie: session=cookie-secret\nAuthorization: header-value\napi_key=api-secret',
      hint: 'Key sk-test-secret and sb_secret_service-secret JWT eyJtest.test.signature',
      headers: { authorization: 'extra-secret' }, cookies: 'more-secret', access_token: 'object-secret',
    })
    const output = JSON.stringify(log.mock.calls)
    for (const secret of ['url-secret', 'header-secret', 'access-secret', 'refresh-secret', 'cookie-secret', 'header-value', 'api-secret', 'sk-test-secret', 'sb_secret_service-secret', 'eyJtest.test.signature', 'extra-secret', 'more-secret', 'object-secret']) expect(output).not.toContain(secret)
    expect(log.mock.calls[0][1]).toMatchObject({ code: 'P0001', message: 'Failed URL [REDACTED_URL]' })
  } finally { log.mockRestore() }
})
