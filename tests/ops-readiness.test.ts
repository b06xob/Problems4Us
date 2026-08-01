/**
 * @jest-environment node
 */
import {
  getOpsReadiness,
  getPublicOpsFlags,
  isPasswordResetEmailConfigured,
  isRedditOAuthConfigured,
} from "@/lib/ops-readiness";

describe("ops-readiness", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("reports false flags when secrets unset", () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.PASSWORD_RESET_FROM_EMAIL;
    delete process.env.SENDGRID_FROM_EMAIL;
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.BREIVAX_BILLING_FORWARD_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_BUILDER_MONTHLY;

    expect(isRedditOAuthConfigured()).toBe(false);
    expect(isPasswordResetEmailConfigured()).toBe(false);
    const flags = getPublicOpsFlags();
    expect(flags.redditOAuthConfigured).toBe(false);
    expect(flags.passwordResetEmailConfigured).toBe(false);
    expect(flags.appInsightsConfigured).toBe(false);

    const readiness = getOpsReadiness();
    expect(readiness.openFounderGates.length).toBeGreaterThanOrEqual(3);
    expect(readiness.openFounderGates.map((g) => g.stepId)).toEqual(
      expect.arrayContaining([
        "problems4us-11a",
        "problems4us-22a",
        "problems4us-30a",
        "problems4us-09b",
      ])
    );
  });

  it("detects reddit + sendgrid when configured", () => {
    process.env.REDDIT_CLIENT_ID = "id";
    process.env.REDDIT_CLIENT_SECRET = "secret";
    process.env.SENDGRID_API_KEY = "sg";
    process.env.PASSWORD_RESET_FROM_EMAIL = "noreply@problems4us.com";
    expect(isRedditOAuthConfigured()).toBe(true);
    expect(isPasswordResetEmailConfigured()).toBe(true);
  });
});
