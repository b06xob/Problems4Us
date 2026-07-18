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

/** Synthetic session id prefix for admin pilot grants (not Stripe). */
export const ADMIN_PILOT_SESSION_PREFIX = "admin_pilot:";

export type AdminPilotGrantDecision =
  | {
      ok: true;
      email: string;
      tier: "builder";
      status: "active";
      sessionId: string;
    }
  | { ok: false; reason: string };

export type AdminPilotRevokeDecision =
  | { ok: true; email: string; status: "canceled" }
  | { ok: false; reason: string };

/**
 * Admin pilot grant while G7 Stripe keys are pending.
 * sessionId is synthetic (admin_pilot:…) — never a real Stripe cs_ id.
 */
export function decideAdminPilotGrant(
  email: string | null | undefined,
  note?: string | null
): AdminPilotGrantDecision {
  if (!email || !isEntitlementEmail(email)) {
    return { ok: false, reason: "Valid email required for pilot grant" };
  }
  const normalized = normalizeEntitlementEmail(email);
  const safeNote = (note || "manual")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const sessionId = `${ADMIN_PILOT_SESSION_PREFIX}${safeNote || "manual"}`;
  return {
    ok: true,
    email: normalized,
    tier: "builder",
    status: "active",
    sessionId,
  };
}

/**
 * Refuse admin pilot upsert when the email already holds an active non-pilot
 * Builder seat (paid Stripe cs_…). Re-granting an existing pilot is allowed.
 */
export function refusePilotOverwriteReason(
  existing:
    | Pick<PlanEntitlement, "Tier" | "Status" | "StripeSessionId">
    | null
    | undefined
): string | null {
  if (!existing) return null;
  if (existing.Tier !== "builder" || existing.Status !== "active") return null;
  if (isAdminPilotSessionId(existing.StripeSessionId)) return null;
  return "Refusing pilot grant — email already has a paid (or non-pilot) Builder seat";
}

export function decideAdminPilotRevoke(
  email: string | null | undefined
): AdminPilotRevokeDecision {
  if (!email || !isEntitlementEmail(email)) {
    return { ok: false, reason: "Valid email required for pilot revoke" };
  }
  return {
    ok: true,
    email: normalizeEntitlementEmail(email),
    status: "canceled",
  };
}

/** Confirm token required to cancel a paid (non-pilot) Builder seat. */
export const REVOKE_PAID_CONFIRM = "REVOKE_PAID";

/**
 * Guard single-email revoke: pilot / missing / canceled seats pass;
 * active paid seats require exact REVOKE_PAID confirm.
 */
export function decidePaidSeatRevokeGuard(input: {
  stripeSessionId?: string | null;
  status?: string | null;
  confirm?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  const status = (input.status || "").toLowerCase();
  const isActivePaid =
    status === "active" &&
    Boolean(input.stripeSessionId) &&
    !isAdminPilotSessionId(input.stripeSessionId);
  if (!isActivePaid) return { ok: true };
  if ((input.confirm || "").trim() !== REVOKE_PAID_CONFIRM) {
    return {
      ok: false,
      reason: `Paid Builder seat — confirm must be exactly "${REVOKE_PAID_CONFIRM}"`,
    };
  }
  return { ok: true };
}

export function isAdminPilotSessionId(sessionId: string | null | undefined): boolean {
  return Boolean(sessionId?.startsWith(ADMIN_PILOT_SESSION_PREFIX));
}

/** Public admin list item for entitlement cohort / pilot hygiene. */
export type EntitlementListItem = {
  email: string;
  tier: PlanTier;
  status: EntitlementStatus;
  grantedAt: string;
  updatedAt: string;
  stripeSessionId: string | null;
  pilotGrant: boolean;
};

export function toEntitlementListItem(
  entitlement: Pick<
    PlanEntitlement,
    "Email" | "Tier" | "Status" | "GrantedAt" | "UpdatedAt" | "StripeSessionId"
  >
): EntitlementListItem {
  return {
    email: entitlement.Email,
    tier: entitlement.Tier,
    status: entitlement.Status,
    grantedAt: entitlement.GrantedAt,
    updatedAt: entitlement.UpdatedAt,
    stripeSessionId: entitlement.StripeSessionId,
    pilotGrant: isAdminPilotSessionId(entitlement.StripeSessionId),
  };
}

/**
 * Filter active Builder seats for admin list (?list=1&pilotOnly=1).
 * Pure helper so list semantics stay unit-testable without SQL.
 */
export function filterEntitlementList(
  rows: EntitlementListItem[],
  options?: { pilotOnly?: boolean; limit?: number }
): EntitlementListItem[] {
  const pilotOnly = Boolean(options?.pilotOnly);
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const filtered = pilotOnly ? rows.filter((r) => r.pilotGrant) : rows;
  return filtered.slice(0, limit);
}

/** Confirm token required for bulk pilot revoke (prevents accidental wipe). */
export const REVOKE_ALL_PILOTS_CONFIRM = "REVOKE_ALL_PILOTS";

export type AdminPilotRevokeAllDecision =
  | { ok: true; dryRun: boolean }
  | { ok: false; reason: string };

/**
 * Validate bulk revoke of active admin_pilot seats only (never paid Stripe seats).
 * Requires exact confirm token; dryRun previews without mutating.
 */
export function decideAdminPilotRevokeAll(input: {
  confirm?: string | null;
  dryRun?: boolean | null;
}): AdminPilotRevokeAllDecision {
  const confirm = (input.confirm || "").trim();
  if (confirm !== REVOKE_ALL_PILOTS_CONFIRM) {
    return {
      ok: false,
      reason: `confirm must be exactly "${REVOKE_ALL_PILOTS_CONFIRM}"`,
    };
  }
  return { ok: true, dryRun: Boolean(input.dryRun) };
}

/** Funnel props for a successful Builder opportunity-brief export (M3.1). */
export type BuilderBriefExportAudit = {
  email: string;
  problemId: string;
  ideaCount: number;
  pilotGrant: boolean;
};

/**
 * Build audit payload after a gated brief export succeeds.
 * Pure helper — route records builder_brief_export via insertConversionEventDb.
 */
export function buildBuilderBriefExportAudit(input: {
  email: string;
  problemId: string;
  ideaCount: number;
  stripeSessionId?: string | null;
}): BuilderBriefExportAudit | null {
  if (!input.email || !isEntitlementEmail(input.email)) return null;
  if (!input.problemId?.trim()) return null;
  const ideaCount = Number(input.ideaCount);
  return {
    email: normalizeEntitlementEmail(input.email),
    problemId: input.problemId.trim().slice(0, 120),
    ideaCount: Number.isFinite(ideaCount) ? Math.max(0, Math.floor(ideaCount)) : 0,
    pilotGrant: isAdminPilotSessionId(input.stripeSessionId),
  };
}
