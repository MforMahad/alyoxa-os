import { describe, it, expect } from "@jest/globals";
import {
  OSModuleHandoffRuntime,
  osModuleHandoffRuntime,
  osModuleHandoffAdapterRegistry,
} from "../moduleHandoffRuntime";
import {
  osContextHandoffRuntime,
  OSContextHandoffPackage,
} from "../contextHandoffRuntime";
import { osIntegrationRuntime } from "../integrationRuntime";
import {
  osEventsRegistry,
  OSEvent,
} from "../../../data/os/events";
import {
  crossModuleReferencesRegistry,
  CrossModuleReference,
} from "../crossModuleReferences";

export function runOSModuleHandoffRuntimeVerification(): boolean {
  console.log(
    "[OS Module Handoff Runtime Verification] Starting 13.4 checks...",
  );

  let passed = true;

  const eventMap = new Map<string, OSEvent>(
    osEventsRegistry.map((evt) => [evt.id, evt]),
  );

  function getPreparedPackage(
    eventId: string,
  ): OSContextHandoffPackage {
    const evt = eventMap.get(eventId);

    if (!evt) {
      throw new Error(`Event ${eventId} missing in registry`);
    }

    const integrationRes =
      osIntegrationRuntime.resolveEventAndPrepare(evt);

    if (
      integrationRes.status !== "matched" ||
      integrationRes.handoffs.length === 0
    ) {
      throw new Error(
        `Failed to prepare 13.2 handoff for event ${eventId}`,
      );
    }

    const contextRes =
      osContextHandoffRuntime.prepareContextHandoff(
        integrationRes.handoffs[0],
      );

    if (
      contextRes.status !== "prepared" ||
      !contextRes.package
    ) {
      throw new Error(
        `Failed to prepare 13.3 context package for event ${eventId}`,
      );
    }

    return contextRes.package;
  }

  // 1. Valid SIGNAL obs_89412a -> AI (EVT-001)
  try {
    const pkg1 = getPreparedPackage("EVT-001");
    const res1 =
      osModuleHandoffRuntime.prepareModuleHandoff(pkg1);

    if (
      res1.status !== "prepared" ||
      res1.targetModule !== "AI" ||
      res1.targetRecordType !== "decision" ||
      res1.sourceRecordId !== "obs_89412a" ||
      res1.contractId !== "CONTRACT-001" ||
      res1.package?.references[0]?.id !== "CMR-001"
    ) {
      console.error(
        "FAIL: EVT-001 module handoff failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error(
      "FAIL: Exception during EVT-001 test:",
      err,
    );
    passed = false;
  }

  // 2. Valid SIGNAL ins_7721 -> PULSE (EVT-002)
  try {
    const pkg2 = getPreparedPackage("EVT-002");
    const res2 =
      osModuleHandoffRuntime.prepareModuleHandoff(pkg2);

    if (
      res2.status !== "prepared" ||
      res2.targetModule !== "PULSE" ||
      res2.targetRecordType !== "request" ||
      res2.sourceRecordId !== "ins_7721" ||
      res2.contractId !== "CONTRACT-004"
    ) {
      console.error(
        "FAIL: EVT-002 module handoff failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error(
      "FAIL: Exception during EVT-002 test:",
      err,
    );
    passed = false;
  }

  // 3. Valid AI DEC-001 -> FORGE (EVT-003)
  try {
    const pkg3 = getPreparedPackage("EVT-003");
    const res3 =
      osModuleHandoffRuntime.prepareModuleHandoff(pkg3);

    if (
      res3.status !== "prepared" ||
      res3.targetModule !== "FORGE" ||
      res3.targetRecordType !== "execution_task" ||
      res3.sourceRecordId !== "DEC-001" ||
      res3.contractId !== "CONTRACT-002"
    ) {
      console.error(
        "FAIL: EVT-003 module handoff failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error(
      "FAIL: Exception during EVT-003 test:",
      err,
    );
    passed = false;
  }

  // 4. Valid FORGE TASK-001 -> PULSE (EVT-007)
  try {
    const pkg7 = getPreparedPackage("EVT-007");
    const res7 =
      osModuleHandoffRuntime.prepareModuleHandoff(pkg7);

    if (
      res7.status !== "prepared" ||
      res7.targetModule !== "PULSE" ||
      res7.targetRecordType !== "request" ||
      res7.sourceRecordId !== "TASK-001" ||
      res7.contractId !== "CONTRACT-003"
    ) {
      console.error(
        "FAIL: EVT-007 module handoff failed.",
      );
      passed = false;
    }
  } catch (err) {
    console.error(
      "FAIL: Exception during EVT-007 test:",
      err,
    );
    passed = false;
  }

  // 5. Invalid Package Status rejection
  const badStatusPkg: OSContextHandoffPackage = {
    ...getPreparedPackage("EVT-001"),
    status:
      "INVALID_STATUS" as unknown as OSContextHandoffPackage["status"],
  };

  const resBadStatus =
    osModuleHandoffRuntime.prepareModuleHandoff(
      badStatusPkg,
    );

  if (resBadStatus.status !== "invalid") {
    console.error(
      "FAIL: Invalid package status was not rejected.",
    );
    passed = false;
  }

  // 6. Invalid Target Module rejection
  const badTargetPkg: OSContextHandoffPackage = {
    ...getPreparedPackage("EVT-001"),
    targetModule:
      "INVALID_MODULE" as unknown as OSContextHandoffPackage["targetModule"],
  };

  const resBadTarget =
    osModuleHandoffRuntime.prepareModuleHandoff(
      badTargetPkg,
    );

  if (
    resBadTarget.status !== "invalid" ||
    String(resBadTarget.targetModule) !== "INVALID_MODULE"
  ) {
    console.error(
      "FAIL: Non-canonical target module was not rejected cleanly.",
    );
    passed = false;
  }

  // 7. Missing Contract ID rejection
  const noContractPkg: OSContextHandoffPackage = {
    ...getPreparedPackage("EVT-001"),
    contractId: "",
  };

  const resNoContract =
    osModuleHandoffRuntime.prepareModuleHandoff(
      noContractPkg,
    );

  if (resNoContract.status !== "invalid") {
    console.error(
      "FAIL: Missing contract ID was not rejected.",
    );
    passed = false;
  }

  // 8. Missing Required Reference rejection
  const noRefPkg: OSContextHandoffPackage = {
    ...getPreparedPackage("EVT-001"),
    references: [],
  };

  const resNoRef =
    osModuleHandoffRuntime.prepareModuleHandoff(noRefPkg);

  if (resNoRef.status !== "invalid") {
    console.error(
      "FAIL: Empty required references was not rejected.",
    );
    passed = false;
  }

  // 9. Canonical Reference Source Mismatch rejection
  const mismatchedSrcRefs: CrossModuleReference[] = [
    {
      id: "REF-001",
      sourceModule: "VAULT",
      sourceRecordId: "obs_89412a",
      targetModule: "AI",
      targetRecordId: "DEC-001",
      type: "derived_from",
      createdAt: "2026-01-01T00:00:00Z",
      metadata: {},
    },
  ];

  const customRuntimeMismatchSrc =
    new OSModuleHandoffRuntime(
      osModuleHandoffAdapterRegistry,
      mismatchedSrcRefs,
    );

  const resMismatchSrc =
    customRuntimeMismatchSrc.prepareModuleHandoff(
      getPreparedPackage("EVT-001"),
    );

  if (resMismatchSrc.status !== "invalid") {
    console.error(
      "FAIL: Canonical reference source module mismatch was not rejected.",
    );
    passed = false;
  }

  // 10. Canonical Reference Target Mismatch rejection
  const mismatchedTgtRefs: CrossModuleReference[] = [
    {
      id: "REF-001",
      sourceModule: "SIGNAL",
      sourceRecordId: "obs_89412a",
      targetModule: "PULSE",
      targetRecordId: "DEC-001",
      type: "derived_from",
      createdAt: "2026-01-01T00:00:00Z",
      metadata: {},
    },
  ];

  const customRuntimeMismatchTgt =
    new OSModuleHandoffRuntime(
      osModuleHandoffAdapterRegistry,
      mismatchedTgtRefs,
    );

  const resMismatchTgt =
    customRuntimeMismatchTgt.prepareModuleHandoff(
      getPreparedPackage("EVT-001"),
    );

  if (resMismatchTgt.status !== "invalid") {
    console.error(
      "FAIL: Canonical reference target module mismatch was not rejected.",
    );
    passed = false;
  }

  // 11. Isolated Canonical Target Module VAULT (No Adapter)
  //     returns NOT_SUPPORTED
  const vaultRef: CrossModuleReference = {
    id: "REF-VAULT-001",
    sourceModule: "SIGNAL",
    sourceRecordId: "obs_89412a",
    targetModule: "VAULT",
    targetRecordId: "VLT-001",
    type: "derived_from",
    createdAt: "2026-01-01T00:00:00Z",
    metadata: {},
  };

  const validVaultPackage: OSContextHandoffPackage = {
    status: "CONTEXT_HANDOFF_PREPARED",
    contractId: "CONTRACT-VAULT-001",
    source: {
      module: "SIGNAL",
      recordId: "obs_89412a",
      recordType: "observation",
    },
    targetModule: "VAULT",
    targetRecordType: "VaultRecord",
    references: [vaultRef],
    contextEntries: [],
    metadata: {},
  };

  const vaultRuntime =
    new OSModuleHandoffRuntime(
      osModuleHandoffAdapterRegistry,
      [vaultRef],
    );

  const resVaultNoAdapter =
    vaultRuntime.prepareModuleHandoff(
      validVaultPackage,
    );

  if (
    resVaultNoAdapter.status !== "not_supported" ||
    resVaultNoAdapter.targetModule !== "VAULT"
  ) {
    console.error(
      "FAIL: Structurally valid package targeting canonical VAULT with no adapter did not return NOT_SUPPORTED.",
    );
    passed = false;
  }

  // 12. Output Immutability
  const pkgOriginal =
    getPreparedPackage("EVT-001");

  const resImm1 =
    osModuleHandoffRuntime.prepareModuleHandoff(
      pkgOriginal,
    );

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

    const resImm2 =
      osModuleHandoffRuntime.prepareModuleHandoff(
        pkgOriginal,
      );

    if (
      resImm2.package?.references.some(
        (r) => r.id === "REF-MUTATED",
      )
    ) {
      console.error(
        "FAIL: Output package mutation leaked across resolutions.",
      );
      passed = false;
    }
  }

  // 13. Input Immutability
  const pkgInput =
    getPreparedPackage("EVT-001");

  const inputSnapshot =
    JSON.stringify(pkgInput);

  osModuleHandoffRuntime.prepareModuleHandoff(
    pkgInput,
  );

  if (JSON.stringify(pkgInput) !== inputSnapshot) {
    console.error(
      "FAIL: Supplied handoff package object was mutated by runtime.",
    );
    passed = false;
  }

  // 14. Determinism
  const runA = JSON.stringify(
    osModuleHandoffRuntime.prepareModuleHandoff(
      pkgOriginal,
    ),
  );

  const runB = JSON.stringify(
    osModuleHandoffRuntime.prepareModuleHandoff(
      pkgOriginal,
    ),
  );

  if (runA !== runB) {
    console.error(
      "FAIL: Module handoff preparation is non-deterministic.",
    );
    passed = false;
  }

  console.log(
    `[OS Module Handoff Runtime Verification] Verification complete. Result: ${
      passed ? "PASSED" : "FAILED"
    }`,
  );

  return passed;
}

describe("OS Module Handoff Runtime", () => {
  it("passes 13.4 verification against canonical EVT-001 chain", () => {
    expect(
      runOSModuleHandoffRuntimeVerification(),
    ).toBe(true);
  });
});