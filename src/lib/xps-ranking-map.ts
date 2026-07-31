/**
 * Map Problems4Us OpportunityScores → XPS ranking/discovery contract facets (v1 draft).
 * Used by Month-2 integration spike (problems4us-13).
 */
import {
  OPPORTUNITY_SCORE_WEIGHTS,
  explainOpportunityScore,
  type OpportunityScores,
} from "./scoring";

/** Pinned XPS ranking/discovery contract version (problems4us-13c). */
export const XPS_RANKING_CONTRACT_VERSION = "1.0.0-draft" as const;

export type XpsFacetStatus = "live" | "parked" | "research";

export type XpsFacet = {
  value: number | null;
  status: XpsFacetStatus;
};

export type XpsExplainReason = {
  code: string;
  message: string;
  weight?: number;
};

export type XpsRankedItemFacets = {
  relevance: XpsFacet;
  quality: XpsFacet;
  novelty: XpsFacet;
  risk: XpsFacet;
  composite: XpsFacet;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function score100ToUnit(n: number): number {
  return clamp01(n / 100);
}

/**
 * Deterministic mapping from P4U opportunity facets to XPS contract facets.
 * Weights declared here must match scoringPolicy.compositeWeights on emitted payloads.
 */
export const P4U_TO_XPS_COMPOSITE_WEIGHTS = {
  relevance: 0.35,
  quality: 0.45,
  novelty: 0.1,
  risk: 0.1,
} as const;

export function mapOpportunityToXpsFacets(
  scores: OpportunityScores,
  options?: { risk?: number; riskStatus?: XpsFacetStatus }
): XpsRankedItemFacets {
  const frequency = score100ToUnit(scores.FrequencyScore);
  const severity = score100ToUnit(scores.SeverityScore);
  const wtp = score100ToUnit(scores.WillingnessToPayScore);
  const trend = score100ToUnit(scores.TrendScore);
  const market = score100ToUnit(scores.MarketSizeScore);

  const relevance = clamp01(
    frequency * (OPPORTUNITY_SCORE_WEIGHTS.FrequencyScore /
      (OPPORTUNITY_SCORE_WEIGHTS.FrequencyScore +
        OPPORTUNITY_SCORE_WEIGHTS.MarketSizeScore)) +
      market *
        (OPPORTUNITY_SCORE_WEIGHTS.MarketSizeScore /
          (OPPORTUNITY_SCORE_WEIGHTS.FrequencyScore +
            OPPORTUNITY_SCORE_WEIGHTS.MarketSizeScore))
  );

  const quality = clamp01(
    severity *
      (OPPORTUNITY_SCORE_WEIGHTS.SeverityScore /
        (OPPORTUNITY_SCORE_WEIGHTS.SeverityScore +
          OPPORTUNITY_SCORE_WEIGHTS.WillingnessToPayScore)) +
      wtp *
        (OPPORTUNITY_SCORE_WEIGHTS.WillingnessToPayScore /
          (OPPORTUNITY_SCORE_WEIGHTS.SeverityScore +
            OPPORTUNITY_SCORE_WEIGHTS.WillingnessToPayScore))
  );

  const novelty = trend;
  const risk = clamp01(options?.risk ?? 0.12);
  const riskStatus = options?.riskStatus ?? "live";

  const composite = clamp01(
    relevance * P4U_TO_XPS_COMPOSITE_WEIGHTS.relevance +
      quality * P4U_TO_XPS_COMPOSITE_WEIGHTS.quality +
      novelty * P4U_TO_XPS_COMPOSITE_WEIGHTS.novelty -
      risk * P4U_TO_XPS_COMPOSITE_WEIGHTS.risk
  );

  return {
    relevance: { value: round3(relevance), status: "live" },
    quality: { value: round3(quality), status: "live" },
    novelty: { value: round3(novelty), status: "live" },
    risk: { value: round3(risk), status: riskStatus },
    composite: { value: round3(composite), status: "live" },
  };
}

export function mapOpportunityExplainability(scores: OpportunityScores): {
  reasons: XpsExplainReason[];
  topFeatures: { name: string; contribution: number }[];
} {
  const explained = explainOpportunityScore(scores);
  const topFeatures = explained.facets
    .slice()
    .sort((a, b) => b.weighted - a.weighted)
    .map((f) => ({
      name: f.key,
      contribution: round3(f.weighted / 100),
    }));

  const reasons: XpsExplainReason[] = [
    {
      code: "P4U_TOP_DRIVER",
      message: `${explained.topDriver.label} is the top weighted driver (${explained.label})`,
      weight: round3(explained.topDriver.weight),
    },
  ];

  return { reasons, topFeatures };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
