import { NextRequest, NextResponse } from "next/server";
import {
  getBriefShareSecret,
  verifyBriefShareToken,
} from "@/lib/brief-share";
import {
  getPainPointById,
  getProductIdeasForPainPoint,
  insertConversionEventDb,
} from "@/lib/db-service";
import { formatOpportunityBriefMarkdown } from "@/lib/opportunity-brief";

/**
 * GET /api/share/briefs?token=
 * Public read of a Builder opportunity brief via signed share link (M3.1).
 * No email required — token proves a Builder minted the link.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const secret = getBriefShareSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Brief share links are not configured. Set BRIEF_SHARE_SECRET or ADMIN_API_KEY.",
        gate: "M3.1",
      },
      { status: 503 }
    );
  }

  const verified = verifyBriefShareToken(token, secret);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.reason, gate: "M3.1" },
      { status: 403 }
    );
  }

  try {
    const painPoint = await getPainPointById(verified.problemId);
    if (!painPoint) {
      return NextResponse.json(
        {
          error: `Pain point "${verified.problemId}" not found`,
          gate: "M3.1",
        },
        { status: 404 }
      );
    }

    const ideas = await getProductIdeasForPainPoint(verified.problemId);
    const markdown = formatOpportunityBriefMarkdown(painPoint, ideas);

    try {
      await insertConversionEventDb("builder_brief_share_view", "/api/share/briefs", {
        problemId: painPoint.PainPointId,
        ideaCount: ideas.length,
      });
    } catch (auditError) {
      console.error("Failed to record builder_brief_share_view:", auditError);
    }

    return NextResponse.json({
      ok: true,
      gate: "M3.1",
      format: "markdown",
      problemId: painPoint.PainPointId,
      title: painPoint.Title,
      markdown,
      ideaCount: ideas.length,
      shareExpiresAt: verified.exp,
    });
  } catch (error) {
    console.error("Failed to load shared opportunity brief:", error);
    return NextResponse.json(
      { error: "Failed to load shared opportunity brief", gate: "M3.1" },
      { status: 500 }
    );
  }
}
