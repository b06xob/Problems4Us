import {
  AI_COST_CEILING,
  evaluateAiCostCeiling,
  parseAiSpendUsd,
  currentMonthUtc,
} from "@/lib/ai-cost-ceiling";

describe("ai cost ceiling (problems4us-19c)", () => {
  it("parses spend and month helpers", () => {
    expect(parseAiSpendUsd(undefined)).toBeNull();
    expect(parseAiSpendUsd("")).toBeNull();
    expect(parseAiSpendUsd("12.5")).toBe(12.5);
    expect(parseAiSpendUsd("-1")).toBeNull();
    expect(currentMonthUtc(new Date("2026-08-01T08:00:00Z"))).toBe("2026-08");
  });

  it("marks invoice_pending without inventing breach", () => {
    const check = evaluateAiCostCeiling({
      monthUtc: "2026-08",
      aiSpendUsd: null,
      mrrUsd: 0,
      activatedAccounts: 1,
      asOfUtc: "2026-08-01T08:50:00Z",
    });
    expect(check.status).toBe("invoice_pending");
    expect(check.breach.any).toBe(false);
    expect(check.escalateWarningToPassport).toBe(false);
    expect(check.inputs.invoiceNeeded).toBe(true);
    expect(check.analyzeBudgetControls.dailyTokenBudget).toBeGreaterThan(0);
  });

  it("breaches low-MRR per-activated ceiling", () => {
    const check = evaluateAiCostCeiling({
      monthUtc: "2026-08",
      aiSpendUsd: 20,
      mrrUsd: 0,
      activatedAccounts: 1,
      asOfUtc: "2026-08-01T08:50:00Z",
    });
    expect(check.computed.lowMrrMode).toBe(true);
    expect(check.breach.perActivatedWhileLowMrr).toBe(true);
    expect(check.breach.any).toBe(true);
    expect(check.status).toBe("breached");
    expect(check.escalateWarningToPassport).toBe(true);
    expect(check.escalateWarning).toMatch(/Warning\+/);
  });

  it("breaches pct-of-MRR ceiling when MRR>0", () => {
    const check = evaluateAiCostCeiling({
      monthUtc: "2026-09",
      aiSpendUsd: 400,
      mrrUsd: 1000,
      activatedAccounts: 10,
    });
    expect(check.computed.aiCostPctOfMrr).toBeCloseTo(0.4);
    expect(check.breach.pctOfMrr).toBe(true);
    expect(check.status).toBe("breached");
  });

  it("passes when under both ceilings", () => {
    const check = evaluateAiCostCeiling({
      monthUtc: "2026-09",
      aiSpendUsd: 10,
      mrrUsd: 100,
      activatedAccounts: 2,
    });
    expect(check.computed.aiCostPctOfMrr!).toBeLessThanOrEqual(
      AI_COST_CEILING.maxPctOfMrr
    );
    expect(check.computed.aiCostPerActivatedUsd!).toBeLessThanOrEqual(
      AI_COST_CEILING.maxUsdPerActivatedWhileLowMrr
    );
    expect(check.status).toBe("ok");
    expect(check.escalateWarningToPassport).toBe(false);
  });

  it("exposes passport path and 27 controls note", () => {
    const check = evaluateAiCostCeiling({
      monthUtc: "2026-08",
      aiSpendUsd: null,
      mrrUsd: 0,
      activatedAccounts: 0,
    });
    expect(check.stepId).toBe("problems4us-19c");
    expect(check.passportReadablePath).toBe("GET /api/admin/ai-cost-ceiling");
    expect(check.analyzeBudgetControls.note).toMatch(/problems4us-27/);
  });
});
