import React from 'react';
import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer 
      className="relative w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-26 py-8 border-t border-[var(--border)] overflow-hidden"
      aria-label="ALYOXA OS Footer"
    >
      {/* Structural Vertical Reference Guides */}
      <div className="absolute inset-y-0 left-6 sm:left-12 md:left-24 lg:left-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-40" />
      <div className="absolute inset-y-0 right-6 sm:right-12 md:right-24 lg:right-32 w-[1px] bg-[var(--border)] pointer-events-none opacity-25 hidden sm:block" />

      <div className="max-w-8xl mx-auto relative z-10">
        
        {/* ZONE 1 — CLOSING STATEMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start pb-16">
          
          {/* Left Column: Editorial Label & Large Statement */}
          <div className="lg:col-span-7 pl-4 sm:pl-6 md:pl-8 border-l-2 border-[var(--primary)] space-y-6">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--primary)] block">
              08 // ALYOXA
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.05] text-[var(--foreground)] font-sans">
              ONE SYSTEM.<br />
              <span className="font-normal italic text-[var(--primary)] mt-2 block">
                ONE CONTINUOUS ENVIRONMENT.
              </span>
            </h2>
          </div>

          {/* Right Column: Supporting Paragraph & Navigation */}
          <div className="lg:col-span-5 flex flex-col justify-start lg:pl-8 lg:border-l lg:border-[var(--border)] space-y-8 pt-2">
            <p className="text-sm sm:text-base font-sans text-[var(--muted)] leading-relaxed">
              Intelligence, execution, communication, and memory — connected through one operating system.
            </p>

            {/* Navigation Links */}
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-[var(--border)]">
              <Link 
                href="#system" 
                className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
              >
                SYSTEM
              </Link>
              <Link 
                href="#philosophy" 
                className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
              >
                PHILOSOPHY
              </Link>
              <Link 
                href="/app" 
                className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-medium hover:opacity-80 transition-opacity flex items-center gap-1"
              >
                ENTER OS <span>↗</span>
              </Link>
            </div>
          </div>

        </div>

        {/* Architectural Divider */}
        <div className="w-full h-[1px] bg-[var(--border)] my-6" />

        {/* ZONE 2 — THE ALYOXA WORDMARK (Hero Element spanning ~90% content width) */}
        <div className="py-8 w-full overflow-hidden text-center">
          <h1 className="w-full text-[16.5vw] sm:text-[17vw] md:text-[17.5vw] font-light tracking-[0.2em] leading-[0.78] uppercase text-[var(--foreground)] select-none whitespace-nowrap">
            ALY<span className="text-[var(--primary)] italic font-normal">OX</span>A
          </h1>
        </div>

        {/* Architectural Divider */}
        <div className="w-full h-[1px] bg-[var(--border)] my-6" />

        {/* ZONE 3 — FINAL FOOTER BAR */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase text-[var(--muted)]">
          <div>
            © 2026 ALYOXA.
          </div>
          <div className="text-[var(--foreground)] font-medium">
            ALYOXA OS
          </div>
          <div className="text-[var(--primary)]">
            ONE SYSTEM. FIVE LAYERS.
          </div>
        </div>

      </div>
    </footer>
  );
}