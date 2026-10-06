import { jest } from '@jest/globals'
import { connectWebsiteSource } from '../connectWebsiteSource'
import { getLatestWebsiteScanStatus } from '../getLatestWebsiteScanStatus'
import { getWebsiteScanStatus } from '../getWebsiteScanStatus'
import { createClient } from '@/lib/supabase/server'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/actions/workspaces/getActiveWorkspace', () => ({
  getActiveWorkspace: jest.fn(),
}))

const createClientMock = jest.mocked(createClient)
const getActiveWorkspaceMock = jest.mocked(getActiveWorkspace)

const workspaceId = '096e91a7-6d5a-4fe4-a4c9-beb01e8452ef'
const websiteId = '3cbe9a10-5035-4498-845e-029d5a08b742'
const scanId = '629126b4-1bc9-4d5f-a100-d170fe534c5b'

const activeWorkspace = {
  success: true as const,
  data: {
    id: workspaceId,
    public_id: 'workspace-public',
    name: 'Test workspace',
    slug: 'test-workspace',
    website_url: 'https://example.com/',
    status: 'active',
    role: 'owner' as const,
    membershipStatus: 'active' as const,
  },
}

interface MockClientOptions {
  website?: Record<string, unknown> | null
  workspaceWebsiteUrl?: string
  activeScan?: Record<string, unknown> | null
  exactScan?: Record<string, unknown> | null
  source?: Record<string, unknown> | null
  rpcData?: unknown
}

function createMockClient(options: MockClientOptions = {}) {
  const queryCalls: Array<{
    table: string
    filters: Record<string, unknown>
    inValues: Record<string, unknown>
  }> = []

  const client = {
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })),
    },

    from: jest.fn((table: string) => {
      const filters: Record<string, unknown> = {}
      const inValues: Record<string, unknown> = {}
      const state = { table, filters, inValues }

      queryCalls.push(state)

      const query: Record<string, (...args: never[]) => unknown> = {}

      query.select = jest.fn(() => query)

      query.eq = jest.fn((column: string, value: unknown) => {
        filters[column] = value
        return query
      })

      query.in = jest.fn((column: string, values: unknown) => {
        inValues[column] = values
        return query
      })

      query.order = jest.fn(() => query)
      query.limit = jest.fn(() => query)

      const resolveRow = () => {
        if (table === 'users') {
          return { id: 'app-user-id' }
        }

        if (table === 'workspaces') {
          return {
            website_url:
              options.workspaceWebsiteUrl ?? 'https://example.com/',
          }
        }

        if (table === 'websites') {
          return (
            options.website ?? {
              id: websiteId,
              public_id: 'website-public',
              workspace_id: workspaceId,
              normalized_domain:
                typeof filters.normalized_domain === 'string'
                  ? filters.normalized_domain
                  : 'example.com',
            }
          )
        }

        if (table === 'signal_feed_sources') {
          return (
            options.source ?? {
              id: 'source-id',
              public_id: 'source-public',
            }
          )
        }

        if (table === 'website_scans') {
          return filters.id
            ? options.exactScan ?? null
            : options.activeScan ?? null
        }

        return null
      }

      query.single = jest.fn(async () => ({
        data: resolveRow(),
        error: null,
      }))

      query.maybeSingle = jest.fn(async () => ({
        data: resolveRow(),
        error: null,
      }))

      return query
    }),

    rpc: jest.fn(async () => ({
      data: options.rpcData ?? null,
      error: null,
    })),
  }

  return { client, queryCalls }
}

describe('website scan lifecycle actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getActiveWorkspaceMock.mockResolvedValue(activeWorkspace)
  })

  it('reuses an existing queued/processing scan instead of calling the create RPC', async () => {
    const activeScan = {
      id: scanId,
      public_id: 'scan-public',
      status: 'processing',
    }

    const { client, queryCalls } = createMockClient({ activeScan })
    createClientMock.mockResolvedValue(client as never)

    const result = await connectWebsiteSource({ workspaceId })

    expect(result).toMatchObject({
      success: true,
      data: {
        website: { id: websiteId },
        scan: {
          id: scanId,
          status: 'processing',
          reused: true,
        },
      },
    })

    expect(client.rpc).not.toHaveBeenCalled()

    const scanQuery = queryCalls.find(
      (call) => call.table === 'website_scans'
    )

    expect(scanQuery?.inValues.status).toEqual([
      'queued',
      'processing',
    ])

    expect(scanQuery?.filters.website_id).toBe(websiteId)
  })

  it('does not reuse failed scans and allows the existing RPC to create a retry', async () => {
    const rpcData = [
      {
        source_id: 'source-id',
        source_public_id: 'source-public',
        website_id: websiteId,
        website_public_id: 'website-public',
        scan_id: 'new-retry-scan',
        scan_public_id: 'new-retry-public',
        scan_status: 'queued',
      },
    ]

    const { client, queryCalls } = createMockClient({
      activeScan: null,
      rpcData,
    })

    createClientMock.mockResolvedValue(client as never)

    const result = await connectWebsiteSource({ workspaceId })

    expect(result).toMatchObject({
      success: true,
      data: {
        scan: {
          id: 'new-retry-scan',
          status: 'queued',
        },
      },
    })

    expect(client.rpc).toHaveBeenCalledWith(
      'connect_website_signal_source',
      {
        p_workspace_id: workspaceId,
      }
    )

    expect(
      queryCalls.find((call) => call.table === 'website_scans')
        ?.inValues.status
    ).toEqual(['queued', 'processing'])
  })

  it('restores an active scan before considering newer terminal history', async () => {
    const activeScan = {
      id: scanId,
      status: 'queued',
      created_at: '2026-09-28T10:00:00Z',
      started_at: null,
      completed_at: null,
      error_message: null,
    }

    const { client, queryCalls } = createMockClient({ activeScan })
    createClientMock.mockResolvedValue(client as never)

    const result = await getLatestWebsiteScanStatus()

    expect(result).toEqual({
      success: true,
      data: {
        ...activeScan,
        website_domain: 'example.com',
      },
    })

    expect(
      queryCalls.filter((call) => call.table === 'website_scans')
    ).toHaveLength(1)

    expect(queryCalls[0].filters.workspace_id).toBe(workspaceId)
  })

  it('reads one exact scan only through the active workspace website', async () => {
    const exactScan = {
      id: scanId,
      website_id: websiteId,
      status: 'completed',
      created_at: '2026-09-28T10:00:00Z',
      started_at: '2026-09-28T09:59:00Z',
      completed_at: '2026-09-28T10:00:00Z',
      error_message: null,
    }

    const { client, queryCalls } = createMockClient({ exactScan })
    createClientMock.mockResolvedValue(client as never)

    const result = await getWebsiteScanStatus(scanId)

    expect(result).toEqual({
      success: true,
      data: {
        id: scanId,
        status: 'completed',
        created_at: '2026-09-28T10:00:00Z',
        started_at: '2026-09-28T09:59:00Z',
        completed_at: '2026-09-28T10:00:00Z',
        error_message: null,
        website_domain: 'example.com',
      },
    })

    const websiteQuery = queryCalls.find(
      (call) =>
        call.table === 'websites' &&
        call.filters.id === websiteId
    )

    expect(websiteQuery?.filters.workspace_id).toBe(workspaceId)

    const scanQuery = queryCalls.find(
      (call) => call.table === 'website_scans'
    )

    expect(scanQuery?.filters.id).toBe(scanId)
  })

  it('resolves status for a requested domain only inside the active workspace', async () => {
    const activeScan = {
      id: scanId,
      status: 'processing',
      created_at: '2026-09-28T10:00:00Z',
      started_at: '2026-09-28T09:59:00Z',
      completed_at: null,
      error_message: null,
    }

    const { client, queryCalls } = createMockClient({ activeScan })
    createClientMock.mockResolvedValue(client as never)

    const result = await getLatestWebsiteScanStatus('maadyz.com')

    expect(result).toEqual({
      success: true,
      data: {
        ...activeScan,
        website_domain: 'maadyz.com',
      },
    })

    const websiteQuery = queryCalls.find(
      (call) => call.table === 'websites'
    )

    expect(websiteQuery?.filters.workspace_id).toBe(workspaceId)
    expect(websiteQuery?.filters.normalized_domain).toBe('maadyz.com')
  })

  it('fails exact scan reads closed when active workspace resolution fails', async () => {
    getActiveWorkspaceMock.mockResolvedValue({
      success: false,
      error: 'Authentication required. Please sign in.',
    })

    const { client } = createMockClient()
    createClientMock.mockResolvedValue(client as never)

    const result = await getWebsiteScanStatus(scanId)

    expect(result).toEqual({
      success: false,
      error: 'Authentication required. Please sign in.',
    })

    expect(createClientMock).not.toHaveBeenCalled()
  })
})