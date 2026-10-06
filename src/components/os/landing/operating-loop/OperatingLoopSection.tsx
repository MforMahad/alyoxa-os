import React from 'react';

export const LOOP_STAGES = [
  {
    step: '01',
    name: 'OBSERVE',
    layer: 'Signal',
    action: 'See what is happening.',
    description: 'Detects raw signals, metrics, and state changes across tools before context fractures.',
  },
  {
    step: '02',
    name: 'UNDERSTAND',
    layer: 'AI',
    action: 'Interpret what it means.',
    description: 'Synthesizes observations into unified operational intelligence without manual aggregation.',
  },
  {
    step: '03',
    name: 'DECIDE',
    layer: 'AI',
    action: 'Determine what should happen next.',
    description: 'Forms the next optimal decision aligned with organizational priorities and constraints.',
  },
  {
    step: '04',
    name: 'EXECUTE',
    layer: 'Forge',
    action: 'Turn decisions into action.',
    description: 'Deploys structured tasks and operational directives directly into execution layers.',
  },
  {
    step: '05',
    name: 'REMEMBER',
    layer: 'Vault',
    action: 'Preserve what the system learns.',
    description: 'Secures operational memory, evidence, and historical context back into the core ledger.',
  },
];

export default function OperatingLoopSection() {
  return (
    <section 
      className="relative w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-26 py-20 border-b border-[var(--border)] overflow-hidden"
      aria-label="ALYOXA OS Operating Loop"
    >
      {/* Structural Vertical Reference Guides */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-40" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-25 hidden sm:block" />

      <div className="max-w-8xl mx-auto relative z-10">
        
        {/* Section Identifier Metadata Bar */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--muted)] pb-8 mb-12 sm:mb-16 border-b border-[var(--border)]">
          <span>03 // OPERATING LOOP</span>
          <span className="hidden sm:inline-block">CONTINUOUS CONTEXT FLOW</span>
        </div>

        {/* Editorial Heading Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-20 sm:mb-28">
          
          <div className="lg:col-span-8 pl-4 sm:pl-6 md:pl-8 border-l border-[var(--primary)]">
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] sm:leading-[1.0] text-[var(--foreground)] font-sans">
              THE SYSTEM DOESN&apos;T JUST STORE CONTEXT.<br />
              <span className="font-normal italic text-[var(--primary)] mt-2 sm:mt-3 block">
                IT CARRIES IT FORWARD.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-start lg:pl-8 lg:border-l lg:border-[var(--border)] space-y-6 pt-2">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] block">
              // ARCHITECTURAL PREMISE
            </span>
            <p className="text-sm sm:text-base text-[var(--muted)] font-normal leading-relaxed tracking-wide">
              ALYOXA OS keeps context moving through the organization. Memory loops back into observation, ensuring every action builds upon the last.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--primary)] px-3 py-1.5 border border-[var(--primary)]/30">
                <span>PULSE</span>
                <span className="text-[var(--border)]">/</span>
                <span className="text-[var(--muted)]">Active Communication Layer</span>
              </span>
            </div>
          </div>

        </div>

        {/* The Continuous Operating Loop Architectural Layout */}
        <div className="pt-6 border-t border-[var(--border)]">
          
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--muted)] mb-12">
            // CANONICAL SEQUENCE &amp; SYSTEM LAYERS
          </div>

          {/* 5-Column Editorial Grid for Desktop, 2-Column for Tablet, 1-Column for Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 relative">
            {LOOP_STAGES.map((stage, index) => {
              return (
                <div 
                  key={stage.step}
                  className="flex flex-col justify-between p-6 sm:p-7 border border-[var(--border)] bg-[var(--background)] transition-colors duration-300 hover:border-[var(--primary)] group"
                >
                  <div className="flex items-center justify-between w-full pb-4 mb-6 border-b border-[var(--border)]">
                    <span className="font-mono text-xs tracking-[0.2em] text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">
                      {stage.step}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 border border-[var(--border)] text-[var(--muted)] group-hover:border-[var(--primary)]/40 group-hover:text-[var(--primary)] transition-colors">
                      {stage.layer}
                    </span>
                  </div>

                  <div className="space-y-3 mb-8">
                    <h3 className="font-sans text-xl sm:text-2xl font-normal tracking-tight text-[var(--foreground)]">
                      {stage.name}
                    </h3>
                    <p className="font-mono text-xs text-[var(--primary)] leading-snug tracking-wide">
                      &ldquo;{stage.action}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)]/60 mt-auto">
                    <p className="text-xs sm:text-sm text-[var(--muted)] font-normal leading-relaxed">
                      {stage.description}
                    </p>
                  </div>

                  {index < LOOP_STAGES.length - 1 && (
                    <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Architectural Return Loop Indicator */}
          <div className="mt-12 pt-8 border-t border-[var(--border)]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono text-[var(--muted)] gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[var(--primary)] font-semibold">REMEMBER → OBSERVE</span>
              <span className="text-[var(--border)]">/</span>
              <span>The output of memory feeds the next observation cycle.</span>
            </div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--primary)]">
              CONTINUOUS OPERATIONAL FEEDBACK
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}