/**
 * Simple in-memory rate limits for public POST surfaces (problems4us-23).
 * Per App Service instance — pairs with App Service / Front Door WAF when available.
 */

export type RateLimitDecision =
  | { ok: true; remaining: number; resetAtMs: number }
  | { ok: false; status: 429; error: string; retryAfterSec: number; resetAtMs: number };

type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

export type RateLimitPolicy = {
  /** Unique scope, e.g. waitlist|auth-login|checkout */
  scope: string;
  max: number;
  windowMs: number;
};

export const PUBLIC_RATE_LIMITS: Record<string, RateLimitPolicy> = {
  waitlist: { scope: "waitlist", max: 20, windowMs: 60_000 },
  "auth-register": { scope: "auth-register", max: 10, windowMs: 60_000 },
  "auth-login": { scope: "auth-login", max: 30, windowMs: 60_000 },
  "auth-forgot": { scope: "auth-forgot", max: 10, windowMs: 60_000 },
  "auth-reset": { scope: "auth-reset", max: 15, windowMs: 60_000 },
  /** Email verification confirm attempts (token POST). */
  "auth-verify": { scope: "auth-verify", max: 20, windowMs: 60_000 },
  /** Resend verification — per IP. */
  "auth-verify-resend-ip": {
    scope: "auth-verify-resend-ip",
    max: 10,
    windowMs: 60 * 60_000,
  },
  /** Resend verification — per email address. */
  "auth-verify-resend-email": {
    scope: "auth-verify-resend-email",
    max: 3,
    windowMs: 60 * 60_000,
  },
  "checkout-session": { scope: "checkout-session", max: 15, windowMs: 60_000 },
};

function clientKey(scope: string, ip: string): string {
  return `${scope}::${ip || "unknown"}`;
}

export function extractClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd.slice(0, 64);
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

/**
 * Rate-limit by an arbitrary key (IP or normalized email).
 * Prefer extractClientIp for IP; pass normalizeEmail(email) for address caps.
 */
export function decideRateLimit(
  policy: RateLimitPolicy,
  ip: string,
  nowMs = Date.now()
): RateLimitDecision {
  const key = clientKey(policy.scope, ip);
  let bucket = buckets.get(key);
  if (!bucket || nowMs >= bucket.resetAtMs) {
    bucket = { count: 0, resetAtMs: nowMs + policy.windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= policy.max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.resetAtMs - nowMs) / 1000)
    );
    return {
      ok: false,
      status: 429,
      error: `Rate limit exceeded for ${policy.scope}. Retry after ${retryAfterSec}s.`,
      retryAfterSec,
      resetAtMs: bucket.resetAtMs,
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, policy.max - bucket.count),
    resetAtMs: bucket.resetAtMs,
  };
}

export function _resetRateLimitsForTests(): void {
  buckets.clear();
}
