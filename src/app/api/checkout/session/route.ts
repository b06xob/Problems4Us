import { NextRequest, NextResponse } from "next/server";
import {
  createBuilderCheckoutSession,
  getStripeCheckoutConfig,
  stripeCheckoutNotConfiguredMessage,
} from "@/lib/stripe-checkout";

/**
 * POST /api/checkout/session
 * Month-1: fail closed (503) until Stripe secrets are set.
 * When secrets are present: create Stripe Checkout Session for Builder tier.
 */
export async function POST(request: NextRequest) {
  const config = getStripeCheckoutConfig();
  if (!config) {
    return NextResponse.json(
      {
        error: stripeCheckoutNotConfiguredMessage(),
        gate: "G7",
        configured: false,
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
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    gate: "G7",
    configured: true,
    ready: true,
    sessionId: result.sessionId,
    url: result.url,
  });
}
