import {
  _resetAiBudgetForTests,
  decideAiAnalyzeBudget,
  estimateTokensFromText,
  getAiBudgetConfig,
  recordAiBudgetUsage,
} from "@/lib/ai-budget";

describe("ai budget guards (problems4us-27)", () => {
  beforeEach(() => {
    _resetAiBudgetForTests();
  });

  it("estimates tokens from text length", () => {
    expect(estimateTokensFromText("abcd")).toBe(1);
    expect(estimateTokensFromText("a".repeat(400))).toBe(100);
  });

  it("rejects oversize per-request payloads", () => {
    const env = { AI_ANALYZE_MAX_CHARS: "100" } as NodeJS.ProcessEnv;
    const decision = decideAiAnalyzeBudget("x".repeat(101), env);
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.status).toBe(429);
      expect(decision.reason).toBe("per_request");
    }
  });

  it("rejects when daily budget would be exceeded", () => {
    const env = {
      AI_ANALYZE_MAX_CHARS: "100000",
      AI_DAILY_TOKEN_BUDGET: "50",
    } as NodeJS.ProcessEnv;
    recordAiBudgetUsage(40);
    const decision = decideAiAnalyzeBudget("x".repeat(80), env); // ~20 tokens
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("daily");
      expect(decision.status).toBe(429);
    }
  });

  it("allows normal analyze within caps", () => {
    const cfg = getAiBudgetConfig({});
    expect(cfg.perRequestMaxChars).toBeGreaterThan(1000);
    const decision = decideAiAnalyzeBudget("short complaint text", {});
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.estimatedTokens).toBeGreaterThan(0);
      expect(decision.remainingToday).toBeLessThanOrEqual(cfg.dailyTokenBudget);
    }
  });
});
