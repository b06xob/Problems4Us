import { NextRequest, NextResponse } from "next/server";
import { insertPaidEarlyAccessEventDb } from "@/lib/db-service";
import {
  extractPaidEarlyAccessFromEvent,
  getStripeWebhookSecret,
  parseStripeWebhookEvent,
  stripeWebhookNotConfiguredMessage,
  verifyStripeWebhookSignature,
} from "@/lib/stripe-checkout";

/**
 * POST /api/checkout/webhook
 * Month-1: fail closed until STRIPE_WEBHOOK_SECRET is set.
 * When set: verify Stripe-Signature, ack events, record paid_early_access
 * on checkout.session.completed (idempotent by stripeEventId).
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

  const payload = await request.text();
  const verified = verifyStripeWebhookSignature(payload, signature, secret);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error, gate: "G7" },
      { status: 400 }
    );
  }

  const parsed = parseStripeWebhookEvent(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, gate: "G7" },
      { status: 400 }
    );
  }

  const paid = extractPaidEarlyAccessFromEvent(parsed.event);
  if (!paid) {
    return NextResponse.json({
      received: true,
      gate: "G7",
      configured: true,
      handled: false,
      type: parsed.event.type || null,
    });
  }

  let created = true;
  try {
    const result = await insertPaidEarlyAccessEventDb("/api/checkout/webhook", {
      sessionId: paid.sessionId,
      email: paid.email,
      tier: paid.tier,
      paymentStatus: paid.paymentStatus,
      stripeEventId: paid.eventId,
    });
    created = result.created;
  } catch (error) {
    console.error("Failed to record paid_early_access:", error);
    return NextResponse.json(
      {
        error: "Verified event but failed to record paid_early_access",
        gate: "G7",
        configured: true,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    gate: "G7",
    configured: true,
    handled: true,
    duplicate: !created,
    event: "paid_early_access",
    sessionId: paid.sessionId,
  });
}
