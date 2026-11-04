import { retryAfterDeadline } from '../backoff'
const now = Date.parse('2026-10-30T00:00:00Z')
it('retains a two-hour deadline rather than clamping to a page retry interval', () => {
  expect(retryAfterDeadline('7200', now)).toEqual({ not_before: '2026-10-30T02:00:00.000Z' })
})
it('supports HTTP dates, ignores expired/invalid values and fails closed on overflow', () => {
  expect(retryAfterDeadline('Fri, 30 Oct 2026 03:00:00 GMT', now)).toEqual({ not_before: '2026-10-30T03:00:00.000Z' })
  expect(retryAfterDeadline('garbage', now)).toEqual({})
  expect(retryAfterDeadline('0', now)).toEqual({})
  expect(retryAfterDeadline('9'.repeat(400), now)).toEqual({ host_blocked: true })
})
