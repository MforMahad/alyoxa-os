'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationConfig } from '@/data/os/overview';

interface OverviewSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const OverviewSidebar: React.FC<OverviewSidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const pathname = usePathname();

  // Close mobile drawer on navigation or escape key
  useEffect(() => {
    onCloseMobile?.();
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCloseMobile]);

  const sidebarContent = (
    <div className="w-full h-full flex flex-col justify-between bg-[#0B1715] p-4 select-none text-[#F0EDE4] overflow-y-auto">
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#004741]" />
            <span className="font-bold text-xs tracking-[0.2em] text-[#F0EDE4] uppercase font-mono">
              ALYOXA OS
            </span>
          </div>
          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-[#596560] hover:text-[#F0EDE4] p-1 border border-white/10"
              aria-label="Close navigation"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary OS Navigation (Workspace) */}
        <nav className="space-y-1">
          <div className="px-2 pb-2 text-[15px] font-bold tracking-widest text-[#d5d7d6] uppercase">
            Workspace
          </div>
          {navigationConfig.primary.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'border-[#004741] text-[#F0EDE4] bg-white/5 font-bold'
                    : 'border-transparent text-[#bcbcbc] hover:text-[#F0EDE4] hover:bg-white/5'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] px-1 py-0.2 bg-[#004741]/20 text-[#f1f1f1] border border-[#004741]/40 font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Secondary OS Navigation (System) */}
        <nav className="space-y-1 pt-4 border-t border-white/10">
          <div className="px-2 pb-2 text-[15px] font-bold tracking-widest text-[#d5d7d6] uppercase">
            System
          </div>
          {navigationConfig.system.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'border-[#004741] text-[#F0EDE4] bg-white/5 font-bold'
                    : 'border-transparent text-[#bcbcbc] hover:text-[#F0EDE4] hover:bg-white/5'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Clean Bottom Area */}
      <div className="px-2 py-3 border-t border-white/10 text-[10px] font-mono text-[#596560] tracking-wider uppercase">
        ALYOXA // 2026
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Fixed 224px width, hidden on mobile) */}
      <aside className="w-56 h-screen sticky top-0 border-r border-white/10 bg-[#0B1715] select-none z-30 shrink-0 hidden lg:flex flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer (~80-85vw wide, positioned above workspace with translucent overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="relative w-[82vw] max-w-xs h-full bg-[#0B1715] border-r border-white/10 shadow-2xl z-10 flex flex-col transform transition-transform duration-300 ease-out">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};