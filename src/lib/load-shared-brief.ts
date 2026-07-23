/**
 * Shared loader for signed brief share links (M3.1).
 * Used by GET /api/share/briefs (JSON) and GET /share/briefs (HTML).
 */

import {
  getBriefShareSecret,
  verifyBriefShareToken,
} from "@/lib/brief-share";
import {
  getPainPointById,
  getProductIdeasForPainPoint,
  insertConversionEventDb,
} from "@/lib/db-service";
import {
  formatOpportunityBriefMarkdown,
  type BriefIdea,
  type BriefPainPoint,
} from "@/lib/opportunity-brief";
import { explainOpportunityScore } from "@/lib/scoring";

export type SharedBriefOk = {
  ok: true;
  problemId: string;
  title: string;
  painPoint: BriefPainPoint;
  ideas: BriefIdea[];
  markdown: string;
  ideaCount: number;
  shareExpiresAt: number;
  scoreExplanation: ReturnType<typeof explainOpportunityScore>;
};

export type SharedBriefErr = {
  ok: false;
  status: number;
  error: string;
  gate: "M3.1";
};

export type SharedBriefResult = SharedBriefOk | SharedBriefErr;

function toBriefPainPoint(painPoint: {
  PainPointId: string;
  Title: string;
  Summary: string;
  Category: string;
  OpportunityScore: number;
  SeverityScore: number;
  FrequencyScore: number;
  WillingnessToPayScore: number;
  TrendScore?: number | null;
  MarketSizeScore?: number | null;
  TrendDirection?: string | null;
}): BriefPainPoint {
  return {
    PainPointId: painPoint.PainPointId,
    Title: painPoint.Title,
    Summary: painPoint.Summary,
    Category: painPoint.Category,
    OpportunityScore: painPoint.OpportunityScore,
    SeverityScore: painPoint.SeverityScore,
    FrequencyScore: painPoint.FrequencyScore,
    WillingnessToPayScore: painPoint.WillingnessToPayScore,
    TrendScore: painPoint.TrendScore,
    MarketSizeScore: painPoint.MarketSizeScore,
    TrendDirection: painPoint.TrendDirection,
  };
}

/**
 * Verify token, load pain point + ideas, optionally record share-view funnel event.
 */
export async function loadSharedBrief(
  token: string | null | undefined,
  options?: { recordView?: boolean; viewPath?: string }
): Promise<SharedBriefResult> {
  const secret = getBriefShareSecret();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error:
        "Brief share links are not configured. Set BRIEF_SHARE_SECRET or ADMIN_API_KEY.",
      gate: "M3.1",
    };
  }

  const verified = verifyBriefShareToken(token, secret);
  if (!verified.ok) {
    return { ok: false, status: 403, error: verified.reason, gate: "M3.1" };
  }

  try {
    const raw = await getPainPointById(verified.problemId);
    if (!raw) {
      return {
        ok: false,
        status: 404,
        error: `Pain point "${verified.problemId}" not found`,
        gate: "M3.1",
      };
    }

    const painPoint = toBriefPainPoint(raw);
    const ideas = (await getProductIdeasForPainPoint(
      verified.problemId
    )) as BriefIdea[];
    const markdown = formatOpportunityBriefMarkdown(painPoint, ideas);
    const scoreExplanation = explainOpportunityScore({
      FrequencyScore: painPoint.FrequencyScore,
      SeverityScore: painPoint.SeverityScore,
      WillingnessToPayScore: painPoint.WillingnessToPayScore,
      TrendScore: Number(painPoint.TrendScore ?? 0),
      MarketSizeScore: Number(painPoint.MarketSizeScore ?? 0),
    });

    if (options?.recordView !== false) {
      try {
        await insertConversionEventDb(
          "builder_brief_share_view",
          options?.viewPath || "/share/briefs",
          {
            problemId: painPoint.PainPointId,
            ideaCount: ideas.length,
          }
        );
      } catch (auditError) {
        console.error("Failed to record builder_brief_share_view:", auditError);
      }
    }

    return {
      ok: true,
      problemId: painPoint.PainPointId,
      title: painPoint.Title,
      painPoint,
      ideas,
      markdown,
      ideaCount: ideas.length,
      shareExpiresAt: verified.exp,
      scoreExplanation,
    };
  } catch (error) {
    console.error("Failed to load shared opportunity brief:", error);
    return {
      ok: false,
      status: 500,
      error: "Failed to load shared opportunity brief",
      gate: "M3.1",
    };
  }
}
