import { NextRequest, NextResponse } from "next/server";
import {
  countActivePaidBuilderEntitlementsDb,
  insertConversionEventDb,
} from "@/lib/db-service";
import {
  decideFoundingCohortCap,
  FOUNDING_COHORT_CAP,
} from "@/lib/founding-cohort";
import {
  createBuilderCheckoutSession,
  getStripeCheckoutConfig,
  getStripeCheckoutPublicStatus,
  stripeCheckoutNotReadyMessage,
} from "@/lib/stripe-checkout";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";

/**
 * POST /api/checkout/session
 * Fail closed until checkoutReady (session secrets + paid path:
 * BREIVAX_BILLING_FORWARD_SECRET preferred, or STRIPE_WEBHOOK_SECRET).
 * When ready: create Stripe Checkout Session for Builder founding tier.
 * Enforces 25-seat founding cohort cap.
 */
export async function POST(request: NextRequest) {
  const limited = decideRateLimit(
    PUBLIC_RATE_LIMITS["checkout-session"],
    extractClientIp(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: limited.error },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const publicStatus = getStripeCheckoutPublicStatus();
  const config = getStripeCheckoutConfig();
  if (!publicStatus.checkoutReady || !config) {
    return NextResponse.json(
      {
        error: stripeCheckoutNotReadyMessage(publicStatus),
        configured: publicStatus.sessionConfigured,
        ...publicStatus,
      },
      { status: 503 }
    );
  }

  let body: { tier?: string; email?: string } = {};
  try {
    body = (await request.json()) as { tier?: string; email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let activePaidSeats = 0;
  try {
    activePaidSeats = await countActivePaidBuilderEntitlementsDb();
  } catch (error) {
    console.error("checkout/session: founding seat count failed:", error);
    return NextResponse.json(
      {
        error: "Could not verify founding cohort availability",
        gate: "G7",
        foundingCap: FOUNDING_COHORT_CAP,
      },
      { status: 503 }
    );
  }

  const cap = decideFoundingCohortCap({ activePaidSeats });
  if (!cap.ok) {
    return NextResponse.json(
      {
        error: cap.reason,
        gate: "G7-founding",
        foundingCap: FOUNDING_COHORT_CAP,
        activePaidSeats: cap.activePaidSeats,
        checkoutReady: true,
      },
      { status: 409 }
    );
  }

  const result = await createBuilderCheckoutSession(config, {
    tier: body.tier,
    email: body.email,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        gate: "G7",
        configured: true,
        checkoutReady: true,
      },
      { status: result.status }
    );
  }

  try {
    await insertConversionEventDb(
      "checkout_session_created",
      "/api/checkout/session",
      {
        sessionId: result.sessionId,
        tier: body.tier || "builder",
        hasEmail: Boolean(body.email?.trim()),
        foundingCohort: true,
        foundingRemaining: cap.remaining,
      }
    );
  } catch (error) {
    // Session is already created at Stripe — do not fail the redirect.
    console.error("Failed to record checkout_session_created:", error);
  }

  return NextResponse.json({
    gate: "G7",
    configured: true,
    ready: true,
    checkoutReady: true,
    sessionId: result.sessionId,
    url: result.url,
    foundingCap: FOUNDING_COHORT_CAP,
    foundingRemaining: cap.remaining,
  });
}
