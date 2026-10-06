import React from 'react';

interface OverviewHeaderProps {
  onOpenMobileMenu?: () => void;
  mobileOpen?: boolean;
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({ onOpenMobileMenu, mobileOpen }) => {
  return (
    <header className="h-12 w-full border-b border-white/10 bg-[#0B1715] px-4 sm:px-6 flex items-center justify-between font-mono text-xs select-none sticky top-0 z-20 text-[#F0EDE4]">
      {/* Left: Mobile Menu Trigger + Workspace & Mode Indicators */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Trigger (Visible only on mobile/small screens below lg) */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 text-[#F0EDE4] hover:bg-white/5 border border-white/10 transition-colors"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[#596560]">OS //</span>
          <span className="font-bold tracking-wider text-[#F0EDE4]">
            ALYOXA OS
          </span>
        </div>
      </div>
    </header>
  );
};