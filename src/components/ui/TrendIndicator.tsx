"use client";

interface TrendIndicatorProps {
  direction: "up" | "down" | "stable";
  size?: "sm" | "md";
}

export function TrendIndicator({ direction, size = "md" }: TrendIndicatorProps) {
  const iconSize = size === "sm" ? 14 : 18;

  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 17 5-5 5 5" />
          <path d="m7 11 5-5 5 5" />
        </svg>
        <span className="text-xs font-medium">Rising</span>
      </span>
    );
  }

  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 7 5 5 5-5" />
          <path d="m7 13 5 5 5-5" />
        </svg>
        <span className="text-xs font-medium">Declining</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-text-muted">
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
      </svg>
      <span className="text-xs font-medium">Stable</span>
    </span>
  );
}
