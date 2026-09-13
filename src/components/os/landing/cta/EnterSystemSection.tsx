import Link from 'next/link';

export default function EnterSystemSection() {
  return (
    <section 
      className="relative w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-26 py-20 border-b border-[var(--border)] overflow-hidden"
      aria-label="ALYOXA OS Final Entrance"
    >
      {/* Structural Vertical Reference Guides */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-40" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-25 hidden sm:block" />

      <div className="max-w-8xl mx-auto relative z-10">
        
        {/* Section Identifier Metadata Bar */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--muted)] pb-8 mb-16 sm:mb-20 border-b border-[var(--border)]">
          <span>07 // ENTER THE SYSTEM</span>
          <span className="hidden sm:inline-block">FINAL ENTRANCE</span>
        </div>

        {/* Asymmetric Editorial Entrance Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Dominant Architectural Statement */}
          <div className="lg:col-span-7 pl-4 sm:pl-6 md:pl-8 border-l-2 border-[var(--primary)]">
            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[0.98] text-[var(--foreground)] font-sans">
              THE SYSTEM IS READY.<br />
              <span className="font-normal italic text-[var(--primary)] mt-3 block">
                ENTER WHEN YOU ARE.
              </span>
            </h2>
          </div>

          {/* Right Column: Supporting Paragraph, CTA, & Metadata */}
          <div className="lg:col-span-5 flex flex-col justify-start lg:pl-8 lg:border-l lg:border-[var(--border)] space-y-10 pt-4">
            
            {/* Supporting Description */}
            <div className="space-y-4">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--primary)] block">
                // CONTINUOUS ENVIRONMENT
              </span>
              <p className="text-sm sm:text-base font-sans text-[var(--muted)] leading-relaxed">
                ALYOXA OS brings observation, intelligence, execution, communication, and memory into one continuous operating environment.
              </p>
            </div>

            {/* Architectural Entrance CTA */}
            <div className="pt-4">
              <Link 
                href="/app"
                className="group relative inline-flex items-center justify-between w-full sm:w-auto px-8 py-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] transition-all duration-200"
              >
                <span className="font-mono text-xs tracking-[0.25em] uppercase font-medium">
                  ENTER ALYOXA OS
                </span>
                <span className="ml-6 font-mono text-[var(--primary)] text-sm transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1">
                  ↗
                </span>
              </Link>
            </div>

            {/* Supporting System Language */}
            <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--muted)]">
                ONE SYSTEM. FIVE LAYERS.
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--primary)]">
                ALYOXA
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}