import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  countActiveBuilderEntitlementsDb,
  countActivePilotBuilderEntitlementsDb,
  getPlanEntitlementByEmailDb,
  insertConversionEventDb,
  listActiveBuilderEntitlementsDb,
  revokeAllActivePilotBuilderEntitlementsDb,
  revokeBuilderEntitlementDb,
  toPlanEntitlement,
  upsertAdminPilotBuilderEntitlementDb,
} from "@/lib/db-service";
import {
  hasActiveBuilderAccess,
  isAdminPilotSessionId,
  isEntitlementEmail,
  toEntitlementListItem,
} from "@/lib/entitlements";

/**
 * GET /api/checkout/entitlements
 * Admin: paid Builder cohort (M2.2 entitlement gate).
 *   ?summary=1           → { activeBuilderSeats, activePilotSeats }
 *   ?list=1              → active seats (newest first)
 *   ?list=1&pilotOnly=1  → active admin pilot seats only
 *   ?email=user@x.com    → entitlement lookup (no secrets)
 *
 * POST /api/checkout/entitlements
 * Admin pilot grant/revoke while G7 Stripe keys pending:
 *   { "action":"grant"|"revoke", "email":"...", "note":"optional" }
 *   { "action":"revoke_all_pilots", "confirm":"REVOKE_ALL_PILOTS", "dryRun":true|false }
 * Records admin_pilot_grant / admin_pilot_revoke / admin_pilot_revoke_all funnel events.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const summary = request.nextUrl.searchParams.get("summary");
    if (summary === "1" || summary === "true") {
      const [activeBuilderSeats, activePilotSeats] = await Promise.all([
        countActiveBuilderEntitlementsDb(),
        countActivePilotBuilderEntitlementsDb(),
      ]);
      return NextResponse.json({
        ok: true,
        gate: "M2.2",
        activeBuilderSeats,
        activePilotSeats,
      });
    }

    const list = request.nextUrl.searchParams.get("list");
    if (list === "1" || list === "true") {
      const pilotOnlyRaw = request.nextUrl.searchParams.get("pilotOnly");
      const pilotOnly =
        pilotOnlyRaw === "1" || pilotOnlyRaw === "true";
      const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "50");
      const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
      const records = await listActiveBuilderEntitlementsDb({
        pilotOnly,
        limit,
      });
      const entitlements = records
        .map(toPlanEntitlement)
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map(toEntitlementListItem);
      return NextResponse.json({
        ok: true,
        gate: "M2.2",
        pilotOnly,
        count: entitlements.length,
        entitlements,
      });
    }

    const email = request.nextUrl.searchParams.get("email")?.trim() || "";
    if (!email) {
      return NextResponse.json(
        {
          error: "Provide ?summary=1, ?list=1, or ?email=",
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

  let body: {
    action?: string;
    email?: string;
    note?: string;
    confirm?: string;
    dryRun?: boolean;
  };
  try {
    body = (await request.json()) as {
      action?: string;
      email?: string;
      note?: string;
      confirm?: string;
      dryRun?: boolean;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", gate: "M2.2" },
      { status: 400 }
    );
  }

  const action = (body.action || "").trim().toLowerCase();

  if (action === "revoke_all_pilots") {
    try {
      const result = await revokeAllActivePilotBuilderEntitlementsDb({
        confirm: body.confirm,
        dryRun: body.dryRun,
      });
      if (!result.revoked) {
        return NextResponse.json(
          { error: result.reason, gate: "M2.2" },
          { status: 400 }
        );
      }
      if (!result.dryRun && result.count > 0) {
        try {
          await insertConversionEventDb(
            "admin_pilot_revoke_all",
            "/api/checkout/entitlements",
            {
              count: result.count,
              emails: result.emails,
            }
          );
        } catch (auditError) {
          console.error("Failed to record admin_pilot_revoke_all:", auditError);
        }
      }
      return NextResponse.json({
        ok: true,
        gate: "M2.2",
        action: "revoke_all_pilots",
        dryRun: result.dryRun,
        count: result.count,
        emails: result.emails,
      });
    } catch (error) {
      console.error("Failed to bulk revoke pilot entitlements:", error);
      return NextResponse.json(
        { error: "Failed to bulk revoke pilot entitlements", gate: "M2.2" },
        { status: 500 }
      );
    }
  }

  if (action !== "grant" && action !== "revoke") {
    return NextResponse.json(
      {
        error:
          'action must be "grant", "revoke", or "revoke_all_pilots"',
        gate: "M2.2",
      },
      { status: 400 }
    );
  }

  const email = (body.email || "").trim();

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
      try {
        await insertConversionEventDb("admin_pilot_grant", "/api/checkout/entitlements", {
          email: entitlement?.Email ?? email,
          created: result.created,
          note: body.note ?? null,
          sessionId: entitlement?.StripeSessionId ?? null,
        });
      } catch (auditError) {
        console.error("Failed to record admin_pilot_grant:", auditError);
      }
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
    try {
      await insertConversionEventDb("admin_pilot_revoke", "/api/checkout/entitlements", {
        email: entitlement?.Email ?? email,
        found: result.found,
        wasPilot: isAdminPilotSessionId(entitlement?.StripeSessionId),
      });
    } catch (auditError) {
      console.error("Failed to record admin_pilot_revoke:", auditError);
    }
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
