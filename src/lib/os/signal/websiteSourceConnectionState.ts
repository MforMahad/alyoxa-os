export interface WebsiteSourceConnectionState {
  status: 'connected' | 'not_connected'
  error: string | null
}

export type WebsiteSourceConnectionsByKey = Record<
  string,
  WebsiteSourceConnectionState
>

export type WebsiteSourceConnectionResult =
  | { success: true }
  | { success: false; error: string }

export function getWebsiteSourceConnectionKey(
  workspaceId: string | undefined,
  websiteDomain: string | null
): string | null {
  return workspaceId && websiteDomain
    ? `${workspaceId}:${websiteDomain}`
    : null
}

export function getWebsiteSourceConnectionState(
  connections: WebsiteSourceConnectionsByKey,
  connectionKey: string | null
): WebsiteSourceConnectionState {
  return connectionKey
    ? connections[connectionKey] ?? { status: 'not_connected', error: null }
    : { status: 'not_connected', error: null }
}

export function setWebsiteSourceConnectionPending(
  connections: WebsiteSourceConnectionsByKey,
  connectionKey: string | null
): WebsiteSourceConnectionsByKey {
  if (!connectionKey) return connections

  return {
    ...connections,
    [connectionKey]: { status: 'not_connected', error: null },
  }
}

export function recordWebsiteSourceConnectionResult(
  connections: WebsiteSourceConnectionsByKey,
  connectionKey: string | null,
  result: WebsiteSourceConnectionResult
): WebsiteSourceConnectionsByKey {
  if (!connectionKey) return connections

  return {
    ...connections,
    [connectionKey]: result.success
      ? { status: 'connected', error: null }
      : { status: 'not_connected', error: result.error },
  }
}