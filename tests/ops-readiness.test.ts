/**
 * @jest-environment node
 */
import {
  getOpsReadiness,
  getPublicOpsFlags,
  isPasswordResetEmailConfigured,
} from "@/lib/ops-readiness";

describe("ops-readiness", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("reports false flags when secrets unset", () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.PASSWORD_RESET_FROM_EMAIL;
    delete process.env.SENDGRID_FROM_EMAIL;
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.BREIVAX_BILLING_FORWARD_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_BUILDER_MONTHLY;

    expect(isPasswordResetEmailConfigured()).toBe(false);
    const flags = getPublicOpsFlags();
    expect(flags.passwordResetEmailConfigured).toBe(false);
    expect(flags.appInsightsConfigured).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(flags, "redditOAuthConfigured")
    ).toBe(false);

    const readiness = getOpsReadiness();
    expect(readiness.openFounderGates.length).toBeGreaterThanOrEqual(2);
    expect(readiness.openFounderGates.map((g) => g.stepId)).toEqual(
      expect.arrayContaining([
        "problems4us-22a",
        "problems4us-30a",
        "problems4us-09b",
      ])
    );
    expect(readiness.openFounderGates.map((g) => g.stepId)).not.toContain(
      "problems4us-11a"
    );
  });

  it("detects sendgrid when configured", () => {
    process.env.SENDGRID_API_KEY = "sg";
    process.env.PASSWORD_RESET_FROM_EMAIL = "noreply@problems4us.com";
    expect(isPasswordResetEmailConfigured()).toBe(true);
  });

  it("open founder gates never include removed Reddit step 11a", () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.STRIPE_SECRET_KEY;
    const stepIds = getOpsReadiness().openFounderGates.map((g) => g.stepId);
    expect(stepIds).not.toContain("problems4us-11a");
    expect(new Set(stepIds).size).toBe(stepIds.length);
  });
});

