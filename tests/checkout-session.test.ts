import {
  createBuilderCheckoutSession,
  getStripeCheckoutConfig,
  getStripeWebhookSecret,
  stripeCheckoutNotConfiguredMessage,
  stripeWebhookNotConfiguredMessage,
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
      {},
      fetchImpl as unknown as typeof fetch
    );

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Invalid API Key provided",
    });
  });
});
