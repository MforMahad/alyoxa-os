import React from 'react';

interface LoopStepProps {
  step: string;
  name: string;
  action: string;
  layer: string;
  description: string;
  isLast?: boolean;
}

export default function LoopStep({
  step,
  name,
  action,
  layer,
  description,
  isLast = false,
}: LoopStepProps) {
  return (
    <div className="relative flex flex-col justify-between p-6 sm:p-7 border border-[var(--border)] bg-[var(--background)] transition-colors duration-300 hover:border-[var(--primary)] group">
      
      {/* Top Header Row: Step Number & System Layer Badge */}
      <div className="flex items-center justify-between w-full pb-4 mb-6 border-b border-[var(--border)]">
        <span className="font-mono text-xs tracking-[0.2em] text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">
          {step}
        </span>
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 border border-[var(--border)] text-[var(--muted)] group-hover:border-[var(--primary)]/40 group-hover:text-[var(--primary)] transition-colors">
          {layer}
        </span>
      </div>

      {/* Main Stage Identity & Action */}
      <div className="space-y-3 mb-8">
        <h3 className="font-sans text-xl sm:text-2xl font-normal tracking-tight text-[var(--foreground)]">
          {name}
        </h3>
        <p className="font-mono text-xs text-[var(--primary)] leading-snug tracking-wide">
          &ldquo;{action}&rdquo;
        </p>
      </div>

      {/* Supporting Architectural Explanation */}
      <div className="pt-4 border-t border-[var(--border)]/60 mt-auto">
        <p className="text-xs sm:text-sm text-[var(--muted)] font-normal leading-relaxed">
          {description}
        </p>
      </div>

      {/* Subtle Directional Flow Indicator for Desktop */}
      {!isLast && (
        <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-20 text-[var(--border)] group-hover:text-[var(--primary)] transition-colors pointer-events-none">
          →
        </div>
      )}
    </div>
  );
}