import type { NodeChannel, SystemEvent } from '@/data/os/overview'
import type { PersistedSignalObservation } from '@/data/os/signal'

export interface OverviewLiveState {
  snapshot: {
    signal: string
    ai: string
    forge: string
    pulse: string
    vault: string
  }
  channels: NodeChannel[]
  events: SystemEvent[]
}

export function buildOverviewLiveState(
  observations: PersistedSignalObservation[]
): OverviewLiveState {
  const hasLiveSignals = observations.length > 0
  const latest = observations[0]

  return {
    snapshot: {
      signal: hasLiveSignals ? 'OBSERVED' : 'NO LIVE SIGNALS',
      ai: 'NO DECISIONS YET',
      forge: 'NO EXECUTIONS YET',
      pulse: 'WAITING',
      vault: 'NO MEMORY ACTIVITY YET',
    },
    channels: [
      {
        id: 'signal',
        code: 'IN.01',
        name: 'SIGNAL',
        state: hasLiveSignals ? 'OBSERVED' : 'WAITING',
        metric: hasLiveSignals
          ? `${observations.length} persisted observation${observations.length === 1 ? '' : 's'}`
          : 'NO LIVE SIGNALS',
        subtext: hasLiveSignals
          ? latest.title || latest.description
          : 'No persisted website observations yet.',
        status: hasLiveSignals ? 'STATUS: OBSERVED' : 'STATUS: WAITING',
        accentClass: 'text-[var(--signal)]',
      },
      {
        id: 'ai-core',
        code: 'SYS.00',
        name: 'AI CORE',
        state: 'WAITING',
        metric: 'NO DECISIONS YET',
        subtext: 'No AI reasoning has been generated for this workspace.',
        status: 'STATUS: WAITING',
        accentClass: 'text-[var(--foreground)]',
      },
      {
        id: 'forge-pulse',
        code: 'EX.02',
        name: 'FORGE & PULSE',
        state: 'WAITING',
        metric: 'NO EXECUTIONS YET',
        subtext: 'No execution or collaboration activity has been recorded.',
        status: 'STATUS: WAITING',
        accentClass: 'text-[var(--primary)]',
      },
      {
        id: 'vault',
        code: 'MEM.04',
        name: 'VAULT',
        state: 'WAITING',
        metric: 'NO MEMORY ACTIVITY YET',
        subtext: 'No workspace memory records have been stored.',
        status: 'STATUS: WAITING',
        accentClass: 'text-[var(--primary-soft)]',
      },
    ],
    events: hasLiveSignals
      ? observations.slice(0, 8).map((observation) => ({
          id: observation.public_id,
          timestamp: observation.observed_at,
          source: '[SIGNAL]',
          badgeClass:
            'bg-[var(--signal)]/10 text-[var(--signal)] border-[var(--signal)]/30',
          message: observation.description,
          status: 'OBSERVED',
        }))
      : [],
  }
}
