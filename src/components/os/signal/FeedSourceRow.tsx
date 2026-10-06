import React from "react";
import { FeedSource } from "@/data/os/signal";

interface FeedSourceRowProps {
  source: FeedSource;
  isSelected: boolean;
  onSelect: () => void;
}

export const FeedSourceRow: React.FC<FeedSourceRowProps> = ({
  source,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left group flex items-center justify-between px-4 py-3 font-mono text-xs cursor-pointer border-l-2 transition-colors border-b border-[var(--border)]/40 focus:outline-none focus:bg-[var(--surface)]/60 ${
        isSelected
          ? "border-[var(--primary)] bg-[var(--surface)] font-bold text-[var(--foreground)]"
          : "border-transparent hover:bg-[var(--surface)]/40 text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      <div className="flex items-center gap-6 min-w-0 flex-1">
        {/* Source Code Badge */}
        <span
          className={`text-[10px] px-2 py-0.5 border shrink-0 font-bold ${
            isSelected
              ? "text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/10"
              : "text-[var(--foreground)] border-[var(--border)] bg-[var(--surface)]/50"
          }`}
        >
          {source.code}
        </span>

        {/* Name and Endpoint */}
        <div className="flex flex-col min-w-0 w-64 shrink-0">
          <span className="text-[var(--foreground)] font-semibold truncate">
            {source.name}
          </span>
          {source.endpointUrl ? (
            <span className="text-[10px] text-[var(--muted)] truncate font-normal">
              {source.endpointUrl}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)]/50 font-normal">
              Internal Stream
            </span>
          )}
        </div>

        {/* Source Type */}
        <span className="text-[10px] text-[var(--muted)] uppercase shrink-0 w-28 hidden sm:block">
          {source.type.replace("_", " ")}
        </span>

        {/* Ingestion Rate */}
        <div className="flex flex-col shrink-0 w-24">
          <span className="text-[var(--signal)] font-bold">
            {source.eventRate.eventsPerMinute}/m
          </span>
          <span className="text-[9px] text-[var(--muted)]">
            {source.eventRate.displayRate}
          </span>
        </div>

        {/* Last Active */}
        <span className="text-[10px] text-[var(--muted)] shrink-0 w-20 hidden md:block">
          {source.lastActive}
        </span>
      </div>

      {/* Status Badge */}
      <div className="shrink-0">
        <span
          className={`text-[9px] px-1.5 py-0.5 border uppercase ${
            source.status === "active"
              ? "text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10"
              : source.status === "degraded"
                ? "text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10"
                : "text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          {source.status}
        </span>
      </div>
    </button>
  );
};
