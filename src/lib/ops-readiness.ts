/**
 * Passport-readable ops readiness flags (no secret values).
 * Surfaces which founder/credential gates still block plan steps.
 */

import { isAppInsightsConfigured } from "./app-insights";
import { getStripeCheckoutPublicStatus } from "./stripe-checkout";

export type OpsReadiness = {
  asOfUtc: string;
  redditOAuthConfigured: boolean;
  passwordResetEmailConfigured: boolean;
  appInsightsConfigured: boolean;
  billingForwardSecretConfigured: boolean;
  checkout: ReturnType<typeof getStripeCheckoutPublicStatus>;
  openFounderGates: Array<{
    stepId: string;
    missing: string;
    action: string;
  }>;
};

function envSet(...names: string[]): boolean {
  return names.every((n) => Boolean(process.env[n]?.trim()));
}

export function isRedditOAuthConfigured(): boolean {
  return envSet("REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET");
}

export function isPasswordResetEmailConfigured(): boolean {
  const apiKey = Boolean(process.env.SENDGRID_API_KEY?.trim());
  const from = Boolean(
    process.env.PASSWORD_RESET_FROM_EMAIL?.trim() ||
      process.env.SENDGRID_FROM_EMAIL?.trim()
  );
  return apiKey && from;
}

export function isBillingForwardSecretConfigured(): boolean {
  return Boolean(process.env.BREIVAX_BILLING_FORWARD_SECRET?.trim());
}

/**
 * Booleans only — safe for public /api/health (no secret names beyond known keys).
 */
export function getPublicOpsFlags() {
  return {
    redditOAuthConfigured: isRedditOAuthConfigured(),
    passwordResetEmailConfigured: isPasswordResetEmailConfigured(),
    appInsightsConfigured: isAppInsightsConfigured(),
    billingForwardSecretConfigured: isBillingForwardSecretConfigured(),
  };
}

export function getOpsReadiness(): OpsReadiness {
  const flags = getPublicOpsFlags();
  const checkout = getStripeCheckoutPublicStatus();
  const openFounderGates: OpsReadiness["openFounderGates"] = [];

  if (!flags.redditOAuthConfigured) {
    openFounderGates.push({
      stepId: "problems4us-11a",
      missing: "REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET",
      action:
        "Set Reddit OAuth on problems4us-linux, or formally accept GitHub+HN-only via problems4us-11f.",
    });
  }
  if (!flags.passwordResetEmailConfigured) {
    openFounderGates.push({
      stepId: "problems4us-22a",
      missing: "SENDGRID_API_KEY + PASSWORD_RESET_FROM_EMAIL",
      action:
        "Wire SendGrid (or equivalent) so forgot-password emails without admin issue tokens.",
    });
  }
  if (!flags.appInsightsConfigured) {
    openFounderGates.push({
      stepId: "problems4us-30a",
      missing: "APPLICATIONINSIGHTS_CONNECTION_STRING",
      action:
        "Create/reuse App Insights and set connection string on problems4us-linux.",
    });
  }
  if (!checkout.checkoutReady) {
    openFounderGates.push({
      stepId: "problems4us-09b",
      missing: "centralized Stripe / BREIVAX_BILLING_FORWARD_SECRET",
      action:
        "Complete centralized billing.breivax.com webhook path, or approve invite-only as production paid path (09f).",
    });
  }

  return {
    asOfUtc: new Date().toISOString(),
    ...flags,
    checkout,
    openFounderGates,
  };
}
