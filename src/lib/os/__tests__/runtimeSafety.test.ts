import { describe, it, expect } from "@jest/globals";
import {
  OSRuntimeSafetyValidator,
  osRuntimeSafetyValidator,
} from "../runtimeSafety";
import {
  OSModuleHandoffRuntime,
  osModuleHandoffRuntime,
  osModuleHandoffAdapterRegistry,
  OSModuleHandoffResult,
} from "../moduleHandoffRuntime";
import { osContextHandoffRuntime } from "../contextHandoffRuntime";
import { osIntegrationRuntime } from "../integrationRuntime";
import { osEventsRegistry, OSEvent } from "../../../data/os/events";
import { CrossModuleReference } from "../crossModuleReferences";
import { OSIntegrationContract } from "../integrationContracts";

describe("Runtime Safety Tests", () => {
  it("runs all OS runtime safety verifications successfully", () => {
    console.log(
      "[OS Runtime Safety Verification] Starting Phase 13.5 checks...",
    );

    let passed = true;

    const eventMap = new Map<string, OSEvent>(
      osEventsRegistry.map((evt) => [evt.id, evt]),
    );

    function getPreparedHandoffResult(
      eventId: string,
    ): OSModuleHandoffResult {
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

      if (contextRes.status !== "prepared" || !contextRes.package) {
        throw new Error(
          `Failed to prepare 13.3 context package for event ${eventId}`,
        );
      }

      return osModuleHandoffRuntime.prepareModuleHandoff(
        contextRes.package,
      );
    }

    // 1. Valid EVT-001 (SIGNAL -> AI)
    try {
      const res1 = getPreparedHandoffResult("EVT-001");
      const safeRes1 =
        osRuntimeSafetyValidator.validateHandoff(res1);

      if (
        safeRes1.status !== "valid" ||
        safeRes1.targetModule !== "AI" ||
        safeRes1.sourceRecordId !== "obs_89412a" ||
        safeRes1.contractId !== "CONTRACT-001"
      ) {
        console.error(
          "FAIL: EVT-001 runtime safety validation failed.",
          safeRes1,
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

    // 2. Valid EVT-002 (SIGNAL -> PULSE)
    try {
      const res2 = getPreparedHandoffResult("EVT-002");
      const safeRes2 =
        osRuntimeSafetyValidator.validateHandoff(res2);

      if (
        safeRes2.status !== "valid" ||
        safeRes2.targetModule !== "PULSE" ||
        safeRes2.sourceRecordId !== "ins_7721"
      ) {
        console.error(
          "FAIL: EVT-002 runtime safety validation failed.",
          safeRes2,
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

    // 3. Valid EVT-003 (AI -> FORGE)
    try {
      const res3 = getPreparedHandoffResult("EVT-003");
      const safeRes3 =
        osRuntimeSafetyValidator.validateHandoff(res3);

      if (
        safeRes3.status !== "valid" ||
        safeRes3.targetModule !== "FORGE" ||
        safeRes3.sourceRecordId !== "DEC-001"
      ) {
        console.error(
          "FAIL: EVT-003 runtime safety validation failed.",
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

    // 4. Valid EVT-007 (FORGE -> PULSE)
    try {
      const res7 = getPreparedHandoffResult("EVT-007");
      const safeRes7 =
        osRuntimeSafetyValidator.validateHandoff(res7);

      if (
        safeRes7.status !== "valid" ||
        safeRes7.targetModule !== "PULSE" ||
        safeRes7.sourceRecordId !== "TASK-001"
      ) {
        console.error(
          "FAIL: EVT-007 runtime safety validation failed.",
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

    // 5. Invalid status rejection
    const badStatusHandoff: OSModuleHandoffResult = {
      ...getPreparedHandoffResult("EVT-001"),
      status: "invalid" as unknown as "prepared",
    };

    const resBadStatus =
      osRuntimeSafetyValidator.validateHandoff(
        badStatusHandoff,
      );

    if (resBadStatus.status !== "invalid") {
      console.error(
        "FAIL: Invalid handoff status was not rejected.",
      );
      passed = false;
    }

    // 6. Invalid target module rejection
    const baseRes6 = getPreparedHandoffResult("EVT-001");

    const badTargetHandoff: OSModuleHandoffResult = {
      ...baseRes6,
      package: baseRes6.package
        ? {
            ...baseRes6.package,
            targetModule:
              "INVALID" as unknown as "AI",
          }
        : null,
    };

    const resBadTarget =
      osRuntimeSafetyValidator.validateHandoff(
        badTargetHandoff,
      );

    if (resBadTarget.status !== "invalid") {
      console.error(
        "FAIL: Non-canonical target module was not rejected.",
      );
      passed = false;
    }

    // 7. Missing source record ID rejection
    const baseRes7 = getPreparedHandoffResult("EVT-001");

    const missingSourceIdHandoff: OSModuleHandoffResult = {
      ...baseRes7,
      package: baseRes7.package
        ? {
            ...baseRes7.package,
            source: {
              ...baseRes7.package.source,
              recordId: "",
            },
          }
        : null,
    };

    const resMissingSourceId =
      osRuntimeSafetyValidator.validateHandoff(
        missingSourceIdHandoff,
      );

    if (resMissingSourceId.status !== "invalid") {
      console.error(
        "FAIL: Missing source record ID was not rejected.",
      );
      passed = false;
    }

    // 8. Unknown contract ID rejection
    const baseResUnknownContract =
      getPreparedHandoffResult("EVT-001");

    const unknownContractHandoff: OSModuleHandoffResult = {
      ...baseResUnknownContract,
      package: baseResUnknownContract.package
        ? {
            ...baseResUnknownContract.package,
            contractId: "UNKNOWN-CONTRACT-999",
          }
        : null,
    };

    const resUnknownContract =
      osRuntimeSafetyValidator.validateHandoff(
        unknownContractHandoff,
      );

    if (resUnknownContract.status !== "invalid") {
      console.error(
        "FAIL: Unknown contract ID was not rejected.",
      );
      passed = false;
    }

    // 9. Contract source module mismatch rejection
    const mismatchContractSrc: OSIntegrationContract = {
      id: "CONTRACT-001",
      sourceModule: "VAULT",
      targetModule: "AI",
      sourceRecordType: "observation",
      targetRecordType: "decision",
      purpose: "Test mismatch source",
      requiredReferences: ["obs_89412a"],
      metadata: {},
    };

    const contractSrcMismatchValidator =
      new OSRuntimeSafetyValidator(
        undefined,
        [mismatchContractSrc],
      );

    const resContractSrcMismatch =
      contractSrcMismatchValidator.validateHandoff(
        getPreparedHandoffResult("EVT-001"),
      );

    if (resContractSrcMismatch.status !== "invalid") {
      console.error(
        "FAIL: Contract source module mismatch was not rejected.",
      );
      passed = false;
    }

    // 10. Contract target module mismatch rejection
    const mismatchContractTgt: OSIntegrationContract = {
      id: "CONTRACT-001",
      sourceModule: "SIGNAL",
      targetModule: "PULSE",
      sourceRecordType: "observation",
      targetRecordType: "decision",
      purpose: "Test mismatch target",
      requiredReferences: ["obs_89412a"],
      metadata: {},
    };

    const contractTgtMismatchValidator =
      new OSRuntimeSafetyValidator(
        undefined,
        [mismatchContractTgt],
      );

    const resContractTgtMismatch =
      contractTgtMismatchValidator.validateHandoff(
        getPreparedHandoffResult("EVT-001"),
      );

    if (resContractTgtMismatch.status !== "invalid") {
      console.error(
        "FAIL: Contract target module mismatch was not rejected.",
      );
      passed = false;
    }

    // 11. Contract target record type mismatch rejection
    const mismatchContractRecordType: OSIntegrationContract = {
      id: "CONTRACT-001",
      sourceModule: "SIGNAL",
      targetModule: "AI",
      sourceRecordType: "observation",
      targetRecordType: "notification",
      purpose: "Test mismatch record type",
      requiredReferences: ["obs_89412a"],
      metadata: {},
    };

    const contractRecordTypeMismatchValidator =
      new OSRuntimeSafetyValidator(
        undefined,
        [mismatchContractRecordType],
      );

    const resContractRecordTypeMismatch =
      contractRecordTypeMismatchValidator.validateHandoff(
        getPreparedHandoffResult("EVT-001"),
      );

    if (resContractRecordTypeMismatch.status !== "invalid") {
      console.error(
        "FAIL: Contract target record type mismatch was not rejected.",
      );
      passed = false;
    }

    // 12. Missing target record type rejection
    const baseRes12 = getPreparedHandoffResult("EVT-001");

    const missingRecordTypeHandoff: OSModuleHandoffResult = {
      ...baseRes12,
      package: baseRes12.package
        ? {
            ...baseRes12.package,
            targetRecordType: "",
          }
        : null,
    };

    const resMissingRecordType =
      osRuntimeSafetyValidator.validateHandoff(
        missingRecordTypeHandoff,
      );

    if (resMissingRecordType.status !== "invalid") {
      console.error(
        "FAIL: Missing target record type was not rejected.",
      );
      passed = false;
    }

    // 13. Missing references rejection
    const baseRes13 = getPreparedHandoffResult("EVT-001");

    const missingRefHandoff: OSModuleHandoffResult = {
      ...baseRes13,
      package: baseRes13.package
        ? {
            ...baseRes13.package,
            references: [],
          }
        : null,
    };

    const resMissingRef =
      osRuntimeSafetyValidator.validateHandoff(
        missingRefHandoff,
      );

    if (resMissingRef.status !== "invalid") {
      console.error(
        "FAIL: Empty references array was not rejected.",
      );
      passed = false;
    }

    // 14. Distinction between INVALID and NOT_SUPPORTED
    //     (VAULT target)
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

    const vaultContract: OSIntegrationContract = {
      id: "CONTRACT-VAULT-001",
      sourceModule: "SIGNAL",
      targetModule: "VAULT",
      sourceRecordType: "observation",
      targetRecordType: "VaultRecord",
      purpose: "Vault integration mock",
      requiredReferences: ["obs_89412a"],
      metadata: {},
    };

    const canonicalVaultHandoff =
      osIntegrationRuntime.resolveEventAndPrepare(
        eventMap.get("EVT-001")!,
      ).handoffs[0];

    const canonicalVaultPackage =
      osContextHandoffRuntime.prepareContextHandoff(
        canonicalVaultHandoff,
      ).package!;

    const vaultPkg = {
      ...canonicalVaultPackage,
      targetModule: "VAULT" as const,
      targetRecordType: "VaultRecord",
      contractId: "CONTRACT-VAULT-001",
      references: [vaultRef],
    };

    const vaultHandoffRuntime =
      new OSModuleHandoffRuntime(
        osModuleHandoffAdapterRegistry,
        [vaultRef],
      );

    const notSupportedHandoffRes =
      vaultHandoffRuntime.prepareModuleHandoff(
        vaultPkg,
      );

    if (notSupportedHandoffRes.status !== "not_supported") {
      console.error(
        "FAIL: Setup error - handoff result status is not not_supported.",
        notSupportedHandoffRes,
      );
      passed = false;
    }

    const vaultSafetyValidator =
      new OSRuntimeSafetyValidator(
        [vaultRef],
        [vaultContract],
      );

    const resNotSupportedSafety =
      vaultSafetyValidator.validateHandoff(
        notSupportedHandoffRes,
      );

    if (
      resNotSupportedSafety.status !== "valid" ||
      resNotSupportedSafety.metadata.adapterSupported !== false
    ) {
      console.error(
        "FAIL: Structurally valid not_supported handoff was incorrectly rejected by safety validator.",
        resNotSupportedSafety,
      );
      passed = false;
    }

    // 15. Immutability
    const originalHandoffRes =
      getPreparedHandoffResult("EVT-001");

    const inputSnapshot =
      JSON.stringify(originalHandoffRes);

    const safetyOutput =
      osRuntimeSafetyValidator.validateHandoff(
        originalHandoffRes,
      );

    if (
      JSON.stringify(originalHandoffRes) !== inputSnapshot
    ) {
      console.error(
        "FAIL: Input handoff result object was mutated.",
      );
      passed = false;
    }

    if (safetyOutput.handoffResult?.package) {
      safetyOutput.handoffResult.package.contractId =
        "MUTATED";

      const revalidated =
        osRuntimeSafetyValidator.validateHandoff(
          originalHandoffRes,
        );

      if (revalidated.contractId === "MUTATED") {
        console.error(
          "FAIL: Output mutation leaked into original context object.",
        );
        passed = false;
      }
    }

    // 16. Determinism
    const runA = JSON.stringify(
      osRuntimeSafetyValidator.validateHandoff(
        originalHandoffRes,
      ),
    );

    const runB = JSON.stringify(
      osRuntimeSafetyValidator.validateHandoff(
        originalHandoffRes,
      ),
    );

    if (runA !== runB) {
      console.error(
        "FAIL: Safety validation is non-deterministic.",
      );
      passed = false;
    }

    // 17. Outer targetModule mismatch
    const baseRes17 =
      getPreparedHandoffResult("EVT-001");

    const mismatchOuterTarget: OSModuleHandoffResult = {
      ...baseRes17,
      targetModule: "VAULT" as unknown as "AI",
    };

    const resOuterTargetMismatch =
      osRuntimeSafetyValidator.validateHandoff(
        mismatchOuterTarget,
      );

    if (resOuterTargetMismatch.status !== "invalid") {
      console.error(
        "FAIL: Outer targetModule mismatch was not rejected.",
      );
      passed = false;
    }

    // 18. Outer targetRecordType mismatch
    const baseRes18 =
      getPreparedHandoffResult("EVT-001");

    const mismatchOuterRecordType: OSModuleHandoffResult = {
      ...baseRes18,
      targetRecordType: "CustomRecordType",
    };

    const resOuterRecordTypeMismatch =
      osRuntimeSafetyValidator.validateHandoff(
        mismatchOuterRecordType,
      );

    if (resOuterRecordTypeMismatch.status !== "invalid") {
      console.error(
        "FAIL: Outer targetRecordType mismatch was not rejected.",
      );
      passed = false;
    }

    // 19. Outer sourceRecordId mismatch
    const baseRes19 =
      getPreparedHandoffResult("EVT-001");

    const mismatchOuterSourceId: OSModuleHandoffResult = {
      ...baseRes19,
      sourceRecordId: "OBS-MISMATCH-999",
    };

    const resOuterSourceIdMismatch =
      osRuntimeSafetyValidator.validateHandoff(
        mismatchOuterSourceId,
      );

    if (resOuterSourceIdMismatch.status !== "invalid") {
      console.error(
        "FAIL: Outer sourceRecordId mismatch was not rejected.",
      );
      passed = false;
    }

    // 20. Outer contractId mismatch
    const baseRes20 =
      getPreparedHandoffResult("EVT-001");

    const mismatchOuterContractId: OSModuleHandoffResult = {
      ...baseRes20,
      contractId: "CONTRACT-999",
    };

    const resOuterContractIdMismatch =
      osRuntimeSafetyValidator.validateHandoff(
        mismatchOuterContractId,
      );

    if (resOuterContractIdMismatch.status !== "invalid") {
      console.error(
        "FAIL: Outer contractId mismatch was not rejected.",
      );
      passed = false;
    }

    expect(passed).toBe(true);
  });
});