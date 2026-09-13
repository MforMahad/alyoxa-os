import React from 'react';
import OSConstellation from '@/components/os/OSConstellation';

export default function ConstellationSection() {
  return (
    <section 
      className="relative w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-26 py-20 border-b border-[var(--border)] overflow-hidden"
      aria-label="ALYOXA OS System Architecture"
    >
      {/* Structural Vertical Reference Guides */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-40" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-25 hidden sm:block" />

      <div className="max-w-8xl mx-auto relative z-10">
        
        {/* Section Identifier Metadata Bar */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--muted)] pb-8 mb-12 sm:mb-16 border-b border-[var(--border)]">
          <span>04 // SYSTEM ARCHITECTURE</span>
          <span className="hidden sm:inline-block">ONE SYSTEM. FIVE LAYERS.</span>
        </div>

        {/* Editorial Heading Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-16">
          
          <div className="lg:col-span-8 pl-4 sm:pl-6 md:pl-8 border-l border-[var(--primary)]">
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] sm:leading-[1.0] text-[var(--foreground)] font-sans">
              ONE SYSTEM.<br />
              <span className="font-normal italic text-[var(--primary)] mt-2 sm:mt-3 block">
                FIVE INTERCONNECTED LAYERS.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-start lg:pl-8 lg:border-l lg:border-[var(--border)] space-y-6 pt-2">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] block">
              // LAYER ARCHITECTURE
            </span>
            <ul className="space-y-2.5 text-xs sm:text-sm font-mono text-[var(--muted)]">
              <li className="flex items-center gap-3"><span className="text-[var(--primary)]">01</span> <strong className="text-[var(--foreground)] font-normal">Signal</strong> observes.</li>
              <li className="flex items-center gap-3"><span className="text-[var(--primary)]">02</span> <strong className="text-[var(--foreground)] font-normal">AI</strong> interprets and decides.</li>
              <li className="flex items-center gap-3"><span className="text-[var(--primary)]">03</span> <strong className="text-[var(--foreground)] font-normal">Forge</strong> executes.</li>
              <li className="flex items-center gap-3"><span className="text-[var(--primary)]">04</span> <strong className="text-[var(--foreground)] font-normal">Pulse</strong> communicates.</li>
              <li className="flex items-center gap-3"><span className="text-[var(--primary)]">05</span> <strong className="text-[var(--foreground)] font-normal">Vault</strong> remembers.</li>
            </ul>
          </div>

        </div>

        {/* Visual Centerpiece: Premium Architectural System Plate */}
        <div className="pt-8 border-t border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--muted)]">
              // ARCHITECTURAL TOPOLOGY
            </span>
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-[var(--muted)] opacity-75">
              CANONICAL ORCHESTRATION GRAPH
            </span>
          </div>
          
          <div className="relative w-full py-4 sm:py-8">
            
            {/* Top Row Contextual Editorial Annotations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 justify-between gap-8 mb-4 max-w-6xl mx-auto px-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="w-12 h-[1px] bg-[var(--primary)] mb-2" />
                <span className="text-[var(--primary)] font-bold tracking-wider uppercase text-[10px] block">SIGNAL // 01</span>
                <p className="text-[var(--muted)] leading-relaxed text-[11px] sm:text-xs">Detect signals across your ecosystem.</p>
              </div>
              <div className="space-y-1 sm:text-right">
                <div className="w-12 h-[1px] bg-[var(--primary)] mb-2 sm:ml-auto" />
                <span className="text-[var(--primary)] font-bold tracking-wider uppercase text-[10px] block">FORGE // 03</span>
                <p className="text-[var(--muted)] leading-relaxed text-[11px] sm:text-xs">Turn decisions into action.</p>
              </div>
            </div>

            {/* Main Dominant Constellation Display */}
            <div className="w-full max-w-6xl mx-auto">
              <OSConstellation className="w-full h-auto min-h-[420px] sm:min-h-[540px] lg:min-h-[640px]" />
            </div>

            {/* Bottom Row Contextual Editorial Annotations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 justify-between gap-8 mt-4 max-w-6xl mx-auto px-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="w-12 h-[1px] bg-[var(--primary)] mb-2" />
                <span className="text-[var(--primary)] font-bold tracking-wider uppercase text-[10px] block">VAULT // 05</span>
                <p className="text-[var(--muted)] leading-relaxed text-[11px] sm:text-xs">Preserve what the system learns.</p>
              </div>
              <div className="space-y-1 sm:text-right">
                <div className="w-12 h-[1px] bg-[var(--primary)] mb-2 sm:ml-auto" />
                <span className="text-[var(--primary)] font-bold tracking-wider uppercase text-[10px] block">PULSE // 04</span>
                <p className="text-[var(--muted)] leading-relaxed text-[11px] sm:text-xs">Keep teams and systems in sync.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}