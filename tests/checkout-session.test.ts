import { createHmac } from "crypto";
import {
  createBuilderCheckoutSession,
  extractPaidEarlyAccessFromEvent,
  getStripeCheckoutConfig,
  getStripeCheckoutPublicStatus,
  getStripeWebhookSecret,
  parseStripeWebhookEvent,
  stripeCheckoutNotConfiguredMessage,
  stripeCheckoutNotReadyMessage,
  stripeWebhookNotConfiguredMessage,
  verifyStripeWebhookSignature,
} from "@/lib/stripe-checkout";

describe("Stripe checkout gate (G7 prep)", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("returns null when Stripe secrets are missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_BUILDER_MONTHLY;
    expect(getStripeCheckoutConfig()).toBeNull();
  });

  it("returns null when only secret key is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    delete process.env.STRIPE_PRICE_BUILDER_MONTHLY;
    expect(getStripeCheckoutConfig()).toBeNull();
  });

  it("returns config when secret + price are set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_BUILDER_MONTHLY = "price_builder";
    process.env.NEXT_PUBLIC_APP_URL = "https://problems4us.com";
    expect(getStripeCheckoutConfig()).toEqual({
      secretKey: "sk_test_x",
      priceBuilderMonthly: "price_builder",
      appUrl: "https://problems4us.com",
    });
  });

  it("exposes a clear not-configured message", () => {
    expect(stripeCheckoutNotConfiguredMessage()).toMatch(/STRIPE_SECRET_KEY/);
    expect(stripeCheckoutNotConfiguredMessage()).toMatch(/G7/);
  });

  it("webhook secret helper is null when unset", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(getStripeWebhookSecret()).toBeNull();
    expect(stripeWebhookNotConfiguredMessage()).toMatch(/STRIPE_WEBHOOK_SECRET/);
  });

  it("exposes public checkout status without secrets", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_BUILDER_MONTHLY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(getStripeCheckoutPublicStatus()).toEqual({
      gate: "G7",
      sessionConfigured: false,
      webhookConfigured: false,
      checkoutReady: false,
    });

    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_BUILDER_MONTHLY = "price_builder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    expect(getStripeCheckoutPublicStatus()).toEqual({
      gate: "G7",
      sessionConfigured: true,
      webhookConfigured: true,
      checkoutReady: true,
    });
  });

  it("keeps checkoutReady false until webhook secret is also set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_BUILDER_MONTHLY = "price_builder";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(getStripeCheckoutPublicStatus()).toEqual({
      gate: "G7",
      sessionConfigured: true,
      webhookConfigured: false,
      checkoutReady: false,
    });
  });

  it("not-ready message names missing webhook when session secrets alone are set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_BUILDER_MONTHLY = "price_builder";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(stripeCheckoutNotReadyMessage()).toMatch(/STRIPE_WEBHOOK_SECRET/);
    expect(stripeCheckoutNotReadyMessage()).toMatch(/not ready/);
  });

  it("not-ready message is clear when fully ready", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_BUILDER_MONTHLY = "price_builder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    expect(stripeCheckoutNotReadyMessage()).toMatch(/ready/i);
  });

  it("creates a checkout session via Stripe REST when configured", async () => {
    const config = {
      secretKey: "sk_test_x",
      priceBuilderMonthly: "price_builder",
      appUrl: "https://problems4us.com",
    };

    const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body || "");
      expect(body).toContain("line_items%5B0%5D%5Bprice%5D=price_builder");
      expect(body).toContain("customer_email=pilot%40example.com");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/c/pay/cs_test_123",
          }),
      } as Response;
    });

    const result = await createBuilderCheckoutSession(
      config,
      { email: "pilot@example.com", tier: "builder" },
      fetchImpl as unknown as typeof fetch
    );

    expect(result).toEqual({
      ok: true,
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects missing email before calling Stripe", async () => {
    const fetchImpl = jest.fn();
    const result = await createBuilderCheckoutSession(
      {
        secretKey: "sk_test_x",
        priceBuilderMonthly: "price_builder",
        appUrl: "https://problems4us.com",
      },
      {},
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Email is required to start Builder checkout",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects invalid email before calling Stripe", async () => {
    const fetchImpl = jest.fn();
    const result = await createBuilderCheckoutSession(
      {
        secretKey: "sk_test_x",
        priceBuilderMonthly: "price_builder",
        appUrl: "https://problems4us.com",
      },
      { email: "not-an-email" },
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid email" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps Stripe API errors", async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({ error: { message: "Invalid API Key provided" } }),
    }));

    const result = await createBuilderCheckoutSession(
      {
        secretKey: "sk_bad",
        priceBuilderMonthly: "price_builder",
        appUrl: "https://problems4us.com",
      },
      { email: "pilot@example.com" },
      fetchImpl as unknown as typeof fetch
    );

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Invalid API Key provided",
    });
  });
});

describe("Stripe webhook signature + paid_early_access (G7 prep)", () => {
  function sign(payload: string, secret: string, t: number): string {
    const v1 = createHmac("sha256", secret)
      .update(`${t}.${payload}`, "utf8")
      .digest("hex");
    return `t=${t},v1=${v1}`;
  }

  it("accepts a valid Stripe-Signature", () => {
    const secret = "whsec_test";
    const payload = '{"id":"evt_1","type":"ping"}';
    const t = 1_700_000_000;
    const header = sign(payload, secret, t);
    expect(
      verifyStripeWebhookSignature(payload, header, secret, {
        nowSeconds: t,
      })
    ).toEqual({ ok: true });
  });

  it("rejects forged signatures", () => {
    const secret = "whsec_test";
    const payload = '{"id":"evt_1"}';
    const t = 1_700_000_000;
    const header = sign(payload, "wrong_secret", t);
    const result = verifyStripeWebhookSignature(payload, header, secret, {
      nowSeconds: t,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/mismatch/i);
    }
  });

  it("rejects timestamps outside tolerance", () => {
    const secret = "whsec_test";
    const payload = "{}";
    const t = 1_700_000_000;
    const header = sign(payload, secret, t);
    const result = verifyStripeWebhookSignature(payload, header, secret, {
      nowSeconds: t + 901,
      toleranceSeconds: 300,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/tolerance/i);
    }
  });

  it("extracts paid_early_access props from checkout.session.completed", () => {
    const parsed = parseStripeWebhookEvent(
      JSON.stringify({
        id: "evt_paid",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_abc",
            object: "checkout.session",
            customer_email: "Pilot@Example.com",
            payment_status: "paid",
            metadata: { tier: "builder", product: "Problems4Us" },
          },
        },
      })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(extractPaidEarlyAccessFromEvent(parsed.event)).toEqual({
      sessionId: "cs_test_abc",
      email: "pilot@example.com",
      tier: "builder",
      paymentStatus: "paid",
      eventId: "evt_paid",
    });
  });

  it("ignores non-checkout events", () => {
    expect(
      extractPaidEarlyAccessFromEvent({
        id: "evt_x",
        type: "customer.created",
        data: { object: { id: "cus_1" } },
      })
    ).toBeNull();
  });
});
