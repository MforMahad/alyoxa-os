import { OSIntegrationModule } from './integrationContracts';

export interface OSScenarioRecordReference {
  readonly id: string;
  readonly fromModule: OSIntegrationModule;
  readonly toModule: OSIntegrationModule;
  readonly sourceRecordId: string;
  readonly targetRecordId: string;
}

export interface OSScenarioDefinition {
  readonly name: string;
  readonly description: string;
  readonly pipeline: readonly OSIntegrationModule[];
  readonly records: {
    readonly signal: { readonly id: string; readonly module: 'SIGNAL'; readonly recordId: string };
    readonly ai: { readonly id: string; readonly module: 'AI'; readonly recordId: string };
    readonly forge: { readonly id: string; readonly module: 'FORGE'; readonly recordId: string };
    readonly pulse: { readonly id: string; readonly module: 'PULSE'; readonly recordId: string };
  };
  readonly references: readonly OSScenarioRecordReference[];
  readonly contracts: readonly string[];
  readonly executionSemantics: {
    readonly mode: 'PREPARED_VALIDATED_OBSERVED';
    readonly executed: boolean;
    readonly completed: boolean;
  };
}

export class OSScenarioManager {
  getCanonicalScenario(): OSScenarioDefinition {
    return {
      name: 'CANONICAL_OS_LOOP_13_7_1',
      description: 'Deterministic end-to-end ALYOXA OS loop definition (SIGNAL → AI → FORGE → PULSE)',
      pipeline: ['SIGNAL', 'AI', 'FORGE', 'PULSE'] as const,
      records: {
        signal: { id: 'OBS-001', module: 'SIGNAL', recordId: 'OBS-001' },
        ai: { id: 'DEC-001', module: 'AI', recordId: 'DEC-001' },
        forge: { id: 'TASK-001', module: 'FORGE', recordId: 'TASK-001' },
        pulse: { id: 'REQ-001', module: 'PULSE', recordId: 'REQ-001' },
      },
      references: [
        {
          id: 'REF-001',
          fromModule: 'SIGNAL',
          toModule: 'AI',
          sourceRecordId: 'OBS-001',
          targetRecordId: 'DEC-001',
        },
        {
          id: 'REF-002',
          fromModule: 'AI',
          toModule: 'FORGE',
          sourceRecordId: 'DEC-001',
          targetRecordId: 'TASK-001',
        },
        {
          id: 'REF-003',
          fromModule: 'FORGE',
          toModule: 'PULSE',
          sourceRecordId: 'TASK-001',
          targetRecordId: 'REQ-001',
        },
      ] as const,
      contracts: ['CONTRACT-001', 'CONTRACT-002', 'CONTRACT-003'] as const,
      executionSemantics: {
        mode: 'PREPARED_VALIDATED_OBSERVED',
        executed: false,
        completed: false,
      },
    };
  }
}

export const osScenarioManager = new OSScenarioManager();