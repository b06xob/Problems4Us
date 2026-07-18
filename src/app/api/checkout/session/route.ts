import { NextRequest, NextResponse } from "next/server";
import { insertConversionEventDb } from "@/lib/db-service";
import {
  createBuilderCheckoutSession,
  getStripeCheckoutConfig,
  getStripeCheckoutPublicStatus,
  stripeCheckoutNotReadyMessage,
} from "@/lib/stripe-checkout";

/**
 * POST /api/checkout/session
 * Month-1: fail closed (503) until checkoutReady (session + webhook secrets).
 * When ready: create Stripe Checkout Session for Builder tier and record funnel event.
 */
export async function POST(request: NextRequest) {
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
  });
}
