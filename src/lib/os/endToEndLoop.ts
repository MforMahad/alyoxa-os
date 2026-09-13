import { osScenarioManager, OSScenarioManager } from "./scenarioDefinition";
import {
  osIntegrationRuntime,
  OSIntegrationResult,
} from "./integrationRuntime";
import {
  osContextHandoffRuntime,
  OSContextHandoffResult,
} from "./contextHandoffRuntime";
import {
  osModuleHandoffRuntime,
  OSModuleHandoffResult,
} from "./moduleHandoffRuntime";
import {
  osRuntimeSafetyValidator,
  OSRuntimeSafetyResult,
} from "./runtimeSafety";
import { osObservabilityPipelineAdapter } from "./observabilityPipelineAdapter";
import { osEventsRegistry, OSEvent } from "@/data/os/events";
import { OSIntegrationObservation } from "./integrationObservability";

export type OSEndToEndLoopStatus =
  | "FAILED"
  | "RESOLVED"
  | "CONTEXT_HANDOFF_PREPARED"
  | "MODULE_HANDOFF_PREPARED"
  | "RUNTIME_SAFETY_VALIDATED"
  | "OBSERVED";

export interface OSEndToEndLoopResult {
  readonly status: OSEndToEndLoopStatus;
  readonly scenarioName: string;
  readonly eventId: string;
  readonly sourceRecordId: string;
  readonly stages: {
    readonly eventResolution?: OSIntegrationResult;
    readonly contextHandoff?: OSContextHandoffResult;
    readonly moduleHandoff?: OSModuleHandoffResult;
    readonly runtimeSafety?: OSRuntimeSafetyResult;
    readonly observability?: readonly OSIntegrationObservation[];
  };
  readonly executed: false;
  readonly completed: false;
  readonly errors: readonly string[];
}

export class OSEndToEndLoopExecutor {
  private invocationSeq = 0;

  constructor(
    private readonly scenarioManager: OSScenarioManager = osScenarioManager,
    private readonly integrationRuntime = osIntegrationRuntime,
    private readonly contextHandoffRuntime = osContextHandoffRuntime,
    private readonly moduleHandoffRuntime = osModuleHandoffRuntime,
    private readonly runtimeSafety = osRuntimeSafetyValidator,
    private readonly observabilityAdapter = osObservabilityPipelineAdapter,
  ) {}

  executeCanonicalLoop(invocationIndex?: number): OSEndToEndLoopResult {
    const resolvedInvocationIndex =
      invocationIndex !== undefined ? invocationIndex : ++this.invocationSeq;

    const errors: string[] = [];
    const scenario = this.scenarioManager.getCanonicalScenario();

    const eventId = "EVT-001";
    const sourceRecordId = scenario.records.signal.recordId;

    const baseEvent: OSEvent | undefined = osEventsRegistry.find(
      (event) => event.id === eventId,
    );

    if (!baseEvent) {
      return {
        status: "FAILED",
        scenarioName: scenario.name,
        eventId,
        sourceRecordId,
        stages: {},
        executed: false,
        completed: false,
        errors: [`Canonical event "${eventId}" not found in event registry.`],
      };
    }

    if (
      baseEvent.module !== "SIGNAL" ||
      baseEvent.recordId !== sourceRecordId
    ) {
      return {
        status: "FAILED",
        scenarioName: scenario.name,
        eventId,
        sourceRecordId,
        stages: {},
        executed: false,
        completed: false,
        errors: [
          `Canonical event identity mismatch: expected SIGNAL / ${sourceRecordId}, got ${baseEvent.module} / ${baseEvent.recordId}.`,
        ],
      };
    }

    let currentStatus: OSEndToEndLoopStatus = "FAILED";
    let eventResolutionResult: OSIntegrationResult | undefined;
    let contextHandoffResult: OSContextHandoffResult | undefined;
    let moduleHandoffResult: OSModuleHandoffResult | undefined;
    let runtimeSafetyResult: OSRuntimeSafetyResult | undefined;

    const observationResults: OSIntegrationObservation[] = [];
    const timestamp = new Date().toISOString();
    const suffix = `-${resolvedInvocationIndex}`;

    try {
      // 1. Event Resolution
      eventResolutionResult =
        this.integrationRuntime.resolveEventAndPrepare(baseEvent);

      if (eventResolutionResult.status !== "matched") {
        errors.push(
          `Event resolution failed with status "${eventResolutionResult.status}".`,
        );
      }

      const eventObsWrap = this.observabilityAdapter.observeEventResolution(
        baseEvent,
        eventResolutionResult,
        {
          id: `OBS-REC-${eventId}-1${suffix}`,
          timestamp,
        },
      );

      if (eventObsWrap.observation) {
        observationResults.push(eventObsWrap.observation);
      }

      if (errors.length > 0) {
        return {
          status: "FAILED",
          scenarioName: scenario.name,
          eventId,
          sourceRecordId,
          stages: {
            eventResolution: eventResolutionResult,
            observability: observationResults,
          },
          executed: false,
          completed: false,
          errors,
        };
      }

      currentStatus = "RESOLVED";

      // 2. Integration Resolution Observation
      // Uses the existing resolution result; no duplicate resolution work.
      const integrationObsWrap =
        this.observabilityAdapter.observeIntegrationResolution(
          eventResolutionResult,
          {
            id: `OBS-REC-${eventId}-2${suffix}`,
            timestamp,
          },
        );

      if (integrationObsWrap.observation) {
        observationResults.push(integrationObsWrap.observation);
      }

      // 3. Context Handoff Preparation
      const firstHandoff = eventResolutionResult.handoffs[0];

      if (!firstHandoff) {
        errors.push(
          `No integration handoffs generated for event "${eventId}".`,
        );

        return {
          status: currentStatus,
          scenarioName: scenario.name,
          eventId,
          sourceRecordId,
          stages: {
            eventResolution: eventResolutionResult,
            observability: observationResults,
          },
          executed: false,
          completed: false,
          errors,
        };
      }

      contextHandoffResult =
        this.contextHandoffRuntime.prepareContextHandoff(firstHandoff);

      if (contextHandoffResult.status !== "prepared") {
        errors.push(...contextHandoffResult.errors);
      } else {
        currentStatus = "CONTEXT_HANDOFF_PREPARED";
      }

      const contextObsWrap = this.observabilityAdapter.observeContextHandoff(
        contextHandoffResult,
        {
          id: `OBS-REC-${eventId}-3${suffix}`,
          timestamp,
        },
      );

      if (contextObsWrap.observation) {
        observationResults.push(contextObsWrap.observation);
      }

      if (errors.length > 0 || !contextHandoffResult.package) {
        return {
          status: currentStatus,
          scenarioName: scenario.name,
          eventId,
          sourceRecordId,
          stages: {
            eventResolution: eventResolutionResult,
            contextHandoff: contextHandoffResult,
            observability: observationResults,
          },
          executed: false,
          completed: false,
          errors,
        };
      }

      // 4. Module Handoff Evaluation
      moduleHandoffResult = this.moduleHandoffRuntime.prepareModuleHandoff(
        contextHandoffResult.package,
      );

      if (moduleHandoffResult.status !== "prepared") {
        errors.push(...moduleHandoffResult.errors);
      } else {
        currentStatus = "MODULE_HANDOFF_PREPARED";
      }

      const moduleObsWrap = this.observabilityAdapter.observeModuleHandoff(
        moduleHandoffResult,
        {
          id: `OBS-REC-${eventId}-4${suffix}`,
          timestamp,
        },
      );

      if (moduleObsWrap.observation) {
        observationResults.push(moduleObsWrap.observation);
      }

      if (errors.length > 0) {
        return {
          status: currentStatus,
          scenarioName: scenario.name,
          eventId,
          sourceRecordId,
          stages: {
            eventResolution: eventResolutionResult,
            contextHandoff: contextHandoffResult,
            moduleHandoff: moduleHandoffResult,
            observability: observationResults,
          },
          executed: false,
          completed: false,
          errors,
        };
      }

      // 5. Runtime Safety Validation
      runtimeSafetyResult =
        this.runtimeSafety.validateHandoff(moduleHandoffResult);

      if (runtimeSafetyResult.status !== "valid") {
        errors.push(...runtimeSafetyResult.errors);
      } else {
        currentStatus = "RUNTIME_SAFETY_VALIDATED";
      }

      const safetyObsWrap = this.observabilityAdapter.observeRuntimeSafety(
        runtimeSafetyResult,
        {
          id: `OBS-REC-${eventId}-5${suffix}`,
          timestamp,
        },
      );

      if (safetyObsWrap.observation) {
        observationResults.push(safetyObsWrap.observation);
      }

      if (errors.length === 0) {
        currentStatus = "OBSERVED";
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        errors.push(err.message);
      } else {
        errors.push(String(err));
      }
    }

    return {
      status: currentStatus,
      scenarioName: scenario.name,
      eventId,
      sourceRecordId,
      stages: {
        eventResolution: eventResolutionResult,
        contextHandoff: contextHandoffResult,
        moduleHandoff: moduleHandoffResult,
        runtimeSafety: runtimeSafetyResult,
        observability: observationResults,
      },
      executed: false,
      completed: false,
      errors,
    };
  }
}

export const osEndToEndLoopExecutor = new OSEndToEndLoopExecutor();