import { NextRequest, NextResponse } from "next/server";
import { listPainPoints } from "@/lib/db-service";
import {
  mapOpportunityExplainability,
  mapOpportunityToXpsFacets,
  P4U_TO_XPS_COMPOSITE_WEIGHTS,
  XPS_RANKING_CONTRACT_VERSION,
} from "@/lib/xps-ranking-map";

/**
 * Month-2 XPS ranking integration spike: emit contract-shaped discovery payload
 * from live Problems4Us opportunity scores (problems4us-13).
 */
export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(
      25,
      Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "5", 10))
    );
    const requestId =
      request.nextUrl.searchParams.get("requestId")?.trim() ||
      `p4u-rank-${Date.now()}`;

    const { data } = await listPainPoints({
      sortBy: "OpportunityScore",
      sortOrder: "desc",
      page: 1,
      limit,
    });

    if (!data.length) {
      return NextResponse.json(
        {
          error: "No scored problems available for ranking payload",
          contractVersion: XPS_RANKING_CONTRACT_VERSION,
        },
        { status: 404 }
      );
    }

    const asOf = new Date().toISOString();
    const rankedItems = data.map((p, index) => {
      const scores = {
        FrequencyScore: p.FrequencyScore,
        SeverityScore: p.SeverityScore,
        WillingnessToPayScore: p.WillingnessToPayScore,
        TrendScore: p.TrendScore,
        MarketSizeScore: p.MarketSizeScore,
      };
      const facets = mapOpportunityToXpsFacets(scores);
      const explainability = mapOpportunityExplainability(scores);
      return {
        rank: index + 1,
        candidateId: p.PainPointId,
        facets,
        explainability: {
          ...explainability,
          policyNotes: [
            `Live P4U→XPS mapper output (contractVersion ${XPS_RANKING_CONTRACT_VERSION})`,
          ],
        },
      };
    });

    return NextResponse.json({
      contractVersion: XPS_RANKING_CONTRACT_VERSION,
      requestId,
      product: "Problems4Us",
      domain: "problems.cluster",
      asOf,
      scoringPolicy: {
        deterministic: true,
        compositeWeights: { ...P4U_TO_XPS_COMPOSITE_WEIGHTS },
        notes:
          "Mapped from P4U OpportunityScores; risk subtracted in composite.",
      },
      freshness: {
        asOf,
        computedAt: asOf,
        maxAgeSeconds: 86400,
        stale: false,
      },
      rankedItems,
    });
  } catch (error) {
    console.error("Ranking discovery failed:", error);
    return NextResponse.json(
      { error: "Failed to build ranking discovery payload" },
      { status: 503 }
    );
  }
}
