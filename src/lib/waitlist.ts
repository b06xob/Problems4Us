const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 200 && EMAIL_RE.test(normalized);
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
