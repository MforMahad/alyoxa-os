import React from 'react';

const principlesData = [
  {
    num: '01',
    tag: 'CONTEXT',
    title: 'CONTEXT OVER FRAGMENTATION',
    description: 'Systems should preserve context instead of forcing people to reconstruct it across disconnected tools.',
  },
  {
    num: '02',
    tag: 'INTELLIGENCE',
    title: 'INTELLIGENCE WITH PURPOSE',
    description: 'AI should understand operational context and help determine what happens next — not simply generate text.',
  },
  {
    num: '03',
    tag: 'CONTINUITY',
    title: 'ACTION WITH MEMORY',
    description: 'Execution should not end the process. What happens should become context for what comes next.',
  },
];

export default function PhilosophySection() {
  return (
    <section 
      className="relative w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-26 py-20 border-b border-[var(--border)] overflow-hidden"
      aria-label="ALYOXA OS Philosophy"
    >
      {/* Structural Vertical Reference Guides */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-40" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-25 hidden sm:block" />

      <div className="max-w-8xl mx-auto relative z-10">
        
        {/* Section Identifier Metadata Bar */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--muted)] pb-8 mb-12 sm:mb-16 border-b border-[var(--border)]">
          <span>06 // PHILOSOPHY &amp; MANIFESTO</span>
          <span className="hidden sm:inline-block">THE GOVERNING ETHOS</span>
        </div>

        {/* Editorial Manifest Statement Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-20">
          
          <div className="lg:col-span-8 pl-4 sm:pl-6 md:pl-8 border-l-2 border-[var(--primary)]">
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] sm:leading-[1.0] text-[var(--foreground)] font-sans">
              SOFTWARE SHOULD<br />
              <span className="font-normal italic text-[var(--primary)] mt-2 sm:mt-3 block">
                UNDERSTAND THE WORK.
              </span>
              <span className="mt-4 block text-2xl sm:text-4xl md:text-5xl font-light text-[var(--muted)]">
                NOT JUST DISPLAY IT.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-start lg:pl-8 lg:border-l lg:border-[var(--border)] space-y-6 pt-2">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--primary)] block">
              // CORE MANIFESTO
            </span>
            <p className="text-xs sm:text-sm font-mono text-[var(--muted)] leading-relaxed">
              ALYOXA OS rejects isolated dashboard software. We build continuous systems where intelligence anchors every decision and execution retains memory.
            </p>
          </div>

        </div>

        {/* Striking Multi-Column Editorial Principle Grid (Distinct from Section 05) */}
        <div className="pt-10 border-t border-[var(--border)]">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--muted)] mb-10">
            // THREE PILLARS OF OPERATION
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {principlesData.map((item) => (
              <div 
                key={item.num}
                className="group relative flex flex-col justify-between p-8 sm:p-10 bg-[var(--primary)]/[0.015] border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-300"
              >
                {/* Top Header inside card */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <span className="font-mono text-xs font-bold tracking-[0.2em] text-[var(--primary)]">
                      {item.num} // {item.tag}
                    </span>
                    <span className=" text-[10px] text-[var(--muted)] opacity-50">
                      ALYOXA
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-light tracking-tight text-[var(--foreground)] font-sans leading-snug">
                    {item.title}
                  </h3>
                </div>

                {/* Bottom Description */}
                <div className="mt-12 pt-6 border-t border-[var(--border)]/60">
                  <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed font-sans">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editorial Closing Manifesto Summary */}
        <div className="mt-20 pt-12 border-t border-[var(--border)] max-w-4xl">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--primary)] block mb-3">
            // THE CONTINUITY PROMISE
          </span>
          <p className="text-base sm:text-xl font-light text-[var(--foreground)] font-sans leading-relaxed">
            ALYOXA OS is built around continuity — between what an organization sees, what it understands, what it decides, what it does, and what it remembers.
          </p>
        </div>

      </div>
    </section>
  );
}