"use client";

import {
  explainOpportunityScore,
  type OpportunityScores,
  type ScoreFacetKey,
} from "@/lib/scoring";
import { ScoreBar } from "@/components/ui/ScoreBar";

/** XPS contract facet names + plain-language tips (problems4us-16b). */
const FACET_TOOLTIPS: Record<
  ScoreFacetKey,
  { xpsMapsTo: string; tip: string }
> = {
  FrequencyScore: {
    xpsMapsTo: "relevance",
    tip: "How often this pain shows up in sources. Maps to XPS relevance (with market size).",
  },
  SeverityScore: {
    xpsMapsTo: "quality",
    tip: "How intense the pain is. Maps to XPS quality (with willingness to pay).",
  },
  WillingnessToPayScore: {
    xpsMapsTo: "quality",
    tip: "Signal buyers may pay to solve this. Maps to XPS quality until a monetization facet exists.",
  },
  TrendScore: {
    xpsMapsTo: "novelty",
    tip: "Whether mentions are rising or cooling. Maps to XPS novelty.",
  },
  MarketSizeScore: {
    xpsMapsTo: "relevance",
    tip: "Reach / TAM of the problem space. Maps to XPS relevance (with frequency).",
  },
};

type ScoreFacetBreakdownProps = {
  scores: OpportunityScores;
  className?: string;
};

/**
 * Problem-detail score facets with canonical weights (problems4us-16a)
 * and XPS-aligned tooltips (problems4us-16b).
 */
export function ScoreFacetBreakdown({
  scores,
  className = "",
}: ScoreFacetBreakdownProps) {
  const explained = explainOpportunityScore(scores);

  return (
    <div className={className} data-testid="score-facet-breakdown">
      <p className="mb-4 text-sm text-text-secondary">
        Composite{" "}
        <span className="font-medium text-text-primary">
          {explained.total}/100
        </span>{" "}
        ({explained.label}). Top driver:{" "}
        <span className="font-medium text-text-primary">
          {explained.topDriver.label}
        </span>{" "}
        ({(explained.topDriver.weight * 100).toFixed(0)}% weight,{" "}
        {explained.topDriver.weighted} pts).
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {explained.facets.map((facet) => {
          const tip = FACET_TOOLTIPS[facet.key];
          return (
            <div
              key={facet.key}
              data-facet-key={facet.key}
              data-xps-facet={tip.xpsMapsTo}
              title={`${tip.tip} (XPS: ${tip.xpsMapsTo})`}
            >
              <ScoreBar
                score={facet.raw}
                label={`${facet.label} · ${(facet.weight * 100).toFixed(0)}% · ${facet.weighted} pts · XPS ${tip.xpsMapsTo}`}
              />
              <p className="mt-1 text-[11px] leading-snug text-text-muted">
                {tip.tip}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
