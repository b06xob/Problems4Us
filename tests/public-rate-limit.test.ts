import {
  _resetRateLimitsForTests,
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";

describe("public rate limits (problems4us-23)", () => {
  beforeEach(() => {
    _resetRateLimitsForTests();
  });

  it("extracts client IP from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(extractClientIp(headers)).toBe("1.2.3.4");
  });

  it("allows traffic under the cap then returns 429", () => {
    const policy = { scope: "test", max: 3, windowMs: 60_000 };
    const now = 1_000_000;
    expect(decideRateLimit(policy, "9.9.9.9", now).ok).toBe(true);
    expect(decideRateLimit(policy, "9.9.9.9", now).ok).toBe(true);
    expect(decideRateLimit(policy, "9.9.9.9", now).ok).toBe(true);
    const blocked = decideRateLimit(policy, "9.9.9.9", now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.status).toBe(429);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("isolates scopes and IPs", () => {
    const now = 2_000_000;
    const a = decideRateLimit(PUBLIC_RATE_LIMITS.waitlist, "1.1.1.1", now);
    const b = decideRateLimit(PUBLIC_RATE_LIMITS["auth-login"], "1.1.1.1", now);
    const c = decideRateLimit(PUBLIC_RATE_LIMITS.waitlist, "2.2.2.2", now);
    expect(a.ok && b.ok && c.ok).toBe(true);
  });

  it("resets after window elapses", () => {
    const policy = { scope: "window", max: 1, windowMs: 1000 };
    const t0 = 3_000_000;
    expect(decideRateLimit(policy, "ip", t0).ok).toBe(true);
    expect(decideRateLimit(policy, "ip", t0).ok).toBe(false);
    expect(decideRateLimit(policy, "ip", t0 + 1001).ok).toBe(true);
  });
});
