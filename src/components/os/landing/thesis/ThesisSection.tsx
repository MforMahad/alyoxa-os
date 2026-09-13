import React from 'react';

export default function ThesisSection() {
  return (
    <section 
      className="relative w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-26 py-20 border-b border-[var(--border)] overflow-hidden"
      aria-label="ALYOXA OS Thesis"
    >
      {/* Structural Vertical Reference Guides */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-40" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-25 hidden sm:block" />

      <div className="max-w-8xl mx-auto relative z-10">
        
        {/* Section Identifier Metadata Bar */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--muted)] pb-8 mb-12 sm:mb-14 border-b border-[var(--border)]">
          <span>02 // THE THESIS</span>
          <span className="hidden sm:inline-block">CONTEXTUAL CONTINUITY</span>
        </div>

        {/* Continuous Editorial Narrative Flow */}
        <div className="space-y-14 sm:space-y-20">
          
          {/* Part 1 & 2: The Core Thesis Statement & Architectural Premise */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Massive Editorial Statement */}
            <div className="lg:col-span-8 pl-4 sm:pl-6 md:pl-8 border-l border-[var(--primary)]">
              <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] sm:leading-[1.0] text-[var(--foreground)] font-sans">
                THE PROBLEM ISN&apos;T THE NUMBER OF TOOLS.<br />
                <span className="font-normal italic text-[var(--primary)] mt-2 sm:mt-3 block">
                  IT&apos;S THE LACK OF CONTEXT BETWEEN THEM.
                </span>
              </h2>
            </div>

            {/* Architectural Premise Elaboration */}
            <div className="lg:col-span-4 flex flex-col justify-start lg:pl-8 lg:border-l lg:border-[var(--border)] space-y-6 pt-2">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] block">
                // ARCHITECTURAL PREMISE
              </span>
              <p className="text-sm sm:text-base text-[var(--muted)] font-normal leading-relaxed tracking-wide">
                ALYOXA OS connects intelligence, execution, communication, and memory into one operating environment — so the organization can move as one system.
              </p>
            </div>

          </div>

          {/* Part 3: Fragmented vs. Unified Conclusion / Proof */}
          <div className="pt-12 sm:pt-14 border-t border-[var(--border)]">
            
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--muted)] mb-10">
              // STRUCTURAL EVOLUTION
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
              
              {/* Current Paradigm: Fragmented */}
              <div className="space-y-6 pl-4 sm:pl-6 border-l border-[var(--border)]">
                <div className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--muted)] font-medium">
                  CURRENT PARADIGM // FRAGMENTED
                </div>
                <div className="space-y-3 font-mono text-xs sm:text-sm text-[var(--muted)]">
                  <p className="flex items-center gap-3">
                    <span className="text-[var(--border)] font-semibold">01</span> Isolated tool inventories
                  </p>
                  <div className="pl-5 text-[var(--border)]">↓</div>
                  <p className="flex items-center gap-3">
                    <span className="text-[var(--border)] font-semibold">02</span> Context fractures across silos
                  </p>
                  <div className="pl-5 text-[var(--border)]">↓</div>
                  <p className="flex items-center gap-3">
                    <span className="text-[var(--border)] font-semibold">03</span> Repetitive manual synthesis
                  </p>
                </div>
              </div>

              {/* Alyoxa Paradigm: Unified */}
              <div className="space-y-6 pl-4 sm:pl-6 border-l border-[var(--primary)]">
                <div className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-medium">
                  ALYOXA PARADIGM // UNIFIED
                </div>
                <div className="space-y-3 font-mono text-xs sm:text-sm text-[var(--foreground)]">
                  <p className="flex items-center gap-3">
                    <span className="text-[var(--primary)] font-semibold">01</span> Shared operational context
                  </p>
                  <div className="pl-5 text-[var(--primary)]">↓</div>
                  <p className="flex items-center gap-3">
                    <span className="text-[var(--primary)] font-semibold">02</span> Connected cross-layer execution
                  </p>
                  <div className="pl-5 text-[var(--primary)]">↓</div>
                  <p className="flex items-center gap-3">
                    <span className="text-[var(--primary)] font-semibold">03</span> Continuous operational memory
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}