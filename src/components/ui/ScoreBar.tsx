"use client";

interface ScoreBarProps {
  score: number;
  label?: string;
  className?: string;
}

function getBarColor(score: number): string {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-green-500";
}

export function ScoreBar({ score, label, className = "" }: ScoreBarProps) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-text-secondary">{label}</span>
          <span className="text-xs font-medium text-text-primary">{score}</span>
        </div>
      )}
      <div className="score-bar">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
