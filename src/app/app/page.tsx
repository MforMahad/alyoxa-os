'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationConfig } from '@/data/os/overview';
import OSConstellation from '@/components/os/OSConstellation';
import { nodeChannelsData, systemEventBusData } from '@/data/os/overview';

// ---------------------------------------------------------------------------
// 1. Sidebar Component (Corrected AI Placement: Workspace only, exactly once)
// ---------------------------------------------------------------------------
interface OverviewSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const OverviewSidebar: React.FC<OverviewSidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const pathname = usePathname();

  React.useEffect(() => {
    onCloseMobile?.();
  }, [pathname]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCloseMobile]);

  const sidebarContent = (
    <div className="w-full h-full flex flex-col justify-between bg-[#0B1715] p-4 select-none text-[#F0EDE4] overflow-y-auto">
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#004741]" />
            <span className="font-bold text-xs tracking-[0.2em] text-[#F0EDE4] uppercase font-mono">
              ALYOXA OS
            </span>
          </div>
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-[#596560] hover:text-[#F0EDE4] p-1 border border-white/10"
              aria-label="Close navigation"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary OS Navigation (Workspace - includes AI exactly once) */}
        <nav className="space-y-1">
          <div className="px-2 pb-2 text-[15px] font-bold tracking-widest text-[#d5d7d6] uppercase">
            Workspace
          </div>
          {navigationConfig.primary.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'border-[#004741] text-[#F0EDE4] bg-white/5 font-bold'
                    : 'border-transparent text-[#bcbcbc] hover:text-[#F0EDE4] hover:bg-white/5'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] px-1 py-0.2 bg-[#004741]/20 text-[#f1f1f1] border border-[#004741]/40 font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Secondary OS Navigation (System - AI removed completely) */}
        <nav className="space-y-1 pt-4 border-t border-white/10">
          <div className="px-2 pb-2 text-[15px] font-bold tracking-widest text-[#d5d7d6] uppercase">
            System
          </div>
          {navigationConfig.system.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'border-[#004741] text-[#F0EDE4] bg-white/5 font-bold'
                    : 'border-transparent text-[#bcbcbc] hover:text-[#F0EDE4] hover:bg-white/5'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-2 py-3 border-t border-white/10 text-[10px] font-mono text-[#596560] tracking-wider uppercase">
        ALYOXA // 2026
      </div>
    </div>
  );

  return (
    <>
      <aside className="w-56 h-screen sticky top-0 border-r border-white/10 bg-[#0B1715] select-none z-30 shrink-0 hidden lg:flex flex-col">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[82vw] max-w-xs h-full bg-[#0B1715] border-r border-white/10 shadow-2xl z-10 flex flex-col transform transition-transform duration-300 ease-out">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Header Component
// ---------------------------------------------------------------------------
interface OverviewHeaderProps {
  onOpenMobileMenu?: () => void;
  mobileOpen?: boolean;
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({ onOpenMobileMenu, mobileOpen }) => {
  return (
    <header className="h-12 w-full border-b border-white/10 bg-[#0B1715] px-4 sm:px-6 flex items-center justify-between font-mono text-xs select-none sticky top-0 z-20 text-[#F0EDE4]">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 text-[#F0EDE4] hover:bg-white/5 border border-white/10 transition-colors"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[#596560]">OS //</span>
          <span className="font-bold tracking-wider text-[#F0EDE4]">
            ALYOXA OS
          </span>
        </div>
      </div>
    </header>
  );
};

// ---------------------------------------------------------------------------
// Main Overview Page (Honest read-model language, unclipped aspect-ratio constellation)
// ---------------------------------------------------------------------------
export default function OSOverviewPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      <OverviewSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <OverviewHeader onOpenMobileMenu={() => setMobileOpen(true)} mobileOpen={mobileOpen} />

        <main className="flex-1 p-6 space-y-10 overflow-x-hidden">
          
          {/* 01 — OVERVIEW HEADER */}
          <section className="space-y-1.5 border-b border-[var(--border)] pb-5">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase">
              OVERVIEW
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] uppercase font-mono">
              System Overview
            </h1>
            <p className="text-xs text-[var(--muted)] max-w-2xl font-mono">
              Unified view of activity, intelligence, execution, communication, and memory across ALYOXA OS.
            </p>
          </section>

          {/* 02 — SYSTEM SNAPSHOT */}
          <section className="space-y-3">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase flex items-center justify-between">
              <span>System Snapshot // Five Layers</span>
              <span className="text-[var(--primary)] font-bold">PROTOTYPE READ MODEL</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
              
              {/* SIGNAL */}
              <div className="border border-[var(--border)] bg-[var(--surface)]/30 p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--primary)] tracking-wider">01 // SIGNAL</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                  </div>
                  <div className="text-xs font-bold text-[var(--foreground)] uppercase pt-1">
                    Observations
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Inbound ingestion channels, telemetry feeds, and state categorization.
                </p>
                <div className="pt-2 border-t border-[var(--border)]/60 text-[9px] text-[var(--muted)] flex items-center justify-between">
                  <span>MODEL</span>
                  <span className="text-[var(--foreground)]">SAMPLE</span>
                </div>
              </div>

              {/* AI */}
              <div className="border border-[var(--border)] bg-[var(--surface)]/30 p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--primary)] tracking-wider">02 // AI</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                  </div>
                  <div className="text-xs font-bold text-[var(--foreground)] uppercase pt-1">
                    Contexts
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Reasoning pipelines, automated analysis, and inference runs.
                </p>
                <div className="pt-2 border-t border-[var(--border)]/60 text-[9px] text-[var(--muted)] flex items-center justify-between">
                  <span>MODEL</span>
                  <span className="text-[var(--foreground)]">SAMPLE</span>
                </div>
              </div>

              {/* FORGE */}
              <div className="border border-[var(--border)] bg-[var(--surface)]/30 p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--primary)] tracking-wider">03 // FORGE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                  </div>
                  <div className="text-xs font-bold text-[var(--foreground)] uppercase pt-1">
                    Execution
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Task pipelines, software build outputs, and module deployments.
                </p>
                <div className="pt-2 border-t border-[var(--border)]/60 text-[9px] text-[var(--muted)] flex items-center justify-between">
                  <span>MODEL</span>
                  <span className="text-[var(--foreground)]">SAMPLE</span>
                </div>
              </div>

              {/* PULSE */}
              <div className="border border-[var(--border)] bg-[var(--surface)]/30 p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--primary)] tracking-wider">04 // PULSE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                  </div>
                  <div className="text-xs font-bold text-[var(--foreground)] uppercase pt-1">
                    Threads
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Requests, communication logs, and operational threads.
                </p>
                <div className="pt-2 border-t border-[var(--border)]/60 text-[9px] text-[var(--muted)] flex items-center justify-between">
                  <span>MODEL</span>
                  <span className="text-[var(--foreground)]">SAMPLE</span>
                </div>
              </div>

              {/* VAULT */}
              <div className="border border-[var(--border)] bg-[var(--surface)]/30 p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--primary)] tracking-wider">05 // VAULT</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                  </div>
                  <div className="text-xs font-bold text-[var(--foreground)] uppercase pt-1">
                    Knowledge
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Preserved references, structural documentation, and secure stores.
                </p>
                <div className="pt-2 border-t border-[var(--border)]/60 text-[9px] text-[var(--muted)] flex items-center justify-between">
                  <span>MODEL</span>
                  <span className="text-[var(--foreground)]">SAMPLE</span>
                </div>
              </div>

            </div>
          </section>

          {/* 03 — RECENT OPERATIONAL CONTEXT */}
          <section className="space-y-3">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase">
              Recent Operational Context // Context in Motion
            </div>
            <div className="border border-[var(--border)] bg-[var(--surface)]/20 font-mono text-xs divide-y divide-[var(--border)]">
              {nodeChannelsData.map((channel) => (
                <div key={channel.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`${channel.accentClass} font-bold uppercase tracking-wider`}>
                        {channel.code} // {channel.name}
                      </span>
                      <span className="text-[var(--border)]">→</span>
                      <span className="text-[var(--foreground)] font-medium">Example Context</span>
                    </div>
                    <div className="text-xs text-[var(--foreground)]">
                      Prototype Demonstration Record
                    </div>
                  </div>
                  <div className="text-[10px] text-[var(--muted)] md:text-right max-w-xs">
                    Demonstration fixture data representing cross-module linkage.
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 04 — SYSTEM ARCHITECTURE (Unclipped Aspect-Ratio Container, ~20-25% more compact) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between font-mono text-[10px] text-[var(--muted)] uppercase">
              <span>System Architecture</span>
              <span>One System. Five Layers.</span>
            </div>
            
            <div className="relative border border-[var(--border)] bg-[var(--surface)]/30 overflow-hidden w-full">
              <div className="w-full max-w-4xl mx-auto p-4 md:p-6" style={{ aspectRatio: '1200 / 620' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <OSConstellation />
                </div>
              </div>
            </div>
          </section>

          {/* 05 — RECENT ACTIVITY */}
          <section className="space-y-3">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase">
              Recent Activity // Prototype Activity Log
            </div>

            <div className="border border-[var(--border)] bg-[var(--surface)]/10 font-mono text-xs divide-y divide-[var(--border)]/60">
              {systemEventBusData.map((event) => (
                <div
                  key={event.id}
                  className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-[var(--surface)]/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-[var(--muted)] shrink-0">EXAMPLE_TIMESTAMP</span>
                    <span className="text-[10px] px-1 border border-[var(--border)] shrink-0 text-[var(--muted)]">
                      {event.source}
                    </span>
                    <span className="text-[var(--foreground)]">Demonstration event record for {event.source} module.</span>
                  </div>
                  <span className="text-[10px] md:text-right shrink-0 text-[var(--muted)]">
                    PROTOTYPE
                  </span>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};