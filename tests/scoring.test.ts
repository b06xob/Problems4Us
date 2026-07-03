import { calculateOpportunityScore, getScoreLabel, getScoreColor } from "@/lib/scoring";

describe("calculateOpportunityScore", () => {
  it("returns 0 for all-zero scores", () => {
    const result = calculateOpportunityScore({
      FrequencyScore: 0,
      SeverityScore: 0,
      WillingnessToPayScore: 0,
      TrendScore: 0,
      MarketSizeScore: 0,
    });
    expect(result).toBe(0);
  });

  it("returns 100 for all-100 scores", () => {
    const result = calculateOpportunityScore({
      FrequencyScore: 100,
      SeverityScore: 100,
      WillingnessToPayScore: 100,
      TrendScore: 100,
      MarketSizeScore: 100,
    });
    expect(result).toBe(100);
  });

  it("applies correct weights", () => {
    const result = calculateOpportunityScore({
      FrequencyScore: 80,
      SeverityScore: 60,
      WillingnessToPayScore: 90,
      TrendScore: 40,
      MarketSizeScore: 50,
    });
    // 80*0.25 + 60*0.25 + 90*0.30 + 40*0.10 + 50*0.10
    // 20 + 15 + 27 + 4 + 5 = 71
    expect(result).toBe(71);
  });

  it("rounds to nearest integer", () => {
    const result = calculateOpportunityScore({
      FrequencyScore: 33,
      SeverityScore: 67,
      WillingnessToPayScore: 45,
      TrendScore: 22,
      MarketSizeScore: 88,
    });
    // 33*0.25 + 67*0.25 + 45*0.30 + 22*0.10 + 88*0.10
    // 8.25 + 16.75 + 13.5 + 2.2 + 8.8 = 49.5
    expect(result).toBe(50);
  });

  it("handles WTP weight being highest", () => {
    const highWTP = calculateOpportunityScore({
      FrequencyScore: 50,
      SeverityScore: 50,
      WillingnessToPayScore: 100,
      TrendScore: 50,
      MarketSizeScore: 50,
    });
    const lowWTP = calculateOpportunityScore({
      FrequencyScore: 50,
      SeverityScore: 50,
      WillingnessToPayScore: 0,
      TrendScore: 50,
      MarketSizeScore: 50,
    });
    expect(highWTP - lowWTP).toBe(30);
  });
});

describe("getScoreLabel", () => {
  it("returns Critical for 80+", () => {
    expect(getScoreLabel(80)).toBe("Critical");
    expect(getScoreLabel(100)).toBe("Critical");
    expect(getScoreLabel(95)).toBe("Critical");
  });

  it("returns High for 60-79", () => {
    expect(getScoreLabel(60)).toBe("High");
    expect(getScoreLabel(79)).toBe("High");
  });

  it("returns Medium for 40-59", () => {
    expect(getScoreLabel(40)).toBe("Medium");
    expect(getScoreLabel(59)).toBe("Medium");
  });

  it("returns Low for 0-39", () => {
    expect(getScoreLabel(0)).toBe("Low");
    expect(getScoreLabel(39)).toBe("Low");
  });
});

describe("getScoreColor", () => {
  it("returns red for critical scores", () => {
    expect(getScoreColor(85)).toBe("#ef4444");
  });

  it("returns orange for high scores", () => {
    expect(getScoreColor(65)).toBe("#f97316");
  });

  it("returns yellow for medium scores", () => {
    expect(getScoreColor(50)).toBe("#eab308");
  });

  it("returns green for low scores", () => {
    expect(getScoreColor(20)).toBe("#22c55e");
  });
});
