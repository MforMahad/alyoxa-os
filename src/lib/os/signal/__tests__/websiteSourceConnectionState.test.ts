import {
  getWebsiteSourceConnectionKey,
  getWebsiteSourceConnectionState,
  recordWebsiteSourceConnectionResult,
  setWebsiteSourceConnectionPending,
} from '../websiteSourceConnectionState'

describe('website source connection state', () => {
  const workspaceId = 'workspace-a'
  const domain = 'alyoxa.com'
  const connectionKey = getWebsiteSourceConnectionKey(workspaceId, domain)

  it('marks a domain connected only after a successful connection result', () => {
    const connections = recordWebsiteSourceConnectionResult(
      {},
      connectionKey,
      { success: true }
    )

    expect(
      getWebsiteSourceConnectionState(connections, connectionKey).status
    ).toBe('connected')
  })

  it('keeps a failed connection unconnected and preserves its error', () => {
    const error = 'Website source could not be connected.'
    const connections = recordWebsiteSourceConnectionResult(
      {},
      connectionKey,
      { success: false, error }
    )

    expect(
      getWebsiteSourceConnectionState(connections, connectionKey)
    ).toEqual({ status: 'not_connected', error })
  })

  it('does not treat a saved URL as a successful source connection', () => {
    const savedUrl = 'https://alyoxa.com/'
    const state = getWebsiteSourceConnectionState({}, connectionKey)

    expect(savedUrl).toBeTruthy()
    expect(state.status).toBe('not_connected')
  })

  it('does not infer connection success from a completed scan', () => {
    const completedScan = { status: 'completed' }
    const state = getWebsiteSourceConnectionState({}, connectionKey)

    expect(completedScan.status).toBe('completed')
    expect(state.status).toBe('not_connected')
  })

  it('preserves connection state independently across workspace domains', () => {
    const otherKey = getWebsiteSourceConnectionKey(
      workspaceId,
      'other.example'
    )
    const connections = recordWebsiteSourceConnectionResult(
      {},
      connectionKey,
      { success: true }
    )
    const pendingConnections = setWebsiteSourceConnectionPending(
      connections,
      otherKey
    )

    expect(
      getWebsiteSourceConnectionState(pendingConnections, connectionKey).status
    ).toBe('connected')
    expect(
      getWebsiteSourceConnectionState(pendingConnections, otherKey).status
    ).toBe('not_connected')
  })
})