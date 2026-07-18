import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  countActiveBuilderEntitlementsDb,
  getPlanEntitlementByEmailDb,
  toPlanEntitlement,
} from "@/lib/db-service";
import { hasActiveBuilderAccess, isEntitlementEmail } from "@/lib/entitlements";

/**
 * GET /api/checkout/entitlements
 * Admin: paid Builder cohort (M2.2 entitlement gate).
 *   ?summary=1           → { activeBuilderSeats }
 *   ?email=user@x.com    → entitlement lookup (no secrets)
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
            // Omit Stripe ids from admin JSON? Keep session id for triage.
            stripeSessionId: entitlement.StripeSessionId,
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
