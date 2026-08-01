import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { countActivatedAccountsDb } from "@/lib/user-db";
import { getStripeCheckoutPublicStatus } from "@/lib/stripe-checkout";
import {
  currentMonthUtc,
  evaluateAiCostCeiling,
  parseAiSpendUsd,
} from "@/lib/ai-cost-ceiling";
import { getAiBudgetConfig } from "@/lib/ai-budget";

/**
 * GET /api/admin/ai-cost-ceiling
 * Monthly AI cost vs MRR/activated ceiling check (problems4us-19c).
 *
 * Optional query:
 *   month=YYYY-MM
 *   aiSpendUsd=<invoice>   (overrides AI_MONTHLY_SPEND_USD env)
 *   mrrUsd=<number>        (default 0 while checkoutReady=false)
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const sp = request.nextUrl.searchParams;
    const monthUtc = sp.get("month")?.trim() || currentMonthUtc();
    const spendOverride = parseAiSpendUsd(sp.get("aiSpendUsd"));
    const envSpend = parseAiSpendUsd(process.env.AI_MONTHLY_SPEND_USD);
    const aiSpendUsd = spendOverride ?? envSpend;

    const mrrOverride = parseAiSpendUsd(sp.get("mrrUsd"));
    const checkout = getStripeCheckoutPublicStatus();
    // Until Stripe checkout is live, do not invent MRR — default 0 unless ops passes mrrUsd.
    const mrrUsd = mrrOverride ?? 0;

    const activation = await countActivatedAccountsDb();
    const cfg = getAiBudgetConfig();

    const check = evaluateAiCostCeiling({
      monthUtc,
      aiSpendUsd,
      mrrUsd,
      activatedAccounts: activation.activatedAccounts,
      dailyTokenBudget: cfg.dailyTokenBudget,
      perRequestMaxChars: cfg.perRequestMaxChars,
    });

    return NextResponse.json({
      ok: true,
      ...check,
      live: {
        totalAccounts: activation.totalAccounts,
        activatedAccounts: activation.activatedAccounts,
        checkoutReady: checkout.checkoutReady,
        spendSource:
          spendOverride != null
            ? "query"
            : envSpend != null
              ? "AI_MONTHLY_SPEND_USD"
              : "none",
      },
      humanActionRequired: check.escalateWarningToPassport || check.inputs.invoiceNeeded,
      note:
        check.inputs.invoiceNeeded
          ? "Set AI_MONTHLY_SPEND_USD on App Service (or ?aiSpendUsd=) from OpenAI invoice — do not invent spend."
          : undefined,
    });
  } catch (error) {
    console.error("ai-cost-ceiling GET failed:", error);
    return NextResponse.json(
      { error: "Could not evaluate AI cost ceiling" },
      { status: 503 }
    );
  }
}
