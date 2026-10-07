"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { connectWebsiteSource } from "@/actions/signal/connectWebsiteSource";
import { getLatestWebsiteScanStatus } from "@/actions/signal/getLatestWebsiteScanStatus";
import { getWebsiteScanStatus } from "@/actions/signal/getWebsiteScanStatus";
import { updateWorkspaceWebsite } from "@/actions/workspaces/updateWorkspaceWebsite";
import {
  canStartWebsiteAnalysis,
  createSingleFlightRequest,
  createSingleFlightRequestByKey,
  createSubmissionLock,
  getActiveTrackedWebsiteScans,
  getTrackedWebsiteScan,
  getOverviewScanStatusLabel,
  isActiveWebsiteScanStatus,
  normalizeWebsiteDomain,
  startRecursivePolling,
  toOverviewScanStatus,
  type OverviewScanStatus,
  type TrackedWebsiteScan,
} from "@/lib/os/signal/overviewScanStatus";

import { useWorkspace } from "./WorkspaceProvider";

export default function WorkspaceSignalEntry() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const [websiteUrl, setWebsiteUrl] = useState(workspace?.website_url ?? "");
  const [savedUrl, setSavedUrl] = useState(workspace?.website_url ?? "");
  const [saving, setSaving] = useState(false);
  const [scansByDomain, setScansByDomain] = useState<
    Record<string, TrackedWebsiteScan>
  >({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requestLatestStatus] = useState(() =>
    createSingleFlightRequest(getLatestWebsiteScanStatus)
  );
  const [requestLatestStatusByDomain] = useState(() =>
    createSingleFlightRequestByKey(getLatestWebsiteScanStatus)
  );
  const [requestScanStatus] = useState(() =>
    createSingleFlightRequestByKey(getWebsiteScanStatus)
  );
  const [submissionLock] = useState(() => createSubmissionLock());

  const inputDomain = normalizeWebsiteDomain(websiteUrl);
  const currentScan = getTrackedWebsiteScan(scansByDomain, inputDomain);
  const signalStatus: OverviewScanStatus = currentScan?.status ?? "waiting";
  const canViewAi = signalStatus === "completed";
  const isActiveForInput = Boolean(
    currentScan &&
      !canStartWebsiteAnalysis(
        inputDomain,
        currentScan.websiteDomain,
        currentScan.status
      )
  );
  const activeScans = getActiveTrackedWebsiteScans(scansByDomain);
  const otherActiveScans = activeScans.filter(
    (scan) => scan.websiteDomain !== inputDomain
  );
  const activeScanKey = activeScans
    .map((scan) => `${scan.websiteDomain}:${scan.id}`)
    .sort()
    .join("|");

  const isConfigured = Boolean(savedUrl);
  const websiteWasEdited = websiteUrl.trim() !== savedUrl.trim();
  const websiteLabel = useMemo(() => {
    if (!savedUrl) return "No source connected";
    try {
      return new URL(savedUrl).hostname;
    } catch {
      return savedUrl;
    }
  }, [savedUrl]);

  // The website URL input is seeded from `workspace?.website_url` via
  // useState, which only runs on this component's first mount. If the
  // active workspace changes (switching workspaces, or a stale/previous
  // workspace resolving before the correct one) while this component
  // instance stays mounted, that initial value goes stale and the input
  // keeps showing the old workspace's URL.
  //
  // This is intentionally NOT a useEffect: React's documented pattern
  // for "reset/derive state when a prop changes" is to compare against
  // the previous value during render and call setState conditionally,
  // rather than in an effect body (which the project's
  // react-hooks/set-state-in-effect lint rule also enforces, since an
  // effect-based reset here would cost an extra render pass for no
  // benefit). This does not touch `scansByDomain`, which remains keyed
  // by domain independently of which workspace is currently active.
  const workspaceSyncKey = `${workspace?.id ?? ""}:${workspace?.website_url ?? ""}`;
  const [syncedWorkspaceKey, setSyncedWorkspaceKey] = useState(workspaceSyncKey);
  if (workspaceSyncKey !== syncedWorkspaceKey) {
    setSyncedWorkspaceKey(workspaceSyncKey);
    setWebsiteUrl(workspace?.website_url ?? "");
    setSavedUrl(workspace?.website_url ?? "");
  }

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    async function restorePrimaryWebsiteScan() {
      try {
        const result = await requestLatestStatus();
        if (cancelled) return;

        if (!result.success) {
          const domain = normalizeWebsiteDomain(workspace?.website_url ?? "");
          if (domain) {
            setScansByDomain((current) => ({
              ...current,
              [domain]: {
                id: "",
                websiteDomain: domain,
                status: "unavailable",
                errorMessage: result.error,
              },
            }));
          }
          return;
        }

        const restoredScan = result.data;
        if (restoredScan) {
          setScansByDomain((current) => ({
            ...current,
            [restoredScan.website_domain]: {
              id: restoredScan.id,
              websiteDomain: restoredScan.website_domain,
              status: toOverviewScanStatus(restoredScan.status),
              errorMessage: restoredScan.error_message,
            },
          }));
        }
      } catch {
        if (cancelled) return;
        const domain = normalizeWebsiteDomain(workspace?.website_url ?? "");
        if (domain) {
          setScansByDomain((current) => ({
            ...current,
            [domain]: {
              id: "",
              websiteDomain: domain,
              status: "unavailable",
              errorMessage: "Unable to load website analysis status.",
            },
          }));
        }
      }
    }

    void restorePrimaryWebsiteScan();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, workspace?.website_url, requestLatestStatus]);

  useEffect(() => {
    const scans = getActiveTrackedWebsiteScans(scansByDomain);

    if (scans.length === 0) return;

    return startRecursivePolling({
      intervalMs: 5000,
      poll: () =>
        Promise.all(
          scans.map(async (scan) => ({
            websiteDomain: scan.websiteDomain,
            result: await requestScanStatus(scan.id),
          }))
        ),
      shouldContinue: (results) =>
        results.some(
          ({ result }) =>
            result.success &&
            result.data !== null &&
            isActiveWebsiteScanStatus(toOverviewScanStatus(result.data.status))
        ),
      onResult: (results) => {
        setScansByDomain((current) => {
          const next = { ...current };

          for (const { websiteDomain, result } of results) {
            if (!result.success) {
              next[websiteDomain] = {
                ...(current[websiteDomain] ?? {
                  id: "",
                  websiteDomain,
                  status: "unavailable" as const,
                  errorMessage: null,
                }),
                status: "unavailable",
                errorMessage: result.error,
              };
            } else if (result.data) {
              next[websiteDomain] = {
                id: result.data.id,
                websiteDomain,
                status: toOverviewScanStatus(result.data.status),
                errorMessage: result.data.error_message,
              };
            } else {
              next[websiteDomain] = {
                ...(current[websiteDomain] ?? {
                  id: "",
                  websiteDomain,
                  status: "unavailable" as const,
                  errorMessage: null,
                }),
                status: "unavailable",
                errorMessage: "This scan is no longer available.",
              };
            }
          }

          return next;
        });
      },
      onError: () => {
        setScansByDomain((current) => {
          const next = { ...current };

          for (const scan of scans) {
            next[scan.websiteDomain] = {
              ...scan,
              status: "unavailable",
              errorMessage: "Unable to refresh website analysis status.",
            };
          }

          return next;
        });
      },
    });

    // activeScanKey represents the complete set of active domain/scan IDs.
    // Polling must not restart on every scansByDomain status update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScanKey, requestScanStatus]);

  async function restoreWebsiteDomainStatus(domain: string | null) {
    if (!domain) return;

    try {
      const result = await requestLatestStatusByDomain(domain);
      if (!result.success) {
        setScansByDomain((current) => ({
          ...current,
          [domain]: {
            id: current[domain]?.id ?? "",
            websiteDomain: domain,
            status: "unavailable",
            errorMessage: result.error,
          },
        }));
        return;
      }

      const scan = result.data;
      if (scan) {
        setScansByDomain((current) => ({
          ...current,
          [scan.website_domain]: {
            id: scan.id,
            websiteDomain: scan.website_domain,
            status: toOverviewScanStatus(scan.status),
            errorMessage: scan.error_message,
          },
        }));
      }
    } catch {
      setScansByDomain((current) => ({
        ...current,
        [domain]: {
          id: current[domain]?.id ?? "",
          websiteDomain: domain,
          status: "unavailable",
          errorMessage: "Unable to load website analysis status.",
        },
      }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || isActiveForInput || !submissionLock.acquire()) return;

    if (!workspace) {
      submissionLock.release();
      setError("No active workspace is available.");
      return;
    }

    const submittedDomain = normalizeWebsiteDomain(websiteUrl);
    if (!submittedDomain) {
      submissionLock.release();
      setError("Enter a valid HTTP or HTTPS website URL.");
      return;
    }

    if (
      !canStartWebsiteAnalysis(
        submittedDomain,
        currentScan?.websiteDomain ?? null,
        currentScan?.status ?? null
      )
    ) {
      submissionLock.release();
      setError("Analysis is already in progress for this website.");
      return;
    }

    setMessage("");
    setError("");
    setSaving(true);

    try {
      const updateResult = await updateWorkspaceWebsite({
        workspaceId: workspace.id,
        websiteUrl: websiteUrl.trim(),
      });

      if (!updateResult.success) {
        setError(updateResult.error);
        return;
      }

      setWebsiteUrl(updateResult.data.website_url);
      setSavedUrl(updateResult.data.website_url);
      setMessage("Website saved. Starting analysis...");

      const connectResult = await connectWebsiteSource({
        workspaceId: workspace.id,
      });
      if (!connectResult.success) {
        setError(connectResult.error);
        setMessage("");
        return;
      }

      const resultDomain = normalizeWebsiteDomain(
        updateResult.data.website_url
      );
      if (!resultDomain) {
        setError("The saved website URL could not be resolved.");
        return;
      }

      const currentScan = {
        id: connectResult.data.scan.id,
        websiteDomain: resultDomain,
        status: toOverviewScanStatus(connectResult.data.scan.status),
        errorMessage: null,
      };
      setScansByDomain((current) => ({
        ...current,
        [resultDomain]: currentScan,
      }));
      setMessage(
        connectResult.data.scan.reused
          ? `An active analysis for ${resultDomain} is already in progress.`
          : `Analysis started for ${resultDomain}.`
      );

      try {
        const statusResult = await requestScanStatus(currentScan.id);
        const exactScan = statusResult.success ? statusResult.data : null;
        if (exactScan) {
          setScansByDomain((current) => ({
            ...current,
            [resultDomain]: {
              id: exactScan.id,
              websiteDomain: resultDomain,
              status: toOverviewScanStatus(exactScan.status),
              errorMessage: exactScan.error_message,
            },
          }));
        } else if (!statusResult.success) {
          setScansByDomain((current) => ({
            ...current,
            [resultDomain]: {
              ...currentScan,
              status: "unavailable",
              errorMessage: statusResult.error,
            },
          }));
        }
      } catch {
        setScansByDomain((current) => ({
          ...current,
          [resultDomain]: {
            ...currentScan,
            status: "unavailable",
            errorMessage: "Unable to refresh website analysis status.",
          },
        }));
      }
    } catch {
      setError(
        "Something went wrong while connecting the website. Please try again."
      );
      setMessage("");
    } finally {
      submissionLock.release();
      setSaving(false);
    }
  }

  function openAiAnalysis() {
    router.push("/app/ai");
  }

  const scanStage =
    signalStatus === "queued"
      ? { title: "ANALYSIS QUEUED", detail: "Waiting for Signal processor..." }
      : signalStatus === "processing"
      ? {
          title: "ANALYZING WEBSITE",
          detail: "Signal is examining the source...",
        }
      : signalStatus === "completed"
      ? { title: "ANALYSIS COMPLETE", detail: "" }
      : signalStatus === "failed"
      ? { title: "ANALYSIS FAILED", detail: currentScan?.errorMessage ?? "" }
      : signalStatus === "unavailable"
      ? { title: "STATUS UNAVAILABLE", detail: currentScan?.errorMessage ?? "" }
      : null;

  const actionLabel = saving
    ? "STARTING ANALYSIS..."
    : signalStatus === "queued"
    ? "ANALYSIS QUEUED..."
    : signalStatus === "processing"
    ? "ANALYZING..."
    : canViewAi
    ? "VIEW AI ANALYSIS ↗"
    : signalStatus === "failed"
    ? "TRY AGAIN ↗"
    : websiteWasEdited || !isConfigured
    ? "ANALYZE WEBSITE ↗"
    : "UPDATE ↗";

  if (!workspace) return null;

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)]/30">
      <div className="grid lg:grid-cols-[0.42fr_0.58fr]">
        <div className="border-b border-[var(--border)] p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-[var(--primary)] uppercase">
              Signal / 01
            </span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase">
              Primary source
            </span>
          </div>
          <h2 className="mt-6 max-w-lg font-mono text-2xl font-bold leading-[1] tracking-[-0.04em] uppercase sm:text-3xl">
            Give ALYOXA something to understand.
          </h2>
          <p className="mt-5 max-w-lg font-mono text-xs leading-6 text-[var(--muted)]">
            Connect the website that represents this workspace. It becomes
            Signal&apos;s first external source of context.
          </p>
          <div className="mt-8 border-t border-[var(--border)] pt-4">
            <div className="font-mono text-[9px] tracking-[0.14em] text-[var(--muted)] uppercase">
              Workspace
            </div>
            <div className="mt-2 truncate font-mono text-sm font-semibold">
              {workspace.name}
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
              Primary website
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] uppercase">
              <span
                className={`h-1.5 w-1.5 ${
                  isConfigured ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
                }`}
              />
              {isConfigured ? "Connected" : "Not connected"}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="workspace-website"
                  className="mb-2 block font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase"
                >
                  Website URL
                </label>
                <input
                  id="workspace-website"
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => {
                    setWebsiteUrl(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  onBlur={() => void restoreWebsiteDomainStatus(inputDomain)}
                  placeholder="https://yourcompany.com"
                  maxLength={2048}
                  disabled={saving}
                  autoComplete="off"
                  className="w-full bg-transparent font-mono text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:opacity-50 sm:text-lg"
                />
              </div>

              <button
                type={canViewAi ? "button" : "submit"}
                onClick={canViewAi ? openAiAnalysis : undefined}
                disabled={
                  saving ||
                  isActiveForInput ||
                  (!canViewAi && !websiteUrl.trim())
                }
                className="shrink-0 bg-[var(--primary)] px-5 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-[var(--background)] uppercase transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLabel}
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-4 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-xs leading-5 text-[var(--foreground)]"
              >
                {error}
              </div>
            ) : null}
            {message ? (
              <div
                role="status"
                className="mt-4 border border-[var(--primary)]/30 bg-[var(--surface)] px-4 py-3 font-mono text-xs leading-5 text-[var(--foreground)]"
              >
                {message}
              </div>
            ) : null}

            {otherActiveScans.map((scan) => (
              <div
                key={scan.id}
                role="status"
                className="mt-4 border border-[var(--signal)]/30 bg-[var(--surface)]/30 p-3 font-mono"
              >
                <div className="text-[10px] font-bold tracking-[0.12em] text-[var(--signal)] uppercase">
                  ANALYSIS IN PROGRESS — {scan.websiteDomain}
                </div>
                <div className="mt-1 text-[10px] text-[var(--muted)]">
                  This scan continues while you analyze another website.
                </div>
              </div>
            ))}

            {scanStage && signalStatus !== "waiting" ? (
              <div
                aria-live="polite"
                className="mt-4 border border-[var(--signal)]/30 bg-[var(--surface)]/30 p-4 font-mono"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-bold tracking-[0.14em] text-[var(--signal)] uppercase">
                    {scanStage.title}
                  </span>
                  {currentScan?.id ? (
                    <span className="truncate text-[9px] text-[var(--muted)]">
                      SCAN {currentScan.id}
                    </span>
                  ) : null}
                </div>
                {scanStage.detail ? (
                  <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
                    {scanStage.detail}
                  </p>
                ) : null}
                {isActiveWebsiteScanStatus(signalStatus) ? (
                  <div className="mt-3 h-px w-full overflow-hidden bg-[var(--border)]">
                    <div className="h-full w-full animate-pulse bg-[var(--signal)]/70" />
                  </div>
                ) : null}
              </div>
            ) : null}
            {canViewAi ? (
              <button
                type="submit"
                disabled={saving || !websiteUrl.trim()}
                className="mt-3 border border-[var(--border)] px-5 py-2 font-mono text-[9px] font-bold tracking-[0.12em] text-[var(--muted)] uppercase transition-colors hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ANALYZE AGAIN
              </button>
            ) : null}
          </form>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border border-[var(--border)] p-4">
              <div className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase">
                Source
              </div>
              <div className="mt-2 truncate font-mono text-xs font-bold uppercase">
                {isConfigured ? websiteLabel : "Website"}
              </div>
            </div>
            <div className="border border-[var(--border)] p-4">
              <div className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase">
                Signal status
              </div>
              <div className="mt-2 flex items-center gap-2 font-mono text-xs font-bold uppercase">
                <span
                  className={`h-1.5 w-1.5 ${
                    signalStatus === "waiting"
                      ? "bg-[var(--muted)]"
                      : signalStatus === "unavailable" ||
                        signalStatus === "failed"
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--signal)]"
                  }`}
                />
                {getOverviewScanStatusLabel(signalStatus)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
