import { NextRequest, NextResponse } from "next/server";
import { resolveBuilderBriefCaller } from "@/lib/builder-brief-auth";
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
} from "@/lib/entitlements";
import {
  buildBriefShareAudit,
  buildBriefShareUrl,
  createBriefShareToken,
  getBriefShareSecret,
  verifyBriefShareToken,
} from "@/lib/brief-share";
import { formatOpportunityBriefMarkdown } from "@/lib/opportunity-brief";
import { formatOpportunityBriefPdf } from "@/lib/opportunity-brief-pdf";
import { extractSessionToken } from "@/lib/user-auth";
import { resolveSessionUser } from "@/lib/user-db";

/**
 * GET /api/builder/briefs?email=&problemId=&format=markdown|pdf
 * Builder-gated opportunity brief export (M2.2 gate + M3.1 share links + M3.1b PDF).
 * Authz (2026-08-05): requires signed-in session (email from session) OR
 * ADMIN_API_KEY (ops/pilot harness may pass email / x-builder-email).
 * Successful exports record builder_brief_export funnel events (seat → usage)
 * and mint a signed shareUrl (builder_brief_share) when a share secret is set.
 */
export async function GET(request: NextRequest) {
  const claimedEmail =
    request.nextUrl.searchParams.get("email")?.trim() ||
    request.headers.get("x-builder-email")?.trim() ||
    "";
  const problemId = request.nextUrl.searchParams.get("problemId")?.trim() || "";
  const formatRaw =
    request.nextUrl.searchParams.get("format")?.trim().toLowerCase() ||
    "markdown";
  const format = formatRaw === "pdf" ? "pdf" : "markdown";

  if (formatRaw && formatRaw !== "markdown" && formatRaw !== "pdf") {
    return NextResponse.json(
      { error: "format must be markdown or pdf", gate: "M2.2" },
      { status: 400 }
    );
  }

  if (!problemId) {
    return NextResponse.json(
      { error: "problemId is required", gate: "M2.2" },
      { status: 400 }
    );
  }

  let sessionUser = null;
  try {
    sessionUser = await resolveSessionUser(extractSessionToken(request));
  } catch (error) {
    console.error("Failed to resolve session for Builder brief:", error);
    return NextResponse.json(
      { error: "Failed to verify session", gate: "M2.2" },
      { status: 500 }
    );
  }

  const caller = resolveBuilderBriefCaller({
    request,
    sessionUser,
    claimedEmail,
  });
  if (!caller.ok) {
    return NextResponse.json(
      { error: caller.error, gate: "M2.2" },
      { status: caller.status }
    );
  }

  let entitlement = null;
  try {
    const record = await getPlanEntitlementByEmailDb(caller.email);
    entitlement = toPlanEntitlement(record);
  } catch (error) {
    console.error("Failed to load Builder entitlement:", error);
    return NextResponse.json(
      { error: "Failed to verify Builder entitlement", gate: "M2.2" },
      { status: 500 }
    );
  }

  const gate = decideBuilderGate(caller.email, entitlement);
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
        const { TELEMETRY_EVENTS, trackAppEventFireAndForget } = await import(
          "@/lib/app-insights"
        );
        trackAppEventFireAndForget(TELEMETRY_EVENTS.builderBriefExport, {
          problemId: painPoint.PainPointId,
          ideaCount: ideas.length,
          format,
        });
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

    if (format === "pdf") {
      const pdf = formatOpportunityBriefPdf(painPoint, ideas);
      const safeName = painPoint.PainPointId.replace(/[^a-zA-Z0-9_-]/g, "_");
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="opportunity-brief-${safeName}.pdf"`,
          "X-Problems4Us-Format": "pdf",
          "X-Problems4Us-ProblemId": painPoint.PainPointId,
          "X-Problems4Us-IdeaCount": String(ideas.length),
          ...(shareUrl ? { "X-Problems4Us-ShareUrl": shareUrl } : {}),
        },
      });
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
