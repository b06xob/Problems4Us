"use client";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreConfig(score: number) {
  if (score >= 80) return { label: "Critical", className: "badge-critical" };
  if (score >= 60) return { label: "High", className: "badge-high" };
  if (score >= 40) return { label: "Medium", className: "badge-medium" };
  return { label: "Low", className: "badge-low" };
}

export function ScoreBadge({ score, size = "md", showLabel = true }: ScoreBadgeProps) {
  const config = getScoreConfig(score);
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2.5 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  return (
    <span className={`${config.className} ${sizeClasses[size]}`}>
      {score}{showLabel && ` · ${config.label}`}
    </span>
  );
}
