import { NextRequest, NextResponse } from "next/server";
import {
  getPainPointById,
  getPlanEntitlementByEmailDb,
  getProductIdeasForPainPoint,
  insertConversionEventDb,
  toPlanEntitlement,
} from "@/lib/db-service";
import {
  buildBuilderBriefExportAudit,
  decideBuilderGate,
  isEntitlementEmail,
} from "@/lib/entitlements";
import {
  buildBriefShareAudit,
  buildBriefShareUrl,
  createBriefShareToken,
  getBriefShareSecret,
  verifyBriefShareToken,
} from "@/lib/brief-share";
import { formatOpportunityBriefMarkdown } from "@/lib/opportunity-brief";

/**
 * GET /api/builder/briefs?email=&problemId=
 * Builder-gated opportunity brief export (M2.2 gate + M3.1 share links).
 * Header x-builder-email is accepted as an email alternate.
 * Successful exports record builder_brief_export funnel events (seat → usage)
 * and mint a signed shareUrl (builder_brief_share) when a share secret is set.
 */
export async function GET(request: NextRequest) {
  const emailParam =
    request.nextUrl.searchParams.get("email")?.trim() ||
    request.headers.get("x-builder-email")?.trim() ||
    "";
  const problemId = request.nextUrl.searchParams.get("problemId")?.trim() || "";

  if (!problemId) {
    return NextResponse.json(
      { error: "problemId is required", gate: "M2.2" },
      { status: 400 }
    );
  }

  if (!emailParam || !isEntitlementEmail(emailParam)) {
    return NextResponse.json(
      { error: "Valid email required for Builder access", gate: "M2.2" },
      { status: 400 }
    );
  }

  let entitlement = null;
  try {
    const record = await getPlanEntitlementByEmailDb(emailParam);
    entitlement = toPlanEntitlement(record);
  } catch (error) {
    console.error("Failed to load Builder entitlement:", error);
    return NextResponse.json(
      { error: "Failed to verify Builder entitlement", gate: "M2.2" },
      { status: 500 }
    );
  }

  const gate = decideBuilderGate(emailParam, entitlement);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error, gate: "M2.2", activeBuilder: false },
      { status: gate.status }
    );
  }

  try {
    const painPoint = await getPainPointById(problemId);
    if (!painPoint) {
      return NextResponse.json(
        { error: `Pain point "${problemId}" not found`, gate: "M2.2" },
        { status: 404 }
      );
    }

    const ideas = await getProductIdeasForPainPoint(problemId);
    const markdown = formatOpportunityBriefMarkdown(painPoint, ideas);

    const audit = buildBuilderBriefExportAudit({
      email: gate.email,
      problemId: painPoint.PainPointId,
      ideaCount: ideas.length,
      stripeSessionId: entitlement?.StripeSessionId,
    });
    if (audit) {
      try {
        await insertConversionEventDb(
          "builder_brief_export",
          "/api/builder/briefs",
          audit
        );
      } catch (auditError) {
        console.error("Failed to record builder_brief_export:", auditError);
      }
    }

    let shareUrl: string | null = null;
    let shareExpiresAt: number | null = null;
    const shareSecret = getBriefShareSecret();
    if (shareSecret) {
      const token = createBriefShareToken({
        problemId: painPoint.PainPointId,
        secret: shareSecret,
      });
      if (token) {
        const checked = verifyBriefShareToken(token, shareSecret);
        shareUrl = buildBriefShareUrl(token);
        shareExpiresAt = checked.ok ? checked.exp : null;
        if (shareExpiresAt != null) {
          const shareAudit = buildBriefShareAudit({
            email: gate.email,
            problemId: painPoint.PainPointId,
            expiresAt: shareExpiresAt,
          });
          if (shareAudit) {
            try {
              await insertConversionEventDb(
                "builder_brief_share",
                "/api/builder/briefs",
                shareAudit
              );
            } catch (shareError) {
              console.error("Failed to record builder_brief_share:", shareError);
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      gate: "M2.2",
      format: "markdown",
      email: gate.email,
      problemId: painPoint.PainPointId,
      title: painPoint.Title,
      markdown,
      ideaCount: ideas.length,
      shareUrl,
      shareExpiresAt,
    });
  } catch (error) {
    console.error("Failed to build opportunity brief:", error);
    return NextResponse.json(
      { error: "Failed to build opportunity brief", gate: "M2.2" },
      { status: 500 }
    );
  }
}
