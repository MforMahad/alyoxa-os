/** Never show a response fetched for another workspace or history selection. */
export function auditViewScope(workspaceId: string | undefined, auditId: string | undefined) {
  return (workspaceId ?? '') + ':' + (auditId ?? 'latest')
}
export function currentAuditResponse<T>(response: T, loadedScope: string, workspaceId: string | undefined, auditId: string | undefined) {
  return loadedScope === auditViewScope(workspaceId, auditId) ? response : undefined
}
