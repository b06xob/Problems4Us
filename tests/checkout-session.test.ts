import {
  getStripeCheckoutConfig,
  stripeCheckoutNotConfiguredMessage,
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
});
