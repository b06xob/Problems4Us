/**
 * OpenAI / AI analyze cost and token budget guards (problems4us-27).
 * Per-request and daily caps — fail soft (429) so runaway ingest cannot burn unbounded API cost.
 */

export type AiBudgetDecision =
  | { ok: true; estimatedTokens: number; remainingToday: number }
  | {
      ok: false;
      status: 429;
      error: string;
      reason: "per_request" | "daily";
      estimatedTokens?: number;
      dailyUsed?: number;
      dailyCap?: number;
    };

const DEFAULT_PER_REQUEST_CHARS = 24_000; // ~6k tokens rough ceiling for single analyze body
const DEFAULT_DAILY_TOKEN_BUDGET = 250_000;

/** In-memory daily counter (per App Service instance). Reset at UTC day boundary. */
let dayKey = "";
let dayTokensUsed = 0;

function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function resetIfNewDay(now = new Date()): void {
  const key = utcDayKey(now);
  if (key !== dayKey) {
    dayKey = key;
    dayTokensUsed = 0;
  }
}

/** Rough char→token estimate (OpenAI-ish ~4 chars/token). */
export function estimateTokensFromText(text: string): number {
  const len = typeof text === "string" ? text.length : 0;
  return Math.max(1, Math.ceil(len / 4));
}

export function getAiBudgetConfig(env: NodeJS.ProcessEnv = process.env): {
  perRequestMaxChars: number;
  dailyTokenBudget: number;
} {
  const perRaw = Number(env.AI_ANALYZE_MAX_CHARS ?? env.AI_PER_REQUEST_MAX_CHARS);
  const dailyRaw = Number(env.AI_DAILY_TOKEN_BUDGET);
  return {
    perRequestMaxChars:
      Number.isFinite(perRaw) && perRaw > 0
        ? Math.floor(perRaw)
        : DEFAULT_PER_REQUEST_CHARS,
    dailyTokenBudget:
      Number.isFinite(dailyRaw) && dailyRaw > 0
        ? Math.floor(dailyRaw)
        : DEFAULT_DAILY_TOKEN_BUDGET,
  };
}

/**
 * Decide whether an analyze request may proceed. Pure config + process memory.
 * Call `recordAiBudgetUsage` after a successful provider call.
 */
export function decideAiAnalyzeBudget(
  text: string,
  env: NodeJS.ProcessEnv = process.env,
  now = new Date()
): AiBudgetDecision {
  resetIfNewDay(now);
  const cfg = getAiBudgetConfig(env);
  const chars = typeof text === "string" ? text.length : 0;

  if (chars > cfg.perRequestMaxChars) {
    return {
      ok: false,
      status: 429,
      reason: "per_request",
      error: `Analyze text exceeds per-request cap of ${cfg.perRequestMaxChars} characters (got ${chars}). Split the payload or raise AI_ANALYZE_MAX_CHARS.`,
      estimatedTokens: estimateTokensFromText(text),
    };
  }

  const estimatedTokens = estimateTokensFromText(text);
  if (dayTokensUsed + estimatedTokens > cfg.dailyTokenBudget) {
    return {
      ok: false,
      status: 429,
      reason: "daily",
      error: `Daily AI token budget exceeded (${dayTokensUsed}/${cfg.dailyTokenBudget}). Try again tomorrow UTC or raise AI_DAILY_TOKEN_BUDGET.`,
      estimatedTokens,
      dailyUsed: dayTokensUsed,
      dailyCap: cfg.dailyTokenBudget,
    };
  }

  return {
    ok: true,
    estimatedTokens,
    remainingToday: Math.max(0, cfg.dailyTokenBudget - dayTokensUsed - estimatedTokens),
  };
}

export function recordAiBudgetUsage(tokens: number, now = new Date()): void {
  resetIfNewDay(now);
  const n = Number(tokens);
  if (!Number.isFinite(n) || n <= 0) return;
  dayTokensUsed += Math.floor(n);
}

/** Test helper — reset in-memory counters. */
export function _resetAiBudgetForTests(): void {
  dayKey = "";
  dayTokensUsed = 0;
}

export function getAiBudgetSnapshot(now = new Date()): {
  dayKey: string;
  dayTokensUsed: number;
  dailyTokenBudget: number;
  perRequestMaxChars: number;
} {
  resetIfNewDay(now);
  const cfg = getAiBudgetConfig();
  return {
    dayKey,
    dayTokensUsed,
    dailyTokenBudget: cfg.dailyTokenBudget,
    perRequestMaxChars: cfg.perRequestMaxChars,
  };
}
