import { NextRequest, NextResponse } from "next/server";
import {
  getStripeWebhookSecret,
  stripeWebhookNotConfiguredMessage,
} from "@/lib/stripe-checkout";

/**
 * POST /api/checkout/webhook
 * Month-1: fail closed until STRIPE_WEBHOOK_SECRET is set.
 * Month-2: verify signature and handle checkout.session.completed.
 */
export async function POST(request: NextRequest) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error: stripeWebhookNotConfiguredMessage(),
        gate: "G7",
        configured: false,
      },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header", gate: "G7" },
      { status: 400 }
    );
  }

  // Secrets present — signature verification + event handling land with live keys.
  // Acknowledge receipt shape without marking paid until verifier is wired.
  await request.text();
  return NextResponse.json(
    {
      error:
        "Stripe webhook signature verification is not implemented yet. Secret detected; wire verifier next.",
      gate: "G7",
      configured: true,
      ready: false,
    },
    { status: 501 }
  );
}
