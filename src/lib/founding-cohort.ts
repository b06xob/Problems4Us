/**
 * Problems4Us Builder founding cohort (Breivax Pricing Strategy v1.0).
 * Cap 25 paid seats at $29/mo; price-locked by keeping them on the founding Stripe Price.
 */

export const FOUNDING_BUILDER_MONTHLY_USD = 29;
export const FOUNDING_COHORT_CAP = 25;
export const FOUNDING_TIER_LABEL = "Builder (founding)";

/** Public copy — do not mention $49 or submitter introductions. */
export const FOUNDING_PUBLIC_BLURB =
  "Founding Builder rate: full opportunity scores with explainability, builder briefs/exports, saved problems, and alerts. Limited to the first 25 customers; your founding rate stays locked for life.";

export type FoundingCapDecision =
  | { ok: true; remaining: number }
  | { ok: false; reason: string; activePaidSeats: number };

/**
 * Enforce the 25-seat founding cap before creating a new paid checkout / grant.
 * Existing active paid seats (renewals / duplicate webhooks) should pass allowExisting.
 */
export function decideFoundingCohortCap(input: {
  activePaidSeats: number;
  allowExisting?: boolean;
}): FoundingCapDecision {
  const active = Math.max(0, Math.floor(Number(input.activePaidSeats) || 0));
  if (input.allowExisting) {
    return { ok: true, remaining: Math.max(0, FOUNDING_COHORT_CAP - active) };
  }
  if (active >= FOUNDING_COHORT_CAP) {
    return {
      ok: false,
      reason: `Founding Builder cohort is full (${FOUNDING_COHORT_CAP} seats). New paid seats are closed until standard pricing opens.`,
      activePaidSeats: active,
    };
  }
  return { ok: true, remaining: FOUNDING_COHORT_CAP - active };
}

/**
 * Stripe-level price lock: founding customers stay on the founding price_ id.
 * Do not mutate that Price amount; later standard tiers use a different price_.
 */
export function foundingPriceLockNote(): string {
  return (
    "Price lock is real at Stripe: founding subscribers remain on STRIPE_PRICE_BUILDER_MONTHLY " +
    `($${FOUNDING_BUILDER_MONTHLY_USD}/mo). When standard pricing rises, create a new Price — ` +
    "do not change or migrate founding subscriptions off the founding price id."
  );
}
