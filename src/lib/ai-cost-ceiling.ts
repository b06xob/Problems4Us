/**
 * Monthly AI cost ceiling monitor (problems4us-19c).
 * Q4 ceilings from growth plan: <=35% of MRR, or while MRR<$500 <=$15/activated user/mo.
 * Does not invent invoice spend — missing invoice → invoiceNeeded, not a breach.
 */

import { getAiBudgetConfig } from "./ai-budget";

export const AI_COST_CEILING = {
  maxPctOfMrr: 0.35,
  maxUsdPerActivatedWhileLowMrr: 15,
  lowMrrUsdThreshold: 500,
} as const;

export type AiCostCeilingInput = {
  monthUtc: string;
  /** OpenAI (or provider) invoice/export for the month — null if not yet provided. */
  aiSpendUsd: number | null;
  mrrUsd: number;
  activatedAccounts: number;
  dailyTokenBudget?: number;
  perRequestMaxChars?: number;
  asOfUtc?: string;
};

export type AiCostCeilingCheck = {
  stepId: "problems4us-19c";
  monthUtc: string;
  asOfUtc: string;
  inputs: {
    aiSpendUsd: number | null;
    mrrUsd: number;
    activatedAccounts: number;
    invoiceNeeded: boolean;
  };
  ceilings: {
    maxPctOfMrr: number;
    maxUsdPerActivatedWhileLowMrr: number;
    lowMrrUsdThreshold: number;
  };
  computed: {
    aiCostPctOfMrr: number | null;
    aiCostPerActivatedUsd: number | null;
    lowMrrMode: boolean;
  };
  breach: {
    pctOfMrr: boolean | null;
    perActivatedWhileLowMrr: boolean | null;
    any: boolean;
  };
  analyzeBudgetControls: {
    dailyTokenBudget: number;
    perRequestMaxChars: number;
    note: string;
  };
  status: "ok" | "invoice_pending" | "breached";
  escalateWarningToPassport: boolean;
  escalateWarning: string | null;
  passportReadablePath: string;
};

function finiteNonNeg(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

/**
 * Pure monthly ceiling evaluation — unit-testable; no DB/network.
 */
export function evaluateAiCostCeiling(
  input: AiCostCeilingInput
): AiCostCeilingCheck {
  const asOfUtc = input.asOfUtc ?? new Date().toISOString();
  const cfg = getAiBudgetConfig({
    AI_DAILY_TOKEN_BUDGET:
      input.dailyTokenBudget != null
        ? String(input.dailyTokenBudget)
        : undefined,
    AI_ANALYZE_MAX_CHARS:
      input.perRequestMaxChars != null
        ? String(input.perRequestMaxChars)
        : undefined,
  } as NodeJS.ProcessEnv);

  const mrrUsd = finiteNonNeg(input.mrrUsd) ?? 0;
  const activated = Math.max(
    0,
    Math.floor(finiteNonNeg(input.activatedAccounts) ?? 0)
  );
  const spendRaw =
    input.aiSpendUsd === null || input.aiSpendUsd === undefined
      ? null
      : finiteNonNeg(input.aiSpendUsd);
  const invoiceNeeded = spendRaw === null;
  const lowMrrMode = mrrUsd < AI_COST_CEILING.lowMrrUsdThreshold;

  let aiCostPctOfMrr: number | null = null;
  let aiCostPerActivatedUsd: number | null = null;
  let breachPct: boolean | null = null;
  let breachPerAct: boolean | null = null;

  if (!invoiceNeeded && spendRaw !== null) {
    if (mrrUsd > 0) {
      aiCostPctOfMrr = spendRaw / mrrUsd;
      breachPct = aiCostPctOfMrr > AI_COST_CEILING.maxPctOfMrr;
    } else {
      // MRR $0: % of MRR undefined — not a numeric breach; low-MRR per-activated rule applies.
      aiCostPctOfMrr = null;
      breachPct = null;
    }
    if (activated > 0) {
      aiCostPerActivatedUsd = spendRaw / activated;
    } else {
      aiCostPerActivatedUsd = spendRaw > 0 ? Number.POSITIVE_INFINITY : 0;
    }
    if (lowMrrMode) {
      breachPerAct =
        aiCostPerActivatedUsd > AI_COST_CEILING.maxUsdPerActivatedWhileLowMrr;
    } else {
      breachPerAct = null;
    }
  }

  const anyBreach = Boolean(breachPct) || Boolean(breachPerAct);
  let status: AiCostCeilingCheck["status"] = "ok";
  if (invoiceNeeded) status = "invoice_pending";
  else if (anyBreach) status = "breached";

  let escalateWarning: string | null = null;
  if (anyBreach) {
    const parts: string[] = [];
    if (breachPct) {
      parts.push(
        `AI spend ${spendRaw} > ${AI_COST_CEILING.maxPctOfMrr * 100}% of MRR ${mrrUsd}`
      );
    }
    if (breachPerAct) {
      parts.push(
        `AI spend/activated ${aiCostPerActivatedUsd === Number.POSITIVE_INFINITY ? "∞" : aiCostPerActivatedUsd?.toFixed(2)} > $${AI_COST_CEILING.maxUsdPerActivatedWhileLowMrr} while MRR < $${AI_COST_CEILING.lowMrrUsdThreshold}`
      );
    }
    escalateWarning = `Warning+: AI cost ceiling breach (${input.monthUtc}): ${parts.join("; ")}. Xavier/Passport: raise prices, cut analyze volume, or raise budget with explicit approval.`;
  }

  return {
    stepId: "problems4us-19c",
    monthUtc: input.monthUtc,
    asOfUtc,
    inputs: {
      aiSpendUsd: spendRaw,
      mrrUsd,
      activatedAccounts: activated,
      invoiceNeeded,
    },
    ceilings: {
      maxPctOfMrr: AI_COST_CEILING.maxPctOfMrr,
      maxUsdPerActivatedWhileLowMrr:
        AI_COST_CEILING.maxUsdPerActivatedWhileLowMrr,
      lowMrrUsdThreshold: AI_COST_CEILING.lowMrrUsdThreshold,
    },
    computed: {
      aiCostPctOfMrr,
      aiCostPerActivatedUsd:
        aiCostPerActivatedUsd === Number.POSITIVE_INFINITY
          ? null
          : aiCostPerActivatedUsd,
      lowMrrMode,
    },
    breach: {
      pctOfMrr: breachPct,
      perActivatedWhileLowMrr: breachPerAct,
      any: anyBreach,
    },
    analyzeBudgetControls: {
      dailyTokenBudget: cfg.dailyTokenBudget,
      perRequestMaxChars: cfg.perRequestMaxChars,
      note: "problems4us-27 per-request + daily token caps remain enforced on POST /api/ai/analyze",
    },
    status,
    escalateWarningToPassport: anyBreach,
    escalateWarning,
    passportReadablePath: "GET /api/admin/ai-cost-ceiling",
  };
}

/** Parse optional AI_MONTHLY_SPEND_USD (or query override). Empty → null. */
export function parseAiSpendUsd(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function currentMonthUtc(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}
