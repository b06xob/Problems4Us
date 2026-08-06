const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export type WaitlistSource =
  | "landing"
  | "pricing"
  | "pricing-explorer"
  | "pricing-builder"
  | "other";

export type WaitlistClaimResult =
  | { claimed: false; reason: "no_waitlist_row" | "already_claimed" }
  | {
      claimed: true;
      waitlistId: string;
      source: string;
      previouslyClaimedUserId: string | null;
    };

/**
 * Pure decision helper for waitlist → account upgrade.
 * Keeps the waitlist row (history) and marks claim when email matches.
 */
export function decideWaitlistClaim(input: {
  waitlistId: string | null | undefined;
  source?: string | null;
  claimedUserId?: string | null;
  claimedAt?: string | Date | null;
  newUserId: string;
}): WaitlistClaimResult {
  if (!input.waitlistId) {
    return { claimed: false, reason: "no_waitlist_row" };
  }
  if (input.claimedUserId || input.claimedAt) {
    return { claimed: false, reason: "already_claimed" };
  }
  return {
    claimed: true,
    waitlistId: input.waitlistId,
    source: input.source || "other",
    previouslyClaimedUserId: null,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Server-side format validation (problems4us-22b).
 * Practical RFC 5321/5322 subset: length caps, single @, no spaces,
 * no consecutive dots, valid domain labels. Not a full RFC parser —
 * ownership proof is the real control.
 */
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 200) return false;
  if (normalized.includes("..")) return false;
  if (!EMAIL_RE.test(normalized)) return false;
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (domain.startsWith("-") || domain.endsWith("-") || domain.endsWith(".")) {
    return false;
  }
  return true;
}

export function parseWaitlistSource(value: unknown): WaitlistSource {
  const allowed: WaitlistSource[] = [
    "landing",
    "pricing",
    "pricing-explorer",
    "pricing-builder",
    "other",
  ];
  if (typeof value === "string" && allowed.includes(value as WaitlistSource)) {
    return value as WaitlistSource;
  }
  return "other";
}
