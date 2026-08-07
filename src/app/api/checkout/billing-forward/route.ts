import { NextRequest, NextResponse } from "next/server";
import {
  countActivePaidBuilderEntitlementsDb,
  getPlanEntitlementByEmailDb,
  insertPaidEarlyAccessEventDb,
  toPlanEntitlement,
  upsertPaidBuilderEntitlementDb,
} from "@/lib/db-service";
import {
  decideFoundingCohortCap,
  FOUNDING_COHORT_CAP,
} from "@/lib/founding-cohort";
import { hasActiveBuilderAccess } from "@/lib/entitlements";
import {
  billingForwardNotConfiguredMessage,
  extractPaidEarlyAccessFromForwardPayload,
  getBreivaxBillingForwardSecret,
  verifyBillingForwardSecret,
  type BillingForwardPaidPayload,
} from "@/lib/stripe-checkout";

/**
 * POST /api/checkout/billing-forward
 *
 * HOLD-safe consumer for centralized Stripe (billing.breivax.com):
 * accepts a normalized paid payload after central verification.
 * Does NOT require STRIPE_WEBHOOK_SECRET on problems4us-linux.
 * Fail-closed until BREIVAX_BILLING_FORWARD_SECRET is set by Founder/Passport.
 */
export async function POST(request: NextRequest) {
  const secret = getBreivaxBillingForwardSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error: billingForwardNotConfiguredMessage(),
        gate: "G7-forward",
        configured: false,
      },
      { status: 503 }
    );
  }

  const provided =
    request.headers.get("x-breivax-billing-forward-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;

  if (!verifyBillingForwardSecret(provided, secret)) {
    return NextResponse.json(
      { error: "Unauthorized billing forward", gate: "G7-forward" },
      { status: 401 }
    );
  }

  let body: BillingForwardPaidPayload;
  try {
    body = (await request.json()) as BillingForwardPaidPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", gate: "G7-forward" },
      { status: 400 }
    );
  }

  const extracted = extractPaidEarlyAccessFromForwardPayload(body);
  if (!extracted.ok) {
    return NextResponse.json(
      { error: extracted.error, gate: "G7-forward" },
      { status: 400 }
    );
  }

  const paid = extracted.paid;
  let created = true;
  try {
    const result = await insertPaidEarlyAccessEventDb(
      "/api/checkout/billing-forward",
      {
        sessionId: paid.sessionId,
        email: paid.email,
        tier: paid.tier,
        paymentStatus: paid.paymentStatus,
        stripeEventId: paid.eventId,
      }
    );
    created = result.created;
  } catch (error) {
    console.error("billing-forward: failed to record paid_early_access:", error);
    return NextResponse.json(
      {
        error: "Authorized but failed to record paid_early_access",
        gate: "G7-forward",
        configured: true,
      },
      { status: 500 }
    );
  }

  let entitlement:
    | { granted: true; created: boolean }
    | { granted: false; reason: string }
    | null = null;
  try {
    const email = paid.email || "";
    let allowExisting = false;
    if (email) {
      const existing = await getPlanEntitlementByEmailDb(email);
      allowExisting = hasActiveBuilderAccess(toPlanEntitlement(existing));
    }
    if (!allowExisting) {
      const activePaidSeats = await countActivePaidBuilderEntitlementsDb();
      const cap = decideFoundingCohortCap({ activePaidSeats });
      if (!cap.ok) {
        entitlement = {
          granted: false,
          reason: `${cap.reason} (foundingCap=${FOUNDING_COHORT_CAP})`,
        };
        return NextResponse.json({
          received: true,
          gate: "G7-forward",
          configured: true,
          handled: true,
          duplicate: !created,
          event: "paid_early_access",
          sessionId: paid.sessionId,
          entitlement,
          foundingCap: FOUNDING_COHORT_CAP,
          activePaidSeats: cap.activePaidSeats,
        });
      }
    }

    const grant = await upsertPaidBuilderEntitlementDb({
      email,
      sessionId: paid.sessionId,
      stripeEventId: paid.eventId || "",
      paymentStatus: paid.paymentStatus,
    });
    if (grant.granted) {
      entitlement = { granted: true, created: grant.created };
    } else {
      entitlement = { granted: false, reason: grant.reason };
    }
  } catch (error) {
    console.error("billing-forward: entitlement upsert failed:", error);
    entitlement = {
      granted: false,
      reason: "Entitlement upsert failed after paid event recorded",
    };
  }

  return NextResponse.json({
    received: true,
    gate: "G7-forward",
    configured: true,
    handled: true,
    duplicate: !created,
    event: "paid_early_access",
    sessionId: paid.sessionId,
    entitlement,
  });
}
