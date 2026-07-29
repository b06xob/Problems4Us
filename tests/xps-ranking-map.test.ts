/**
 * @jest-environment node
 */
import {
  mapOpportunityExplainability,
  mapOpportunityToXpsFacets,
  P4U_TO_XPS_COMPOSITE_WEIGHTS,
} from "@/lib/xps-ranking-map";

const sample = {
  FrequencyScore: 80,
  SeverityScore: 85,
  WillingnessToPayScore: 90,
  TrendScore: 55,
  MarketSizeScore: 40,
};

describe("xps-ranking-map", () => {
  it("maps opportunity scores into XPS facets in 0..1", () => {
    const facets = mapOpportunityToXpsFacets(sample);
    for (const key of ["relevance", "quality", "novelty", "risk", "composite"] as const) {
      expect(facets[key].status).toBe("live");
      expect(facets[key].value).toBeGreaterThanOrEqual(0);
      expect(facets[key].value).toBeLessThanOrEqual(1);
    }
  });

  it("keeps composite weights summing to 1", () => {
    const sum =
      P4U_TO_XPS_COMPOSITE_WEIGHTS.relevance +
      P4U_TO_XPS_COMPOSITE_WEIGHTS.quality +
      P4U_TO_XPS_COMPOSITE_WEIGHTS.novelty +
      P4U_TO_XPS_COMPOSITE_WEIGHTS.risk;
    expect(sum).toBeCloseTo(1, 5);
  });

  it("produces explainability with top driver reason", () => {
    const { reasons, topFeatures } = mapOpportunityExplainability(sample);
    expect(reasons[0].code).toBe("P4U_TOP_DRIVER");
    expect(topFeatures.length).toBe(5);
    expect(topFeatures[0].contribution).toBeGreaterThanOrEqual(
      topFeatures[topFeatures.length - 1].contribution
    );
  });
});
