/**
 * Stripe checkout readiness + session create (G7 / Month-2).
 * Month-1 ships fail-closed when secrets are missing; when present,
 * creates Checkout Sessions via Stripe REST (no SDK dependency).
 * Webhook: HMAC signature verify + checkout.session.completed → paid_early_access.
 */

import { createHmac, timingSafeEqual } from "crypto";

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

export type StripeWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      object?: string;
      customer_email?: string | null;
      customer_details?: { email?: string | null } | null;
      metadata?: Record<string, string> | null;
      payment_status?: string | null;
      status?: string | null;
    };
  };
};

export type PaidEarlyAccessProps = {
  sessionId: string;
  email: string | null;
  tier: string;
  paymentStatus: string | null;
  eventId: string | null;
};

export type VerifyStripeWebhookResult =
  | { ok: true }
  | { ok: false; error: string };

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

/** Public readiness flags — never includes secret values. */
export type StripeCheckoutPublicStatus = {
  gate: "G7";
  sessionConfigured: boolean;
  webhookConfigured: boolean;
  checkoutReady: boolean;
};

export function getStripeCheckoutPublicStatus(): StripeCheckoutPublicStatus {
  const sessionConfigured = getStripeCheckoutConfig() !== null;
  const webhookConfigured = getStripeWebhookSecret() !== null;
  // Ready only when session create AND webhook verify are both configured —
  // otherwise paid_early_access would never be recorded after checkout.
  return {
    gate: "G7",
    sessionConfigured,
    webhookConfigured,
    checkoutReady: sessionConfigured && webhookConfigured,
  };
}

/** Session create requires checkoutReady (session + webhook), not session alone. */
export function stripeCheckoutNotReadyMessage(
  status: StripeCheckoutPublicStatus = getStripeCheckoutPublicStatus()
): string {
  if (status.checkoutReady) {
    return "Stripe checkout is ready.";
  }
  const missing: string[] = [];
  if (!status.sessionConfigured) {
    missing.push("STRIPE_SECRET_KEY + STRIPE_PRICE_BUILDER_MONTHLY");
  }
  if (!status.webhookConfigured) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }
  return `Stripe checkout is not ready (G7). Missing: ${missing.join("; ") || "configuration"}.`;
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

  // Email is required so paid webhooks can grant PlanEntitlements (M2.2).
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!email) {
    return {
      ok: false,
      status: 400,
      error: "Email is required to start Builder checkout",
    };
  }
  if (!isValidEmail(email)) {
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
  params.set("customer_email", email);

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

const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

function parseStripeSignatureHeader(
  header: string
): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(",").map((p) => p.trim());
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      timestamp = n;
    } else if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verify Stripe-Signature header (t=,v1=) with HMAC-SHA256.
 * Injectable nowSeconds for unit tests.
 */
export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  options?: { toleranceSeconds?: number; nowSeconds?: number }
): VerifyStripeWebhookResult {
  if (!secret) {
    return { ok: false, error: "Webhook secret is empty" };
  }
  if (!signatureHeader?.trim()) {
    return { ok: false, error: "Missing stripe-signature header" };
  }

  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) {
    return { ok: false, error: "Malformed stripe-signature header" };
  }

  const tolerance =
    options?.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  const now =
    options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) {
    return { ok: false, error: "Stripe webhook timestamp outside tolerance" };
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const match = parsed.signatures.some((sig) => safeEqualHex(expected, sig));
  if (!match) {
    return { ok: false, error: "Stripe webhook signature mismatch" };
  }

  return { ok: true };
}

export function parseStripeWebhookEvent(
  payload: string
): { ok: true; event: StripeWebhookEvent } | { ok: false; error: string } {
  try {
    const event = JSON.parse(payload) as StripeWebhookEvent;
    if (!event || typeof event !== "object") {
      return { ok: false, error: "Webhook payload is not an object" };
    }
    return { ok: true, event };
  } catch {
    return { ok: false, error: "Webhook payload is not valid JSON" };
  }
}

/**
 * Map checkout.session.completed to paid_early_access funnel props.
 * Returns null for other event types (caller should ack without recording).
 */
export function extractPaidEarlyAccessFromEvent(
  event: StripeWebhookEvent
): PaidEarlyAccessProps | null {
  if (event.type !== "checkout.session.completed") return null;

  const obj = event.data?.object;
  if (!obj?.id) return null;

  const rawEmail =
    (typeof obj.customer_email === "string" && obj.customer_email.trim()) ||
    (typeof obj.customer_details?.email === "string" &&
      obj.customer_details.email.trim()) ||
    "";

  const tier =
    (obj.metadata?.tier && String(obj.metadata.tier).trim()) || "builder";

  return {
    sessionId: obj.id,
    email: rawEmail ? rawEmail.toLowerCase() : null,
    tier,
    paymentStatus: obj.payment_status ? String(obj.payment_status) : null,
    eventId: event.id ? String(event.id) : null,
  };
}
