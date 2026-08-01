import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getAIProvider } from "@/lib/ai-service";
import {
  mapExtractedPainPoints,
  resolveAiProviderName,
} from "@/lib/ai-analyze";
import {
  decideAiAnalyzeBudget,
  recordAiBudgetUsage,
} from "@/lib/ai-budget";
import {
  TELEMETRY_EVENTS,
  trackAppEventFireAndForget,
} from "@/lib/app-insights";

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { text } = body as { text?: string };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'text' field" },
        { status: 400 }
      );
    }

    const trimmed = text.trim();
    const budget = decideAiAnalyzeBudget(trimmed);
    if (!budget.ok) {
      trackAppEventFireAndForget(TELEMETRY_EVENTS.aiBudgetDenied, {
        reason: budget.reason,
        dailyUsed: budget.dailyUsed,
        dailyCap: budget.dailyCap,
      });
      return NextResponse.json(
        {
          error: budget.error,
          reason: budget.reason,
          estimatedTokens: budget.estimatedTokens,
          dailyUsed: budget.dailyUsed,
          dailyCap: budget.dailyCap,
        },
        {
          status: budget.status,
          headers: { "Retry-After": "3600" },
        }
      );
    }

    const providerName = resolveAiProviderName();
    const provider = getAIProvider();
    const extracted = await provider.extractPainPoints(trimmed);
    recordAiBudgetUsage(budget.estimatedTokens);
    const painPoints = mapExtractedPainPoints(extracted, trimmed);
    const summary =
      painPoints.length === 1
        ? `Identified 1 pain point from the provided text, categorized under "${painPoints[0].category}" (provider=${providerName}).`
        : `Identified ${painPoints.length} pain points from the provided text, spanning ${[
            ...new Set(painPoints.map((p) => p.category)),
          ].join(", ")} (provider=${providerName}).`;

    return NextResponse.json({
      painPoints,
      summary,
      provider: providerName,
      budget: {
        estimatedTokens: budget.estimatedTokens,
        remainingToday: budget.remainingToday,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}
