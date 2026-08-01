import type { ConversionFunnelCounts } from "@/lib/conversion-events";
import type { StripeCheckoutPublicStatus } from "@/lib/stripe-checkout";

/** Passport-readable visits → activated → paid funnel (problems4us-12c). */
export type FunnelKpiRollup = {
  stepId: "problems4us-12c";
  gate: "M2.5";
  windowHours: number;
  visits: {
    proxy: string;
    pricing_view: number;
    waitlist_view: number;
  };
  waitlist: {
    totalRecords: number;
  };
  activated: {
    totalAccounts: number;
    activatedAccounts: number;
    rule: string;
  };
  paidOrEntitledSeats: {
    activeBuilderSeats: number;
    activePilotSeats: number;
    stripePaidEarlyAccessEvents: number;
    checkoutReady: boolean;
    definition: string;
  };
  otherEvents: {
    builder_brief_export: number;
    builder_brief_share: number;
    builder_brief_share_view: number;
    admin_pilot_grant: number;
    admin_pilot_revoke: number;
    total: number;
  };
  checkout: StripeCheckoutPublicStatus;
};

const ACTIVATION_RULE = "saved_problems>=3 OR saved_ideas>=1";

const PAID_SEAT_DEFINITION =
  "Invite/pilot Builder seats (problems4us-09a) count as entitled/paid seats until centralized Stripe (09b) is live; Stripe paid_early_access remains 0 while checkoutReady=false.";

/**
 * Pure builder — unit-testable join of slice APIs into one Passport artifact.
 */
export function buildFunnelKpiRollup(input: {
  windowHours: number;
  eventCounts: ConversionFunnelCounts;
  waitlistTotal: number;
  totalAccounts: number;
  activatedAccounts: number;
  activeBuilderSeats: number;
  activePilotSeats: number;
  checkout: StripeCheckoutPublicStatus;
}): FunnelKpiRollup {
  const c = input.eventCounts;
  return {
    stepId: "problems4us-12c",
    gate: "M2.5",
    windowHours: input.windowHours,
    visits: {
      proxy: "instrumented page views via conversion events",
      pricing_view: c.pricing_view,
      waitlist_view: c.waitlist_view,
    },
    waitlist: {
      totalRecords: input.waitlistTotal,
    },
    activated: {
      totalAccounts: input.totalAccounts,
      activatedAccounts: input.activatedAccounts,
      rule: ACTIVATION_RULE,
    },
    paidOrEntitledSeats: {
      activeBuilderSeats: input.activeBuilderSeats,
      activePilotSeats: input.activePilotSeats,
      stripePaidEarlyAccessEvents: c.paid_early_access,
      checkoutReady: input.checkout.checkoutReady,
      definition: PAID_SEAT_DEFINITION,
    },
    otherEvents: {
      builder_brief_export: c.builder_brief_export,
      builder_brief_share: c.builder_brief_share,
      builder_brief_share_view: c.builder_brief_share_view,
      admin_pilot_grant: c.admin_pilot_grant,
      admin_pilot_revoke: c.admin_pilot_revoke,
      total: c.total,
    },
    checkout: input.checkout,
  };
}
