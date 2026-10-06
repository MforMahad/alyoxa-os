'use client';

import { useState } from 'react';
import EditorialButton from '../cta/EditorialButton';
import AlyoxaField from './AlyoxaField';

export default function HeroSection() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const layers = [
    { name: 'Signal', desc: 'Real-time telemetry and event ingestion' },
    { name: 'AI', desc: 'Autonomous intelligence and decision routing' },
    { name: 'Forge', desc: 'Contract-driven code and schema generation' },
    { name: 'Pulse', desc: 'Workflow automation and state synchronization' },
    { name: 'Vault', desc: 'Encrypted multi-tenant record persistence' },
  ];

  return (
    <section className="relative min-h-screen w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-24 pt-8 sm:pt-12 pb-16  flex flex-col justify-between border-b border-[var(--border)] overflow-hidden">
      
      {/* Background Architectural Field */}
      <AlyoxaField />

      {/* Top Editorial Metadata Bar */}
      <div className="hidden sm:flex w-full flex-col sm:flex-row justify-between items-start sm:items-center text-[9px] sm:text-[10px] font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase text-[var(--muted)] pb-6 sm:pb-8 border-b border-[var(--border)] gap-2 sm:gap-4 relative z-10">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span>// ALYOXA OS — ARCHITECTURAL MANIFESTO</span>
          <span className="hidden md:inline-block text-[var(--border)]">|</span>
          <span className="hidden md:inline-block">UNIFIED BUSINESS SYSTEM</span>
        </div>
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6">
          <span className="text-[var(--primary)] font-semibold">CORE ARCHITECTURE</span>
        </div>
      </div>

      {/* Structural Cyprus Axis Grid Overlay */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-50 sm:opacity-65 z-10" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-20 lg:opacity-40 hidden sm:block z-10" />

      {/* Main Asymmetric Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-8 my-auto py-10 sm:py-16 relative z-10 items-start">
        
        {/* Left Column: Massive Editorial Typography */}
        <div className="lg:col-span-8 flex flex-col items-start pl-3 sm:pl-4 md:pl-8 border-l border-[var(--primary)]">
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-[var(--primary)] font-semibold">
              ALYOXA OS — UNIFIED SYSTEM
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[1.0] sm:leading-[0.95] mb-6 sm:mb-8 font-sans text-[var(--foreground)] break-words">
            BUSINESS <br />
            HAS BECOME <br />
            <span className="font-normal italic text-[var(--primary)]">TOO FRAGMENTED.</span>
          </h1>

          <div className="max-w-xl text-sm sm:text-base lg:text-lg text-[var(--muted)] font-normal leading-relaxed tracking-wide space-y-4">
            <p>
              Scattered tools, broken context, and disconnected workflows create organizational friction. 
              ALYOXA OS replaces tool proliferation with a single unified architectural runtime.
            </p>
          </div>
        </div>

        {/* Right Column: System Specification with Interactive Layer Inspection */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full pt-2 sm:pt-4 lg:pt-2 space-y-8 sm:space-y-12 lg:border-l lg:border-[var(--border)] lg:pl-10">
          
          <div className="space-y-4 sm:space-y-6">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
              // SYSTEM MANIFEST
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight text-[var(--foreground)] leading-snug">
              ONE SYSTEM. <br />
              <span className="text-[var(--primary)] font-normal italic">FIVE LAYERS.</span>
            </div>
            
            {/* Interactive Layer List replacing static text */}
            <div className="pt-2 flex flex-col space-y-2">
              <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--muted)] mb-1">
                // INSPECT RUNTIME LAYERS
              </p>
              <div className="flex flex-wrap gap-1.5">
                {layers.map((l) => (
                  <button
                    key={l.name}
                    onMouseEnter={() => setActiveLayer(l.name)}
                    onMouseLeave={() => setActiveLayer(null)}
                    className={`font-mono text-xs px-2.5 py-1 border transition-all cursor-pointer ${
                      activeLayer === l.name
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--background)] font-medium'
                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>

              {/* Dynamic Layer Description Display */}
              <div className="min-h-[36px] pt-2">
                {activeLayer ? (
                  <p className="text-xs font-mono text-[var(--primary)] animate-in fade-in duration-150">
                    → {layers.find((l) => l.name === activeLayer)?.desc}
                  </p>
                ) : (
                  <p className="text-[11px] font-mono text-[var(--muted)] tracking-wider uppercase">
                    Hover a layer to inspect core runtime capability.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Entrance CTA Area */}
          <div className="pt-6 border-t border-[var(--border)] flex flex-col items-start gap-4 w-full">
            <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted)]">
              PROCEED TO CORE RUNTIME
            </span>
            <div className="w-full sm:w-auto">
              <EditorialButton 
                href="/app" 
                label="ENTER ALYOXA OS" 
                variant="primary" 
                showArrow={true}
                className="w-full sm:w-auto justify-center sm:justify-between"
              />
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Editorial Register */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center text-[9px] sm:text-[10px] font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[var(--muted)] pt-6 sm:pt-8 border-t border-[var(--border)] gap-3 sm:gap-4 relative z-10">
        <div>
          <span>MODEL: CONTRACT-DRIVEN RUNTIME</span>
        </div>
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6">
          <span>// SCROLL FOR SYSTEM SPECIFICATION</span>
          <span className="text-[var(--foreground)]">SYSTEM OVERVIEW</span>
        </div>
      </div>
    </section>
  );
}