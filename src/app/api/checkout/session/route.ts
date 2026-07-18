import { NextRequest, NextResponse } from "next/server";
import {
  getStripeCheckoutConfig,
  stripeCheckoutNotConfiguredMessage,
} from "@/lib/stripe-checkout";

/**
 * POST /api/checkout/session
 * Month-1: fail closed until Stripe secrets are set (G7 prep).
 * Month-2: create Stripe Checkout Session for Builder Early Access.
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

  const tier = typeof body.tier === "string" ? body.tier.trim() : "builder";
  if (tier !== "builder") {
    return NextResponse.json(
      { error: "Only tier=builder is supported" },
      { status: 400 }
    );
  }

  // Secrets present but Stripe SDK not wired yet — still fail closed with a clear signal.
  return NextResponse.json(
    {
      error:
        "Stripe Checkout Session creation is not implemented yet. Secrets detected; implement session create next.",
      gate: "G7",
      configured: true,
      ready: false,
    },
    { status: 501 }
  );
}
