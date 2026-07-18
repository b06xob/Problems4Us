import type { TrendDirection } from './types';

export interface OpportunityScores {
  FrequencyScore: number;
  SeverityScore: number;
  WillingnessToPayScore: number;
  TrendScore: number;
  MarketSizeScore: number;
}

/** Canonical opportunity-score weights (sum = 1.0). Used by calculate + brief explain. */
export const OPPORTUNITY_SCORE_WEIGHTS = {
  FrequencyScore: 0.25,
  SeverityScore: 0.25,
  WillingnessToPayScore: 0.3,
  TrendScore: 0.1,
  MarketSizeScore: 0.1,
} as const;

export type ScoreFacetKey = keyof typeof OPPORTUNITY_SCORE_WEIGHTS;

export type ScoreFacetContribution = {
  key: ScoreFacetKey;
  label: string;
  weight: number;
  raw: number;
  weighted: number;
};

export type OpportunityScoreExplanation = {
  facets: ScoreFacetContribution[];
  total: number;
  label: ReturnType<typeof getScoreLabel>;
  topDriver: ScoreFacetContribution;
};

const FACET_LABELS: Record<ScoreFacetKey, string> = {
  FrequencyScore: "Frequency",
  SeverityScore: "Severity",
  WillingnessToPayScore: "Willingness to pay",
  TrendScore: "Trend",
  MarketSizeScore: "Market size",
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function calculateOpportunityScore(scores: OpportunityScores): number {
  const raw =
    scores.FrequencyScore * OPPORTUNITY_SCORE_WEIGHTS.FrequencyScore +
    scores.SeverityScore * OPPORTUNITY_SCORE_WEIGHTS.SeverityScore +
    scores.WillingnessToPayScore * OPPORTUNITY_SCORE_WEIGHTS.WillingnessToPayScore +
    scores.TrendScore * OPPORTUNITY_SCORE_WEIGHTS.TrendScore +
    scores.MarketSizeScore * OPPORTUNITY_SCORE_WEIGHTS.MarketSizeScore;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

/**
 * Break down why an opportunity score is what it is (M3.2 prep for Builder briefs).
 * Weighted contributions are rounded to 1 decimal for readable exports.
 */
export function explainOpportunityScore(
  scores: OpportunityScores
): OpportunityScoreExplanation {
  const facets: ScoreFacetContribution[] = (
    Object.keys(OPPORTUNITY_SCORE_WEIGHTS) as ScoreFacetKey[]
  ).map((key) => {
    const weight = OPPORTUNITY_SCORE_WEIGHTS[key];
    const raw = clampScore(Number(scores[key]));
    const weighted = Math.round(raw * weight * 10) / 10;
    return {
      key,
      label: FACET_LABELS[key],
      weight,
      raw,
      weighted,
    };
  });

  const total = calculateOpportunityScore(scores);
  const topDriver = [...facets].sort((a, b) => b.weighted - a.weighted)[0];

  return {
    facets,
    total,
    label: getScoreLabel(total),
    topDriver,
  };
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
