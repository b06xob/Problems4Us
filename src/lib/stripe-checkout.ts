/**
 * Stripe checkout readiness + session create (G7 / Month-2).
 * Month-1 ships fail-closed when secrets are missing; when present,
 * creates Checkout Sessions via Stripe REST (no SDK dependency).
 */

export type StripeCheckoutConfig = {
  secretKey: string;
  priceBuilderMonthly: string;
  appUrl: string;
};

export type CreateCheckoutSessionInput = {
  email?: string;
  tier?: string;
};

export type CreateCheckoutSessionResult =
  | { ok: true; sessionId: string; url: string }
  | { ok: false; status: number; error: string };

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

export function getStripeWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  return secret || null;
}

export function stripeWebhookNotConfiguredMessage(): string {
  return "Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET (Month-2 / G7).";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Create a Stripe Checkout Session for Builder Early Access via REST.
 * Injectable fetch for unit tests.
 */
export async function createBuilderCheckoutSession(
  config: StripeCheckoutConfig,
  input: CreateCheckoutSessionInput = {},
  fetchImpl: typeof fetch = fetch
): Promise<CreateCheckoutSessionResult> {
  const tier = (input.tier || "builder").trim() || "builder";
  if (tier !== "builder") {
    return { ok: false, status: 400, error: "Only tier=builder is supported" };
  }

  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email && !isValidEmail(email)) {
    return { ok: false, status: 400, error: "Invalid email" };
  }

  const successUrl = `${config.appUrl.replace(/\/$/, "")}/pricing?checkout=success`;
  const cancelUrl = `${config.appUrl.replace(/\/$/, "")}/pricing?checkout=cancel`;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", config.priceBuilderMonthly);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[tier]", "builder");
  params.set("metadata[product]", "Problems4Us");
  if (email) {
    params.set("customer_email", email);
  }

  const response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const raw = await response.text();
  let data: { id?: string; url?: string; error?: { message?: string } } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return {
      ok: false,
      status: 502,
      error: "Stripe returned a non-JSON response",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      error: data.error?.message || "Stripe Checkout Session create failed",
    };
  }

  if (!data.id || !data.url) {
    return {
      ok: false,
      status: 502,
      error: "Stripe Checkout Session missing id or url",
    };
  }

  return { ok: true, sessionId: data.id, url: data.url };
}
