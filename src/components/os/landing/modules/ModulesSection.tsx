const modulesData = [
  {
    num: '01',
    id: 'signal',
    title: 'SIGNAL',
    role: 'OBSERVE THE ORGANIZATION.',
    description: 'Captures signals, metrics, changes, and operational observations across connected systems.',
  },
  {
    num: '02',
    id: 'ai',
    title: 'AI',
    role: 'UNDERSTAND AND DECIDE.',
    description: 'Turns observations into context, patterns, insights, and decisions.',
  },
  {
    num: '03',
    id: 'forge',
    title: 'FORGE',
    role: 'EXECUTE WHAT MATTERS.',
    description: 'Transforms decisions into structured execution tasks and operational work.',
  },
  {
    num: '04',
    id: 'pulse',
    title: 'PULSE',
    role: 'KEEP THE ORGANIZATION CONNECTED.',
    description: 'Carries requests, communication, approvals, threads, and operational activity.',
  },
  {
    num: '05',
    id: 'vault',
    title: 'VAULT',
    role: 'REMEMBER EVERYTHING THAT MATTERS.',
    description: 'Preserves knowledge, evidence, assets, references, and operational memory.',
  },
];

export default function ModulesSection() {
  return (
    <section 
      className="relative w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-26 py-20 border-b border-[var(--border)] overflow-hidden"
      aria-label="ALYOXA OS System Modules"
    >
      {/* Structural Vertical Reference Guides */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-40" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-25 hidden sm:block" />

      <div className="max-w-8xl mx-auto relative z-10">
        
        {/* Section Identifier Metadata Bar */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--muted)] pb-8 mb-12 sm:mb-16 border-b border-[var(--border)]">
          <span>05 // SYSTEM MODULES</span>
          <span className="hidden sm:inline-block">FIVE LAYERS. ONE OPERATING SYSTEM.</span>
        </div>

        {/* Editorial Heading Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-20">
          
          <div className="lg:col-span-8 pl-4 sm:pl-6 md:pl-8 border-l border-[var(--primary)]">
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] sm:leading-[1.0] text-[var(--foreground)] font-sans">
              FIVE LAYERS.<br />
              <span className="font-normal italic text-[var(--primary)] mt-2 sm:mt-3 block">
                ONE OPERATING SYSTEM.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-start lg:pl-8 lg:border-l lg:border-[var(--border)] space-y-6 pt-2">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] block">
              // ARCHITECTURAL CONTINUITY
            </span>
            <p className="text-xs sm:text-sm font-mono text-[var(--muted)] leading-relaxed">
              ALYOXA OS brings observation, intelligence, execution, communication, and memory into one continuous operating environment.
            </p>
          </div>

        </div>

        {/* Continuous Editorial Module Architecture */}
        <div className="relative pt-6 border-t border-[var(--border)]">
          
          <div className="space-y-0">
            {modulesData.map((mod, idx) => (
              <div 
                key={mod.id} 
                className={`group relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 py-10 sm:py-12 border-b border-[var(--border)] items-start transition-colors duration-200 hover:bg-[var(--primary)]/[0.02] ${
                  idx === 0 ? 'border-t border-[var(--border)]' : ''
                }`}
              >
                {/* Left Column: Index & Title */}
                <div className="lg:col-span-4 pl-4 sm:pl-6 md:pl-8 border-l-2 border-[var(--primary)]">
                  <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--primary)] uppercase mb-2">
                    LAYER // {mod.num}
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-light tracking-tight text-[var(--foreground)] font-sans">
                    {mod.title}
                  </h3>
                </div>

                {/* Right Column: Role & Description */}
                <div className="lg:col-span-8 flex flex-col sm:flex-row sm:items-start justify-between gap-6 lg:pl-6">
                  <div className="space-y-3 max-w-2xl">
                    <span className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--foreground)] font-medium block">
                      {mod.role}
                    </span>
                    <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed font-sans">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}