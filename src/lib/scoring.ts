import type { TrendDirection } from './types';

export interface OpportunityScores {
  FrequencyScore: number;
  SeverityScore: number;
  WillingnessToPayScore: number;
  TrendScore: number;
  MarketSizeScore: number;
}

export function calculateOpportunityScore(scores: OpportunityScores): number {
  const raw =
    scores.FrequencyScore * 0.25 +
    scores.SeverityScore * 0.25 +
    scores.WillingnessToPayScore * 0.30 +
    scores.TrendScore * 0.10 +
    scores.MarketSizeScore * 0.10;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function getScoreLabel(score: number): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  return '#22c55e';
}

export function getTrendIcon(trend: TrendDirection): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
  }
}
