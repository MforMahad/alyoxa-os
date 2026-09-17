import { describe, it, expect } from "@jest/globals";
import {
  OSContextHandoffRuntime,
  osContextHandoffRuntime,
} from "../contextHandoffRuntime";
import {
  osIntegrationRuntime,
  OSIntegrationHandoff,
} from "../integrationRuntime";
import { osEventsRegistry, OSEvent } from "../../../data/os/events";
import {
  crossModuleReferencesRegistry,
  CrossModuleReference,
} from "../crossModuleReferences";
import {
  SharedContextEntry,
  sharedContextStore,
  SharedContextStore,
} from "../sharedContext";
import {
  osIntegrationContractStore,
  OSIntegrationContractStore,
  OSIntegrationContract,
} from "../integrationContracts";

export function runOSContextHandoffRuntimeVerification(): boolean {
  console.log(
    "[OS Context Handoff Runtime Verification] Starting 13.3 checks...",
  );

  let passed = true;

  const runtime = osContextHandoffRuntime;

  const eventMap = new Map<string, OSEvent>(
    osEventsRegistry.map((evt) => [evt.id, evt]),
  );

  function getPreparedHandoff(eventId: string): OSIntegrationHandoff {
    const evt = eventMap.get(eventId);

    if (!evt) {
      throw new Error(`Event ${eventId} missing in registry`);
    }

    const res = osIntegrationRuntime.resolveEventAndPrepare(evt);

    if (res.status !== "matched" || res.handoffs.length === 0) {
      throw new Error(
        `Failed to prepare 13.2 handoff for event ${eventId}`,
      );
    }

    return res.handoffs[0];
  }

  // 1. Valid SIGNAL obs_89412a -> CONTRACT-001 -> AI (EVT-001)
  try {
    const h1 = getPreparedHandoff("EVT-001");
    const res1 = runtime.prepareContextHandoff(h1);

    if (
      res1.status !== "prepared" ||
      !res1.package ||
      res1.package.contractId !== "CONTRACT-001" ||
      res1.package.targetModule !== "AI" ||
      res1.package.status !== "CONTEXT_HANDOFF_PREPARED" ||
      res1.package.references[0]?.id !== "CMR-001"
    ) {
      console.error(
        "FAIL: EVT-001 context handoff preparation failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error("FAIL: Exception during EVT-001 test:", err);
    passed = false;
  }

  // 2. Valid SIGNAL ins_7721 -> CONTRACT-004 -> PULSE (EVT-002)
  try {
    const h2 = getPreparedHandoff("EVT-002");
    const res2 = runtime.prepareContextHandoff(h2);

    if (
      res2.status !== "prepared" ||
      !res2.package ||
      res2.package.contractId !== "CONTRACT-004" ||
      res2.package.targetModule !== "PULSE" ||
      res2.package.references[0]?.id !== "CMR-004"
    ) {
      console.error(
        "FAIL: EVT-002 context handoff preparation failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error("FAIL: Exception during EVT-002 test:", err);
    passed = false;
  }

  // 3. Valid AI DEC-001 -> CONTRACT-002 -> FORGE (EVT-003)
  try {
    const h3 = getPreparedHandoff("EVT-003");
    const res3 = runtime.prepareContextHandoff(h3);

    if (
      res3.status !== "prepared" ||
      !res3.package ||
      res3.package.contractId !== "CONTRACT-002" ||
      res3.package.targetModule !== "FORGE" ||
      res3.package.references[0]?.id !== "CMR-002"
    ) {
      console.error(
        "FAIL: EVT-003 context handoff preparation failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error("FAIL: Exception during EVT-003 test:", err);
    passed = false;
  }

  // 4. Valid FORGE TASK-001 -> CONTRACT-003 -> PULSE (EVT-007)
  try {
    const h7 = getPreparedHandoff("EVT-007");
    const res7 = runtime.prepareContextHandoff(h7);

    if (
      res7.status !== "prepared" ||
      !res7.package ||
      res7.package.contractId !== "CONTRACT-003" ||
      res7.package.targetModule !== "PULSE" ||
      res7.package.references[0]?.id !== "CMR-005"
    ) {
      console.error(
        "FAIL: EVT-007 context handoff preparation failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error("FAIL: Exception during EVT-007 test:", err);
    passed = false;
  }

  // 5. Invalid handoff status
  const badStatusHandoff: OSIntegrationHandoff = {
    ...getPreparedHandoff("EVT-001"),
    status:
      "INVALID_STATUS" as unknown as OSIntegrationHandoff["status"],
  };

  const resBadStatus =
    runtime.prepareContextHandoff(badStatusHandoff);

  if (
    resBadStatus.status !== "invalid" ||
    resBadStatus.package !== null
  ) {
    console.error(
      "FAIL: Invalid handoff status was not rejected.",
    );
    passed = false;
  }

  // 6. Invalid target module
  const badTargetHandoff: OSIntegrationHandoff = {
    ...getPreparedHandoff("EVT-001"),
    targetModule:
      "INVALID_MODULE" as unknown as OSIntegrationHandoff["targetModule"],
  };

  const resBadTarget =
    runtime.prepareContextHandoff(badTargetHandoff);

  if (
    resBadTarget.status !== "invalid" ||
    resBadTarget.package !== null
  ) {
    console.error(
      "FAIL: Invalid target module was not rejected.",
    );
    passed = false;
  }

  // 7. Unknown crossModuleRefId in contract
  const testContractUnknownRef: OSIntegrationContract = {
    id: "CONTRACT-NO-REF",
    sourceModule: "SIGNAL",
    targetModule: "AI",
    sourceRecordType: "observation",
    targetRecordType: "decision",
    purpose: "Test unknown ref",
    crossModuleRefId: "CMR-NO-REF",
    requiredReferences: ["obs_89412a"],
    createdAt: "2026-01-01T00:00:00Z",
    metadata: {},
  };

  const testContractStore =
    new OSIntegrationContractStore([testContractUnknownRef]);

  const customRuntimeUnknownRef =
    new OSContextHandoffRuntime(
      crossModuleReferencesRegistry,
      sharedContextStore,
      testContractStore,
    );

  const hUnknownRef: OSIntegrationHandoff = {
    ...getPreparedHandoff("EVT-001"),
    contractId: "CONTRACT-NO-REF",
  };

  const resUnknownRef =
    customRuntimeUnknownRef.prepareContextHandoff(hUnknownRef);

  if (resUnknownRef.status !== "not_found") {
    console.error(
      "FAIL: Unknown crossModuleRefId in contract was not handled as not_found.",
    );
    passed = false;
  }

  // 8. Canonical reference source module mismatch
  const mismatchedRefSource: CrossModuleReference[] = [
    {
      id: "REF-MISMATCH-SRC",
      sourceModule: "VAULT",
      sourceRecordId: "obs_89412a",
      targetModule: "AI",
      targetRecordId: "DEC-001",
      type: "derived_from",
      createdAt: "2026-01-01T00:00:00Z",
      metadata: {},
    },
  ];

  const canonicalContract001 =
    osIntegrationContractStore
      .getAll()
      .find((c) => c.id === "CONTRACT-001");

  if (!canonicalContract001) {
    throw new Error("CONTRACT-001 missing from contract registry");
  }

  const testContractMismatchSrc: OSIntegrationContract = {
    ...canonicalContract001,
    crossModuleRefId: "REF-MISMATCH-SRC",
  };

  const runtimeMismatchSrc =
    new OSContextHandoffRuntime(
      mismatchedRefSource,
      sharedContextStore,
      new OSIntegrationContractStore([
        testContractMismatchSrc,
      ]),
    );

  const resMismatchSrc =
    runtimeMismatchSrc.prepareContextHandoff(
      getPreparedHandoff("EVT-001"),
    );

  if (resMismatchSrc.status !== "invalid") {
    console.error(
      "FAIL: Canonical reference source module mismatch was not rejected.",
    );
    passed = false;
  }

  // 9. Canonical reference target module mismatch
  const mismatchedRefTarget: CrossModuleReference[] = [
    {
      id: "REF-MISMATCH-TGT",
      sourceModule: "SIGNAL",
      sourceRecordId: "obs_89412a",
      targetModule: "PULSE",
      targetRecordId: "DEC-001",
      type: "derived_from",
      createdAt: "2026-01-01T00:00:00Z",
      metadata: {},
    },
  ];

  const testContractMismatchTgt: OSIntegrationContract = {
    ...canonicalContract001,
    crossModuleRefId: "REF-MISMATCH-TGT",
  };

  const runtimeMismatchTgt =
    new OSContextHandoffRuntime(
      mismatchedRefTarget,
      sharedContextStore,
      new OSIntegrationContractStore([
        testContractMismatchTgt,
      ]),
    );

  const resMismatchTgt =
    runtimeMismatchTgt.prepareContextHandoff(
      getPreparedHandoff("EVT-001"),
    );

  if (resMismatchTgt.status !== "invalid") {
    console.error(
      "FAIL: Canonical reference target module mismatch was not rejected.",
    );
    passed = false;
  }

  // 10. Canonical reference source record mismatch
  const mismatchedRefRecord: CrossModuleReference[] = [
    {
      id: "REF-MISMATCH-REC",
      sourceModule: "SIGNAL",
      sourceRecordId: "obs_999999",
      targetModule: "AI",
      targetRecordId: "DEC-001",
      type: "derived_from",
      createdAt: "2026-01-01T00:00:00Z",
      metadata: {},
    },
  ];

  const testContractMismatchRec: OSIntegrationContract = {
    ...canonicalContract001,
    crossModuleRefId: "REF-MISMATCH-REC",
  };

  const runtimeMismatchRec =
    new OSContextHandoffRuntime(
      mismatchedRefRecord,
      sharedContextStore,
      new OSIntegrationContractStore([
        testContractMismatchRec,
      ]),
    );

  const resMismatchRec =
    runtimeMismatchRec.prepareContextHandoff(
      getPreparedHandoff("EVT-001"),
    );

  if (resMismatchRec.status !== "invalid") {
    console.error(
      "FAIL: Canonical reference source recordId mismatch was not rejected.",
    );
    passed = false;
  }

  // 11. Empty SharedContextStore -> valid package with empty contextEntries
  const emptyContextStore = new SharedContextStore();

  const runtimeEmptyContext =
    new OSContextHandoffRuntime(
      crossModuleReferencesRegistry,
      emptyContextStore,
      osIntegrationContractStore,
    );

  const resEmptyCtx =
    runtimeEmptyContext.prepareContextHandoff(
      getPreparedHandoff("EVT-001"),
    );

  if (
    resEmptyCtx.status !== "prepared" ||
    !resEmptyCtx.package ||
    resEmptyCtx.package.contextEntries.length !== 0
  ) {
    console.error(
      "FAIL: Empty shared context did not produce a valid package with empty contextEntries.",
    );
    passed = false;
  }

  // 12. Output Immutability
  const hOriginal = getPreparedHandoff("EVT-001");
  const resImm1 =
    runtime.prepareContextHandoff(hOriginal);

  if (resImm1.package) {
    resImm1.package.references.push({
      id: "REF-MUTATED",
      sourceModule: "SIGNAL",
      sourceRecordId: "BAD",
      targetModule: "AI",
      targetRecordId: "BAD",
      type: "derived_from",
      createdAt: "2026-01-01T00:00:00Z",
      metadata: {},
    });

    resImm1.package.metadata.tampered = true;

    const resImm2 =
      runtime.prepareContextHandoff(hOriginal);

    if (
      resImm2.package?.references.some(
        (r) => r.id === "REF-MUTATED",
      ) ||
      resImm2.package?.metadata.tampered === true
    ) {
      console.error(
        "FAIL: Output package mutation leaked across resolutions.",
      );
      passed = false;
    }
  }

  // 13. Input Immutability
  const hInput = getPreparedHandoff("EVT-001");
  const inputSnapshot = JSON.stringify(hInput);

  runtime.prepareContextHandoff(hInput);

  if (JSON.stringify(hInput) !== inputSnapshot) {
    console.error(
      "FAIL: Supplied handoff object was mutated by runtime.",
    );
    passed = false;
  }

  // 14. Determinism
  const runA = JSON.stringify(
    runtime.prepareContextHandoff(hOriginal),
  );

  const runB = JSON.stringify(
    runtime.prepareContextHandoff(hOriginal),
  );

  if (runA !== runB) {
    console.error(
      "FAIL: Context handoff preparation is non-deterministic.",
    );
    passed = false;
  }

  console.log(
    `[OS Context Handoff Runtime Verification] Verification complete. Result: ${
      passed ? "PASSED" : "FAILED"
    }`,
  );

  return passed;
}

describe("OS Context Handoff Runtime", () => {
  it("passes 13.3 verification against canonical EVT-001 chain", () => {
    expect(
      runOSContextHandoffRuntimeVerification(),
    ).toBe(true);
  });
});