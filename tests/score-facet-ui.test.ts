import {
  OPPORTUNITY_SCORE_WEIGHTS,
  explainOpportunityScore,
} from "@/lib/scoring";

/**
 * problems4us-16a — facet weights must surface for problem-detail UI.
 * Component itself is client; this locks the weight contract the UI renders.
 */
describe("score facet weights for problem detail (problems4us-16a)", () => {
  it("exposes five facets with weights summing to 1.0", () => {
    const keys = Object.keys(OPPORTUNITY_SCORE_WEIGHTS);
    expect(keys).toEqual([
      "FrequencyScore",
      "SeverityScore",
      "WillingnessToPayScore",
      "TrendScore",
      "MarketSizeScore",
    ]);
    const sum = keys.reduce(
      (n, k) =>
        n + OPPORTUNITY_SCORE_WEIGHTS[k as keyof typeof OPPORTUNITY_SCORE_WEIGHTS],
      0
    );
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("explainOpportunityScore returns labels usable as UI bars", () => {
    const explained = explainOpportunityScore({
      FrequencyScore: 80,
      SeverityScore: 60,
      WillingnessToPayScore: 90,
      TrendScore: 40,
      MarketSizeScore: 50,
    });
    expect(explained.facets).toHaveLength(5);
    expect(explained.facets.map((f) => f.label)).toEqual([
      "Frequency",
      "Severity",
      "Willingness to pay",
      "Trend",
      "Market size",
    ]);
    expect(explained.total).toBe(71);
    expect(explained.topDriver.label).toBe("Willingness to pay");
    for (const facet of explained.facets) {
      expect(facet.weight).toBeGreaterThan(0);
      expect(facet.raw).toBeGreaterThanOrEqual(0);
      expect(facet.raw).toBeLessThanOrEqual(100);
    }
  });

  it("XPS contract facet mapping has no orphan P4U labels (16b)", () => {
    const xpsByP4u: Record<string, string> = {
      FrequencyScore: "relevance",
      SeverityScore: "quality",
      WillingnessToPayScore: "quality",
      TrendScore: "novelty",
      MarketSizeScore: "relevance",
    };
    for (const key of Object.keys(OPPORTUNITY_SCORE_WEIGHTS)) {
      expect(xpsByP4u[key]).toBeTruthy();
      expect(["relevance", "quality", "novelty", "risk", "composite"]).toContain(
        xpsByP4u[key]
      );
    }
  });
});
