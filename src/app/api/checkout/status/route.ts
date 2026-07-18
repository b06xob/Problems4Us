import { NextResponse } from "next/server";
import { getStripeCheckoutPublicStatus } from "@/lib/stripe-checkout";

/**
 * GET /api/checkout/status
 * Public G7 readiness (booleans only — no secrets).
 * Pricing UI uses this to switch Builder CTA to Stripe when keys are set.
 */
export async function GET() {
  return NextResponse.json(getStripeCheckoutPublicStatus());
}
