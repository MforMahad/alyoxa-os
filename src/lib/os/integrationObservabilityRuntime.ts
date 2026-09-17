import {
  OSIntegrationModule,
  osIntegrationContractStore,
} from './integrationContracts';
import {
  OSIntegrationObservation,
  osIntegrationObservabilityStore,
} from './integrationObservability';
import { OSIntegrationResult } from './integrationRuntime';
import { OSContextHandoffResult } from './contextHandoffRuntime';
import { OSModuleHandoffResult } from './moduleHandoffRuntime';
import { OSRuntimeSafetyResult } from './runtimeSafety';
import { OSEvent } from '@/data/os/events';

export interface OSObservationRecordParams {
  id: string;
  timestamp: string;
}

export class OSIntegrationObservabilityRuntime {
  recordIntegrationResolution(
    resolution: OSIntegrationResult,
    sourceModule: OSIntegrationModule,
    sourceRecordId: string,
    params: OSObservationRecordParams
  ): OSIntegrationObservation {
    // Validate identity parity between caller arguments and resolution payload
    if (
      sourceModule !== resolution.source.module ||
      sourceRecordId !== resolution.source.recordId
    ) {
      throw new Error(
        `Observability identity mismatch: Passed (${sourceModule}/${sourceRecordId}) does not match resolution payload (${resolution.source.module}/${resolution.source.recordId}).`
      );
    }

    const isMatched = resolution.status === 'matched';
    const firstHandoff = resolution.handoffs[0];

    const contractId = firstHandoff?.contractId;
    const contract = contractId
      ? osIntegrationContractStore.getContract(contractId)
      : undefined;
    const targetModule = firstHandoff?.targetModule ?? contract?.targetModule;

    const observation: OSIntegrationObservation = {
      id: params.id,
      stage: 'INTEGRATION_RESOLUTION',
      status: isMatched ? 'completed' : 'failed',
      sourceModule: resolution.source.module,
      sourceRecordId: resolution.source.recordId,
      contractId,
      targetModule,
      timestamp: params.timestamp,
      summary: isMatched
        ? `Integration contract resolved successfully: ${contractId ?? 'unknown'}`
        : `Integration resolution failed: ${resolution.errors.join('; ') || resolution.status}`,
      metadata: { status: resolution.status, errorCount: resolution.errors.length },
    };

    osIntegrationObservabilityStore.record(observation);
    return osIntegrationObservabilityStore.get(params.id)!;
  }

  recordEventResolution(
    event: OSEvent,
    resolution: OSIntegrationResult,
    params: OSObservationRecordParams
  ): OSIntegrationObservation {
    // Validate identity parity between event arguments and resolution payload
    if (
      event.module !== resolution.source.module ||
      event.recordId !== resolution.source.recordId
    ) {
      throw new Error(
        `Observability identity mismatch: Event (${event.module}/${event.recordId}) does not match resolution payload (${resolution.source.module}/${resolution.source.recordId}).`
      );
    }

    const isMatched = resolution.status === 'matched';
    const firstHandoff = resolution.handoffs[0];

    const sourceModule = event.module as OSIntegrationModule;
    const sourceRecordId = event.recordId;

    const contractId = firstHandoff?.contractId;
    const contract = contractId
      ? osIntegrationContractStore.getContract(contractId)
      : undefined;
    const targetModule = firstHandoff?.targetModule ?? contract?.targetModule;

    const observation: OSIntegrationObservation = {
      id: params.id,
      stage: 'EVENT_RESOLUTION',
      status: isMatched ? 'completed' : 'failed',
      sourceModule,
      sourceRecordId,
      contractId,
      targetModule,
      timestamp: params.timestamp,
      summary: isMatched
        ? `Event ${event.id} resolved to ${resolution.handoffs.length} handoff(s).`
        : `Event ${event.id} resolution failed: ${resolution.errors.join('; ') || resolution.status}`,
      metadata: { eventId: event.id, handoffCount: resolution.handoffs.length },
    };

    osIntegrationObservabilityStore.record(observation);
    return osIntegrationObservabilityStore.get(params.id)!;
  }

  recordContextHandoff(
    result: OSContextHandoffResult,
    params: OSObservationRecordParams
  ): OSIntegrationObservation {
    const pkg = result.package;

    let sourceModule: OSIntegrationModule;
    let sourceRecordId: string;
    let targetModule: OSIntegrationModule | undefined;
    let contractId: string | undefined;
    let sourceIdentityFallbackUsed = false;

    if (pkg) {
      sourceModule = pkg.source.module;
      sourceRecordId = pkg.source.recordId;
      targetModule = pkg.targetModule;
      contractId = pkg.contractId;
    } else {
      sourceModule = 'SYSTEM';
      sourceRecordId = '';
      targetModule = undefined;
      contractId = undefined;
      sourceIdentityFallbackUsed = true;
    }

    const isPrepared = result.status === 'prepared';

    const observation: OSIntegrationObservation = {
      id: params.id,
      stage: 'CONTEXT_HANDOFF',
      status: isPrepared ? 'completed' : 'failed',
      sourceModule,
      sourceRecordId,
      targetModule,
      contractId,
      timestamp: params.timestamp,
      summary: isPrepared
        ? 'Context handoff package prepared successfully.'
        : `Context handoff preparation failed: ${result.errors.join('; ') || result.status}`,
      metadata: {
        referenceCount: pkg ? pkg.references.length : 0,
        sourceIdentityFallbackUsed,
      },
    };

    osIntegrationObservabilityStore.record(observation);
    return osIntegrationObservabilityStore.get(params.id)!;
  }

  recordModuleHandoff(
    result: OSModuleHandoffResult,
    params: OSObservationRecordParams
  ): OSIntegrationObservation {
    const isPreparedOrNotSupported =
      result.status === 'prepared' || result.status === 'not_supported';

    let sourceModule: OSIntegrationModule;
    let sourceRecordId: string;
    let sourceIdentityFallbackUsed = false;

    if (result.package) {
      sourceModule = result.package.source.module;
      sourceRecordId = result.package.source.recordId;
    } else {
      // System fallback with metadata flag when source package is unconstructed
      sourceModule = 'SYSTEM';
      sourceRecordId = result.sourceRecordId ?? '';
      sourceIdentityFallbackUsed = true;
    }

    const observation: OSIntegrationObservation = {
      id: params.id,
      stage: 'MODULE_HANDOFF',
      status: isPreparedOrNotSupported ? 'completed' : 'failed',
      sourceModule,
      sourceRecordId,
      targetModule: result.targetModule ?? undefined,
      contractId: result.contractId ?? undefined,
      timestamp: params.timestamp,
      summary:
        result.status === 'not_supported'
          ? `Module handoff evaluated; target adapter is not supported for target ${result.targetModule}.`
          : result.status === 'prepared'
          ? 'Module handoff prepared successfully.'
          : `Module handoff preparation failed: ${result.errors.join('; ') || result.status}`,
      metadata: {
        adapterSupported: result.status !== 'not_supported',
        sourceIdentityFallbackUsed,
      },
    };

    osIntegrationObservabilityStore.record(observation);
    return osIntegrationObservabilityStore.get(params.id)!;
  }

  recordRuntimeSafety(
    result: OSRuntimeSafetyResult,
    params: OSObservationRecordParams
  ): OSIntegrationObservation {
    const isValid = result.status === 'valid';

    let sourceModule: OSIntegrationModule;
    let sourceRecordId: string;
    let sourceIdentityFallbackUsed = false;

    if (result.handoffResult?.package) {
      sourceModule = result.handoffResult.package.source.module;
      sourceRecordId = result.handoffResult.package.source.recordId;
    } else {
      // System fallback with metadata flag when handoff result package is missing
      sourceModule = 'SYSTEM';
      sourceRecordId = result.sourceRecordId ?? '';
      sourceIdentityFallbackUsed = true;
    }

    const observation: OSIntegrationObservation = {
      id: params.id,
      stage: 'RUNTIME_SAFETY',
      status: isValid ? 'completed' : 'failed',
      sourceModule,
      sourceRecordId,
      targetModule: result.targetModule ?? undefined,
      contractId: result.contractId ?? undefined,
      timestamp: params.timestamp,
      summary: isValid
        ? 'Runtime safety validation passed.'
        : result.errors.length > 0
        ? result.errors.join('; ')
        : 'Invalid runtime safety result.',
      metadata: {
        ...result.metadata,
        sourceIdentityFallbackUsed,
      },
    };

    osIntegrationObservabilityStore.record(observation);
    return osIntegrationObservabilityStore.get(params.id)!;
  }
}

export const osIntegrationObservabilityRuntime =
  new OSIntegrationObservabilityRuntime();