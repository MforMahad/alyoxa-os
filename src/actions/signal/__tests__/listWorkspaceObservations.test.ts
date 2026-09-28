import { jest } from '@jest/globals'
import type { PersistedSignalObservation } from '@/data/os/signal'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { createClient } from '@/lib/supabase/server'
import { listWorkspaceObservations } from '../listWorkspaceObservations'

jest.mock('@/actions/workspaces/getActiveWorkspace', () => ({
  getActiveWorkspace: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const activeWorkspaceId = 'workspace-a'
const activeWorkspaceResult = {
  success: true as const,
  data: {
    id: activeWorkspaceId,
    public_id: 'workspace-public-a',
    name: 'Workspace A',
    slug: 'workspace-a',
    website_url: null,
    status: 'active',
    role: 'owner' as const,
    membershipStatus: 'active' as const,
  },
}

const getActiveWorkspaceMock = jest.mocked(getActiveWorkspace)
const createClientMock = jest.mocked(createClient)

interface MockObservation extends PersistedSignalObservation {
  source: { workspace_id: string }
}

function makeObservation(
  id: string,
  workspaceId: string,
  observedAt: string
): MockObservation {
  return {
    id,
    public_id: `obs_${id}`,
    source_id: `source_${workspaceId}`,
    website_scan_id: `scan_${id}`,
    source_event_id: `website_scan:scan_${id}`,
    severity: 'low',
    category: 'website_content',
    title: `Page ${id}`,
    description: `Description ${id}`,
    metadata: { headings: [`Heading ${id}`] },
    observed_at: observedAt,
    created_at: observedAt,
    source: { workspace_id: workspaceId },
  }
}

function mockSupabase(rows: MockObservation[]) {
  let matchingRows = [...rows]
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn((field: string, value: string) => {
      if (field === 'source.workspace_id') {
        matchingRows = matchingRows.filter(
          (row) => row.source.workspace_id === value
        )
      }
      return query
    }),
    order: jest.fn(async (_field: string, options: { ascending: boolean }) => {
      matchingRows.sort((left, right) => {
        const order = left.observed_at.localeCompare(right.observed_at)
        return options.ascending ? order : -order
      })
      return { data: matchingRows, error: null }
    }),
  }

  return {
    client: { from: jest.fn(() => query) },
    query,
  }
}

describe('listWorkspaceObservations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getActiveWorkspaceMock.mockResolvedValue(activeWorkspaceResult)
  })

  it('fails closed without a valid active workspace', async () => {
    getActiveWorkspaceMock.mockResolvedValue({
      success: false as const,
      error: 'No active workspace found.',
    })

    const result = await listWorkspaceObservations()

    expect(result).toEqual({
      success: false,
      error: 'No active workspace found.',
    })
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('filters through source workspace and returns only that workspace DTOs', async () => {
    const newest = makeObservation('newest', activeWorkspaceId, '2026-09-28T12:00:00Z')
    const otherWorkspace = makeObservation('other', 'workspace-b', '2026-09-28T13:00:00Z')
    const oldest = makeObservation('oldest', activeWorkspaceId, '2026-09-28T11:00:00Z')
    const { client, query } = mockSupabase([oldest, otherWorkspace, newest])
    createClientMock.mockResolvedValue(client as never)

    const result = await listWorkspaceObservations()

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.map((row) => row.public_id)).toEqual([
      'obs_newest',
      'obs_oldest',
    ])
    expect(result.data[0]).toEqual({
      id: 'newest',
      public_id: 'obs_newest',
      source_id: 'source_workspace-a',
      website_scan_id: 'scan_newest',
      source_event_id: 'website_scan:scan_newest',
      severity: 'low',
      category: 'website_content',
      title: 'Page newest',
      description: 'Description newest',
      metadata: { headings: ['Heading newest'] },
      observed_at: '2026-09-28T12:00:00Z',
      created_at: '2026-09-28T12:00:00Z',
    })
    expect(query.eq).toHaveBeenCalledWith('source.workspace_id', activeWorkspaceId)
    expect(query.order).toHaveBeenCalledWith('observed_at', { ascending: false })
  })
})