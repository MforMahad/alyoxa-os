jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/serviceRole', () => ({ createServiceRoleClient: jest.fn() }))
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'
import { createAuditRepository } from '../repository'

it('logs a durable summary retry without returning raw database diagnostics', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const abortSignal = jest.fn().mockResolvedValue({ data: { status: 'finalization_retry', audit_id: 'audit', code: '42501' }, error: null })
  const rpc = jest.fn().mockReturnValue({ abortSignal })
  jest.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never)
  try {
    expect(await createAuditRepository().finalize()).toEqual({ status: 'finalization_retry', audit_id: 'audit', code: '42501' })
    expect(rpc).toHaveBeenCalledWith('finalize_website_audit', {})
    expect(log).toHaveBeenCalledWith('[WebsiteAudit] Summary persistence deferred.', {
      operation: 'finalize_website_audit', auditId: 'audit', code: '42501',
    })
  } finally { log.mockRestore() }
})
