/**
 * Stripe checkout readiness (G7 / Month-2).
 * Month-1 ships a fail-closed gate so the route exists without charging.
 */

export type StripeCheckoutConfig = {
  secretKey: string;
  priceBuilderMonthly: string;
  appUrl: string;
};

export function getStripeCheckoutConfig(): StripeCheckoutConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
  const priceBuilderMonthly =
    process.env.STRIPE_PRICE_BUILDER_MONTHLY?.trim() || "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://problems4us.com";

  if (!secretKey || !priceBuilderMonthly) {
    return null;
  }

  return { secretKey, priceBuilderMonthly, appUrl };
}

export function stripeCheckoutNotConfiguredMessage(): string {
  return "Stripe checkout is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_BUILDER_MONTHLY (Month-2 / G7).";
}
