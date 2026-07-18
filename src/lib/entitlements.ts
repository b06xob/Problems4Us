/**
 * M2.2 plan entitlements (Builder Early Access).
 * Pure helpers — DB upsert lives in db-service.
 */

export const PLAN_TIERS = ["builder", "explorer"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const ENTITLEMENT_STATUSES = ["active", "canceled", "past_due"] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export type PlanEntitlement = {
  EntitlementId: string;
  Email: string;
  Tier: PlanTier;
  Status: EntitlementStatus;
  StripeSessionId: string | null;
  StripeEventId: string | null;
  GrantedAt: string;
  UpdatedAt: string;
};

export type GrantPaidBuilderInput = {
  email: string;
  sessionId: string;
  stripeEventId: string | null;
  paymentStatus: string | null;
};

export type GrantPaidBuilderDecision =
  | { ok: true; email: string; tier: "builder"; status: "active" }
  | { ok: false; reason: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEntitlementEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEntitlementEmail(email: string): boolean {
  const normalized = normalizeEntitlementEmail(email);
  return normalized.length > 0 && normalized.length <= 200 && EMAIL_RE.test(normalized);
}

/**
 * Decide whether a paid webhook should grant Builder access.
 * Requires a usable email (Stripe customer_email / customer_details).
 */
export function decidePaidBuilderGrant(
  input: GrantPaidBuilderInput
): GrantPaidBuilderDecision {
  if (!input.email || !isEntitlementEmail(input.email)) {
    return {
      ok: false,
      reason: "Paid event missing valid email — cannot grant Builder entitlement",
    };
  }
  if (!input.sessionId?.trim()) {
    return { ok: false, reason: "Paid event missing Stripe session id" };
  }
  // unpaid / no_payment_required still completes some sessions; only block clear failures.
  const payment = (input.paymentStatus || "").toLowerCase();
  if (payment === "unpaid" || payment === "failed") {
    return {
      ok: false,
      reason: `Payment status ${payment} — entitlement not granted`,
    };
  }
  return {
    ok: true,
    email: normalizeEntitlementEmail(input.email),
    tier: "builder",
    status: "active",
  };
}

export function hasActiveBuilderAccess(
  entitlement: Pick<PlanEntitlement, "Tier" | "Status"> | null | undefined
): boolean {
  if (!entitlement) return false;
  return entitlement.Tier === "builder" && entitlement.Status === "active";
}

export type BuilderGateResult =
  | { ok: true; email: string }
  | { ok: false; status: 400 | 403; error: string };

/**
 * Gate a paid Builder surface by email + PlanEntitlement row.
 * Public explore APIs stay open; Builder-only routes call this.
 */
export function decideBuilderGate(
  email: string | null | undefined,
  entitlement: Pick<PlanEntitlement, "Tier" | "Status"> | null | undefined
): BuilderGateResult {
  if (!email || !isEntitlementEmail(email)) {
    return {
      ok: false,
      status: 400,
      error: "Valid email required for Builder access",
    };
  }
  const normalized = normalizeEntitlementEmail(email);
  if (!hasActiveBuilderAccess(entitlement)) {
    return {
      ok: false,
      status: 403,
      error: "Builder early-access entitlement required",
    };
  }
  return { ok: true, email: normalized };
}
