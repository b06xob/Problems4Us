import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  countActiveBuilderEntitlementsDb,
  getPlanEntitlementByEmailDb,
  revokeBuilderEntitlementDb,
  toPlanEntitlement,
  upsertAdminPilotBuilderEntitlementDb,
} from "@/lib/db-service";
import {
  hasActiveBuilderAccess,
  isAdminPilotSessionId,
  isEntitlementEmail,
} from "@/lib/entitlements";

/**
 * GET /api/checkout/entitlements
 * Admin: paid Builder cohort (M2.2 entitlement gate).
 *   ?summary=1           → { activeBuilderSeats }
 *   ?email=user@x.com    → entitlement lookup (no secrets)
 *
 * POST /api/checkout/entitlements
 * Admin pilot grant/revoke while G7 Stripe keys pending:
 *   { "action":"grant"|"revoke", "email":"...", "note":"optional" }
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const summary = request.nextUrl.searchParams.get("summary");
    if (summary === "1" || summary === "true") {
      const activeBuilderSeats = await countActiveBuilderEntitlementsDb();
      return NextResponse.json({
        ok: true,
        gate: "M2.2",
        activeBuilderSeats,
      });
    }

    const email = request.nextUrl.searchParams.get("email")?.trim() || "";
    if (!email) {
      return NextResponse.json(
        {
          error: "Provide ?summary=1 or ?email=",
          gate: "M2.2",
        },
        { status: 400 }
      );
    }
    if (!isEntitlementEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email", gate: "M2.2" },
        { status: 400 }
      );
    }

    const record = await getPlanEntitlementByEmailDb(email);
    const entitlement = toPlanEntitlement(record);
    return NextResponse.json({
      ok: true,
      gate: "M2.2",
      found: Boolean(entitlement),
      activeBuilder: hasActiveBuilderAccess(entitlement),
      entitlement: entitlement
        ? {
            email: entitlement.Email,
            tier: entitlement.Tier,
            status: entitlement.Status,
            grantedAt: entitlement.GrantedAt,
            updatedAt: entitlement.UpdatedAt,
            stripeSessionId: entitlement.StripeSessionId,
            pilotGrant: isAdminPilotSessionId(entitlement.StripeSessionId),
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to query entitlements:", error);
    return NextResponse.json(
      { error: "Failed to query entitlements", gate: "M2.2" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  let body: { action?: string; email?: string; note?: string };
  try {
    body = (await request.json()) as {
      action?: string;
      email?: string;
      note?: string;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", gate: "M2.2" },
      { status: 400 }
    );
  }

  const action = (body.action || "").trim().toLowerCase();
  const email = (body.email || "").trim();

  if (action !== "grant" && action !== "revoke") {
    return NextResponse.json(
      {
        error: 'action must be "grant" or "revoke"',
        gate: "M2.2",
      },
      { status: 400 }
    );
  }

  if (!email || !isEntitlementEmail(email)) {
    return NextResponse.json(
      { error: "Valid email required", gate: "M2.2" },
      { status: 400 }
    );
  }

  try {
    if (action === "grant") {
      const result = await upsertAdminPilotBuilderEntitlementDb({
        email,
        note: body.note,
      });
      if (!result.granted) {
        return NextResponse.json(
          { error: result.reason, gate: "M2.2" },
          { status: 400 }
        );
      }
      const entitlement = toPlanEntitlement(result.entitlement);
      return NextResponse.json({
        ok: true,
        gate: "M2.2",
        action: "grant",
        created: result.created,
        activeBuilder: hasActiveBuilderAccess(entitlement),
        entitlement: entitlement
          ? {
              email: entitlement.Email,
              tier: entitlement.Tier,
              status: entitlement.Status,
              grantedAt: entitlement.GrantedAt,
              updatedAt: entitlement.UpdatedAt,
              stripeSessionId: entitlement.StripeSessionId,
              pilotGrant: isAdminPilotSessionId(entitlement.StripeSessionId),
            }
          : null,
      });
    }

    const result = await revokeBuilderEntitlementDb({ email });
    if (!result.revoked) {
      return NextResponse.json(
        { error: result.reason, gate: "M2.2" },
        { status: 400 }
      );
    }
    const entitlement = toPlanEntitlement(result.entitlement);
    return NextResponse.json({
      ok: true,
      gate: "M2.2",
      action: "revoke",
      found: result.found,
      activeBuilder: hasActiveBuilderAccess(entitlement),
      entitlement: entitlement
        ? {
            email: entitlement.Email,
            tier: entitlement.Tier,
            status: entitlement.Status,
            grantedAt: entitlement.GrantedAt,
            updatedAt: entitlement.UpdatedAt,
            stripeSessionId: entitlement.StripeSessionId,
            pilotGrant: isAdminPilotSessionId(entitlement.StripeSessionId),
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to mutate entitlement:", error);
    return NextResponse.json(
      { error: "Failed to mutate entitlement", gate: "M2.2" },
      { status: 500 }
    );
  }
}
