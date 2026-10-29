import { retainedScanStatus } from '../retainedScanStatus'

function client(data: unknown, error: unknown = null) {
  const query = { select: jest.fn(() => query), eq: jest.fn(() => query), limit: jest.fn(() => query), maybeSingle: jest.fn().mockResolvedValue({ data, error }) }
  return { from: jest.fn(() => query) }
}
const scan = { id: 'scan', status: 'completed', error_message: null }
it('flags completed historical scans with no retained observations without mutating them', async () => {
  expect(await retainedScanStatus(client(null) as never, scan)).toMatchObject({ status: 'unverified', error_message: expect.stringContaining('no retained observation') })
})
it('does not assert evidence is absent when reading it failed', async () => {
  expect(await retainedScanStatus(client(null, { code: '42501' }) as never, scan)).toMatchObject({ status: 'unverified', error_message: expect.stringContaining('could not be verified') })
})
it('preserves completed when an observation is retained', async () => {
  expect(await retainedScanStatus(client({ id: 'observation' }) as never, scan)).toEqual({ status: 'completed', error_message: null })
})
