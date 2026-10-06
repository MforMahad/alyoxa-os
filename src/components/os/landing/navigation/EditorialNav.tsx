'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import EditorialButton from '../cta/EditorialButton';

export default function EditorialNav() {
  const [indexOpen, setIndexOpen] = useState(false);

  const navItems = [
    { num: '01', label: 'SYSTEM ARCHITECTURE', href: '#system' },
    { num: '02', label: 'CORE RUNTIME', href: '#architecture' },
    { num: '03', label: 'INTEGRATION MODULES', href: '#modules' },
    { num: '04', label: 'PHILOSOPHY & MANIFESTO', href: '#philosophy' },
  ];

  return (
    <div className="relative w-full z-50">
      {/* Top Editorial Control Strip */}
      <header className="w-full bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-8 md:px-16 lg:px-24 pt-6 pb-6 border-b border-[var(--border)] relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Left: ALYOXA Identity */}
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            <Link 
              href="/" 
              className="font-mono text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
            >
              [ALX] ALYOXA OS
            </Link>
          </div>

          {/* Center: Approved Menu Trigger */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setIndexOpen(!indexOpen)}
              className="group inline-flex items-center gap-3 font-mono text-xs tracking-[0.2em] uppercase text-[var(--foreground)] bg-[var(--background)] border border-[var(--border)] px-4 py-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer shadow-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></span>
              <span className="font-semibold">{indexOpen ? 'CLOSE MENU [×]' : 'MENU // INDEX [04]'}</span>
            </button>
          </div>

          {/* Right: System Entrance */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <EditorialButton
                href="/app"
                label="ENTER OS"
                variant="primary"
                showArrow={true}
                className="!py-2 !px-4 !text-[10px]"
              />
            </div>

            {/* Mobile / Menu Toggle Button */}
            <button
              onClick={() => setIndexOpen(!indexOpen)}
              className="md:hidden font-mono text-xs tracking-[0.2em] uppercase px-3.5 py-2 border border-[var(--border)] text-[var(--foreground)] bg-[var(--background)] font-semibold cursor-pointer"
            >
              {indexOpen ? 'CLOSE [×]' : 'MENU [+]'}
            </button>
          </div>

        </div>
      </header>

      {/* Full-Page Immersive Architectural Index / Menu Overlay */}
      {indexOpen && (
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen bg-[var(--background)] text-[var(--foreground)] z-50 flex flex-col justify-between px-6 sm:px-16 lg:px-24 py-12 overflow-y-auto animate-in fade-in duration-200">
          
          {/* Header Bar inside Fullscreen */}
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between pb-8 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              <span className="font-mono text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-[var(--foreground)]">
                ALYOXA OS // SYSTEM INDEX
              </span>
            </div>
            <button
              onClick={() => setIndexOpen(false)}
              className="font-mono text-xs tracking-[0.2em] uppercase px-4 py-2 border border-[var(--primary)] bg-[var(--primary)] text-[var(--background)] hover:opacity-90 transition-opacity cursor-pointer font-semibold"
            >
              CLOSE MENU [×]
            </button>
          </div>

          {/* Main Content Body */}
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 my-auto py-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-[var(--primary)] font-semibold">
                // UNIFIED BUSINESS SYSTEM
              </div>
              <h2 className="text-4xl sm:text-6xl font-light tracking-tight leading-[1.0] text-[var(--foreground)]">
                SYSTEM <br />
                <span className="italic text-[var(--primary)]">MANUSCRIPT.</span>
              </h2>
              <p className="text-base text-[var(--muted)] font-normal leading-relaxed max-w-md">
                ALYOXA OS replaces tool fragmentation with a contract-driven unified runtime. Select a core section below to navigate.
              </p>
            </div>

            <div className="lg:col-span-7 flex flex-col space-y-3 lg:border-l lg:border-[var(--border)] lg:pl-16">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] mb-4">
                // SYSTEM MODULES [01 — 04]
              </div>
              {navItems.map((item) => (
                <a
                  key={item.num}
                  href={item.href}
                  onClick={() => setIndexOpen(false)}
                  className="group flex items-center justify-between py-5 px-6 border border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-6 font-mono text-sm sm:text-base tracking-[0.18em] uppercase">
                    <span className="text-[var(--primary)] group-hover:text-[var(--background)]">{item.num}</span>
                    <span className="font-semibold">{item.label}</span>
                  </span>
                  <span className="text-[var(--muted)] group-hover:text-[var(--background)] group-hover:translate-x-1 transition-transform text-lg">↗</span>
                </a>
              ))}

              <div className="pt-8">
                <EditorialButton
                  href="/app"
                  label="ENTER ALYOXA OS ↗"
                  variant="primary"
                  className="w-full justify-center py-4 text-sm"
                />
              </div>
            </div>

          </div>

          {/* Footer Bar inside Fullscreen — Cleaned of Fake Coordinates */}
          <div className="max-w-7xl hidden sm:flex mx-auto w-full flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--muted)] pt-8 border-t border-[var(--border)] gap-4">
            <span>ALYOXA OS</span>
            <span>// UNIFIED BUSINESS SYSTEM</span>
            <span>INDEX 04 / 04</span>
          </div>

        </div>
      )}
    </div>
  );
}