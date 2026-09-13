import {
    OSIntegrationObservabilityRuntime,
    osIntegrationObservabilityRuntime,
    OSObservationRecordParams,
  } from './integrationObservabilityRuntime';
  import { OSIntegrationObservation } from './integrationObservability';
  import { OSIntegrationResult } from './integrationRuntime';
  import { OSContextHandoffResult } from './contextHandoffRuntime';
  import { OSModuleHandoffResult } from './moduleHandoffRuntime';
  import { OSRuntimeSafetyResult } from './runtimeSafety';
  import { OSEvent } from '@/data/os/events';
  
  export class OSObservabilityPipelineAdapter {
    constructor(
      private readonly runtime: OSIntegrationObservabilityRuntime = osIntegrationObservabilityRuntime
    ) {}
  
    observeIntegrationResolution(
      result: OSIntegrationResult,
      params: OSObservationRecordParams
    ): { result: OSIntegrationResult; observation: OSIntegrationObservation | null } {
      let observation: OSIntegrationObservation | null = null;
      try {
        observation = this.runtime.recordIntegrationResolution(
          result,
          result.source.module,
          result.source.recordId,
          params
        );
      } catch {
        // Non-blocking isolation: recording failure does not alter or mutate the runtime result
      }
      return { result, observation };
    }
  
    observeEventResolution(
      event: OSEvent,
      result: OSIntegrationResult,
      params: OSObservationRecordParams
    ): { result: OSIntegrationResult; observation: OSIntegrationObservation | null } {
      let observation: OSIntegrationObservation | null = null;
      try {
        observation = this.runtime.recordEventResolution(event, result, params);
      } catch {
        // Non-blocking isolation
      }
      return { result, observation };
    }
  
    observeContextHandoff(
      result: OSContextHandoffResult,
      params: OSObservationRecordParams
    ): { result: OSContextHandoffResult; observation: OSIntegrationObservation | null } {
      let observation: OSIntegrationObservation | null = null;
      try {
        observation = this.runtime.recordContextHandoff(result, params);
      } catch {
        // Non-blocking isolation
      }
      return { result, observation };
    }
  
    observeModuleHandoff(
      result: OSModuleHandoffResult,
      params: OSObservationRecordParams
    ): { result: OSModuleHandoffResult; observation: OSIntegrationObservation | null } {
      let observation: OSIntegrationObservation | null = null;
      try {
        observation = this.runtime.recordModuleHandoff(result, params);
      } catch {
        // Non-blocking isolation
      }
      return { result, observation };
    }
  
    observeRuntimeSafety(
      result: OSRuntimeSafetyResult,
      params: OSObservationRecordParams
    ): { result: OSRuntimeSafetyResult; observation: OSIntegrationObservation | null } {
      let observation: OSIntegrationObservation | null = null;
      try {
        observation = this.runtime.recordRuntimeSafety(result, params);
      } catch {
        // Non-blocking isolation
      }
      return { result, observation };
    }
  }
  
  export const osObservabilityPipelineAdapter = new OSObservabilityPipelineAdapter();