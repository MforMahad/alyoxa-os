# OS dashboard UX correction - review record

## Scope
Presentation and client navigation only. No server actions, Supabase schema/RLS, authentication, API handlers, scanner processors, workers, schedules, runtime flags, secrets or dependencies were changed.

## Corrected structure
The shared app layout owns one OSAppShell. Each page and the route loading boundary render content only. The viewport-sized frame contains independent sidebar and main-content scrolling, with a fixed shared header. Sidebar links use client routing; same-page Overview/audit fragments update history without a full-page reload. Anchor scrolling waits for streamed page content. Desktop/mobile use the same navigation definitions and the mobile menu uses a native modal dialog.

## User journey
Overview names saved websites, explains the latest loaded issue evidence, and links to each site's own report. It distinguishes failed checks from website findings and unavailable data. Reports preserve selected website/check query parameters across tabs and do not silently substitute another website's evidence. The Quick Scan results action points at its own scan. Audit history selection is URL-based and pending responses are scoped to both workspace and audit. Audit sections are Summary, Issues & Fixes, Pages Checked and Technical Details.

Tasks, Requests & Approvals and Library retain their existing tab-selected components and inspectors. Their registry-backed content is clearly identified as demonstration records rather than customer activity. Detailed records remain accessible through disclosure. Unimplemented Library views explain their availability instead of implying usable operations.

## Verification
- TypeScript and production build pass.
- Full application suite: 359 tests across 57 suites passed.
- Lint: zero errors; one pre-existing jest.config.js warning.
- git diff --check passed.
- Automated regressions cover active destinations, nested/query routes, single layout ownership of the shell, content-only loading, independent-scroll CSS invariants, unavailable reads, per-website findings, selected result isolation, stale audit responses, and preservation of existing module views.

These structural/server-rendered tests are not a real-browser proof of component persistence, keyboard focus, scroll restoration, responsive visual quality or authenticated production behavior. Interactive desktop/mobile acceptance remains required in the deployed application; the local browser previously failed to render due to its process/GPU environment. No live Supabase or production worker was invoked.

## Browser acceptance
1. Navigate between all existing modules and tabs. Confirm the sidebar/header remain present and only content changes; verify one relevant active destination.
2. Scroll a long report. Confirm only the right content scrolls, while the sidebar has its own scroll when needed.
3. Open Website Audits from another page, switch Quick/Full modes, and use back/forward. Confirm the correct content and highlight, without a document reload.
4. On mobile, open the menu, follow a link, use Escape/close, and resize to desktop. Check keyboard focus and long URLs.
5. Using retained results, select different websites/checks and audit history entries. Confirm no old selection's evidence flashes during loading. Inspect issues, fixes, excluded pages, AI suggestions and technical evidence separately.

## Changed-file inventory
- `docs/os-ui-overhaul.md`
- `src/app/app/ai/page.tsx`
- `src/app/app/forge/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/app/loading.tsx`
- `src/app/app/page.tsx`
- `src/app/app/pulse/page.tsx`
- `src/app/app/signal/page.tsx`
- `src/app/app/vault/page.tsx`
- `src/app/globals.css`
- `src/components/os/OverviewSidebar.tsx`
- `src/components/os/ai/AISubNav.tsx`
- `src/components/os/ai/AIWebsiteResults.tsx`
- `src/components/os/forge/ForgeSubNav.tsx`
- `src/components/os/pulse/PulseSubNav.tsx`
- `src/components/os/shell/ExampleWorkspace.tsx`
- `src/components/os/shell/OSAppShell.tsx`
- `src/components/os/shell/PageTabs.tsx`
- `src/components/os/shell/StatusBadge.tsx`
- `src/components/os/shell/WebsiteOverview.tsx`
- `src/components/os/shell/WorkspaceReadBoundary.tsx`
- `src/components/os/shell/__tests__/experience.test.ts`
- `src/components/os/shell/__tests__/overview.test.ts`
- `src/components/os/shell/navigation.ts`
- `src/components/os/shell/useLocationHash.ts`
- `src/components/os/signal/PersistedSignalWorkspace.tsx`
- `src/components/os/signal/SignalSubNav.tsx`
- `src/components/os/vault/VaultSubNav.tsx`
- `src/components/os/workspace/WebsiteAuditPanel.tsx`
- `src/components/os/workspace/WorkspaceSignalEntry.tsx`
- `src/components/os/workspace/auditViewState.ts`
- `src/lib/os/signal/__tests__/websiteResultGroups.test.ts`
- `src/lib/os/signal/__tests__/websiteWorkspaceBoundary.test.ts`
