import { describe, it, expect } from "@jest/globals";

import {
  OSIntegrationRuntime,
  osIntegrationRuntime,
  OSIntegrationSource,
} from "../integrationRuntime";

import {
  OSIntegrationContractStore,
  OSIntegrationContract,
} from "../integrationContracts";

import { crossModuleReferencesRegistry } from "../crossModuleReferences";

import {
  osEventsRegistry,
  OSEvent,
  OSEventAction,
} from "../../../data/os/events";

export function runOSIntegrationRuntimeVerification(): boolean {
  console.log(
    "[OS Integration Runtime Verification] Starting 13.1 & 13.2 checks...",
  );

  let passed = true;

  const runtime = osIntegrationRuntime;

  // Index actual canonical events from locked 12.1 registry
  const eventMap = new Map<string, OSEvent>(
    osEventsRegistry.map((evt) => [evt.id, evt]),
  );

  // 1. EVT-001: SIGNAL obs_89412a observation created
  //    -> CONTRACT-001 -> AI
  const evt1 = eventMap.get("EVT-001");

  if (!evt1) {
    console.error(
      "FAIL: EVT-001 missing from osEventsRegistry.",
    );
    passed = false;
  } else {
    const res = runtime.resolveEventAndPrepare(evt1);

    if (
      res.status !== "matched" ||
      res.handoffs.length !== 1 ||
      res.handoffs[0].contractId !== "CONTRACT-001" ||
      res.handoffs[0].targetModule !== "AI" ||
      res.handoffs[0].status !== "HANDOFF_PREPARED" ||
      res.handoffs[0].metadata.resolvedFromEventId !== "EVT-001"
    ) {
      console.error(
        "FAIL: EVT-001 failed to resolve CONTRACT-001.",
      );
      passed = false;
    }
  }

  // 2. EVT-002: SIGNAL ins_7721 insight created
  //    -> CONTRACT-004 -> PULSE
  const evt2 = eventMap.get("EVT-002");

  if (!evt2) {
    console.error(
      "FAIL: EVT-002 missing from osEventsRegistry.",
    );
    passed = false;
  } else {
    const res = runtime.resolveEventAndPrepare(evt2);

    if (
      res.status !== "matched" ||
      res.handoffs.length !== 1 ||
      res.handoffs[0].contractId !== "CONTRACT-004" ||
      res.handoffs[0].targetModule !== "PULSE" ||
      res.handoffs[0].metadata.resolvedFromEventId !== "EVT-002"
    ) {
      console.error(
        "FAIL: EVT-002 failed to resolve CONTRACT-004.",
      );
      passed = false;
    }
  }

  // 3. EVT-003: AI DEC-001 decision created
  //    -> CONTRACT-002 -> FORGE
  const evt3 = eventMap.get("EVT-003");

  if (!evt3) {
    console.error(
      "FAIL: EVT-003 missing from osEventsRegistry.",
    );
    passed = false;
  } else {
    const res = runtime.resolveEventAndPrepare(evt3);

    if (
      res.status !== "matched" ||
      res.handoffs.length !== 1 ||
      res.handoffs[0].contractId !== "CONTRACT-002" ||
      res.handoffs[0].targetModule !== "FORGE" ||
      res.handoffs[0].metadata.resolvedFromEventId !== "EVT-003"
    ) {
      console.error(
        "FAIL: EVT-003 failed to resolve CONTRACT-002.",
      );
      passed = false;
    }
  }

  // 4. EVT-004: AI DEC-001 decision updated
  //    -> CONTRACT-002 -> FORGE
  const evt4 = eventMap.get("EVT-004");

  if (!evt4) {
    console.error(
      "FAIL: EVT-004 missing from osEventsRegistry.",
    );
    passed = false;
  } else {
    const res = runtime.resolveEventAndPrepare(evt4);

    if (
      res.status !== "matched" ||
      res.handoffs.length !== 1 ||
      res.handoffs[0].contractId !== "CONTRACT-002" ||
      res.handoffs[0].targetModule !== "FORGE" ||
      res.handoffs[0].status !== "HANDOFF_PREPARED" ||
      res.handoffs[0].metadata.resolvedFromEventId !== "EVT-004"
    ) {
      console.error(
        "FAIL: EVT-004 failed to resolve CONTRACT-002.",
      );
      passed = false;
    }
  }

  // Direct source resolution test for CONTRACT-003
  // FORGE TASK-001 -> PULSE
  const forgeSource: OSIntegrationSource = {
    module: "FORGE",
    recordId: "TASK-001",
    recordType: "execution_task",
  };

  const resForge = runtime.resolveAndPrepare(forgeSource);

  if (
    resForge.status !== "matched" ||
    resForge.handoffs.length !== 1 ||
    resForge.handoffs[0].contractId !== "CONTRACT-003" ||
    resForge.handoffs[0].targetModule !== "PULSE"
  ) {
    console.error(
      "FAIL: Direct source resolution for CONTRACT-003 failed.",
    );
    passed = false;
  }

  // 5. Unknown Event Record ID -> not_found
  const unknownEvt: OSEvent = {
    id: "EVT-999",
    timestamp: "2026-09-10T00:00:00Z",
    module: "SIGNAL",
    recordId: "OBS-999",
    recordType: "observation",
    action: "created",
    summary: "Unknown observation",
    actor: "SYSTEM",
    metadata: {},
  };

  const resUnknown =
    runtime.resolveEventAndPrepare(unknownEvt);

  if (
    resUnknown.status !== "not_found" ||
    resUnknown.handoffs.length !== 0
  ) {
    console.error(
      'FAIL: Unknown event record ID did not return status "not_found".',
    );
    passed = false;
  }

  // 6. Invalid Event Module -> invalid
  //    No fallback to SYSTEM
  const invalidModuleEvt: OSEvent = {
    ...unknownEvt,
    module:
      "INVALID_MODULE" as unknown as OSEvent["module"],
    recordId: "obs_89412a",
  };

  const resInvalidMod =
    runtime.resolveEventAndPrepare(invalidModuleEvt);

  if (
    resInvalidMod.status !== "invalid" ||
    resInvalidMod.source.module !==
      ("INVALID_MODULE" as unknown as OSEvent["module"]) ||
    resInvalidMod.errors.length === 0
  ) {
    console.error(
      "FAIL: Invalid event module was silently converted or not rejected as invalid.",
    );
    passed = false;
  }

  // 7. Unsupported Event Action -> invalid
  const badActionEvt: OSEvent = {
    ...unknownEvt,
    module: "SIGNAL",
    recordId: "obs_89412a",
    action:
      "NON_CANONICAL_ACTION" as OSEventAction,
  };

  const resBadAction =
    runtime.resolveEventAndPrepare(badActionEvt);

  if (
    resBadAction.status !== "invalid" ||
    resBadAction.errors.length === 0
  ) {
    console.error(
      "FAIL: Non-canonical event action was not rejected as invalid.",
    );
    passed = false;
  }

  // Isolated store testing for negative cases.
  // Never modify the canonical contract registry.
  const testContractStore =
    new OSIntegrationContractStore([]);

  // 8. Event referencing a contract with an invalid
  //    canonical CrossModuleReference -> invalid
  const contractNonExistentRef: OSIntegrationContract = {
    id: "TEST-CONTRACT-001",
    sourceModule: "SIGNAL",
    targetModule: "AI",
    sourceRecordType: "observation",
    targetRecordType: "decision",
    purpose: "Test invalid ref",
    crossModuleRefId: "REF-999",
    requiredReferences: ["obs_89412a"],
    createdAt: "2026-01-01T00:00:00Z",
    metadata: {},
  };

  testContractStore.addContract(
    contractNonExistentRef,
  );

  const testRuntimeBadRef =
    new OSIntegrationRuntime(
      testContractStore,
      crossModuleReferencesRegistry,
    );

  if (evt1) {
    const resBadRef =
      testRuntimeBadRef.resolveEventAndPrepare(evt1);

    if (
      resBadRef.status !== "invalid" ||
      resBadRef.errors.length === 0
    ) {
      console.error(
        "FAIL: Contract with invalid crossModuleRefId was not rejected for event.",
      );
      passed = false;
    }
  }

  // 9. Immutability & Determinism
  if (evt1) {
    const resSignal1 =
      runtime.resolveEventAndPrepare(evt1);

    if (resSignal1.handoffs.length > 0) {
      const handoff = resSignal1.handoffs[0];

      handoff.requiredReferences.push(
        "MUTATION_TEST",
      );

      handoff.metadata.tampered = true;

      const resSignal2 =
        runtime.resolveEventAndPrepare(evt1);

      if (
        resSignal2.handoffs[0].requiredReferences.includes(
          "MUTATION_TEST",
        ) ||
        resSignal2.handoffs[0].metadata.tampered === true
      ) {
        console.error(
          "FAIL: Handoff object mutation leaked to subsequent resolutions.",
        );
        passed = false;
      }
    }

    const run1 = JSON.stringify(
      runtime.resolveEventAndPrepare(evt1),
    );

    const run2 = JSON.stringify(
      runtime.resolveEventAndPrepare(evt1),
    );

    if (run1 !== run2) {
      console.error(
        "FAIL: Event resolution is non-deterministic.",
      );
      passed = false;
    }
  }

  console.log(
    `[OS Integration Runtime Verification] Verification complete. Result: ${
      passed ? "PASSED" : "FAILED"
    }`,
  );

  return passed;
}

describe("OS Integration Runtime", () => {
  it(
    "passes 13.1 and 13.2 verification against canonical events and contracts",
    () => {
      expect(
        runOSIntegrationRuntimeVerification(),
      ).toBe(true);
    },
  );
});