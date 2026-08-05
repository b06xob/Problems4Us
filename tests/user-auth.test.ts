/**
 * @jest-environment node
 */
import {
  computeActivation,
  isNonEmptyId,
} from "@/lib/user-accounts";
import {
  clearSessionCookie,
  hashPassword,
  hashSessionToken,
  isValidPassword,
  mintSessionToken,
  SESSION_COOKIE,
  SESSION_POLICY,
  SESSION_TTL_DAYS,
  verifyPassword,
} from "@/lib/user-auth";
import { decideWaitlistClaim } from "@/lib/waitlist";
import { NextResponse } from "next/server";

describe("user-accounts activation", () => {
  it("activates on >=1 saved idea", () => {
    expect(computeActivation({ savedProblemCount: 0, savedIdeaCount: 1 })).toEqual(
      expect.objectContaining({ activated: true, reason: "saved_idea_gte_1" })
    );
  });

  it("activates on >=3 saved problems", () => {
    expect(computeActivation({ savedProblemCount: 3, savedIdeaCount: 0 })).toEqual(
      expect.objectContaining({
        activated: true,
        reason: "saved_problems_gte_3",
      })
    );
  });

  it("does not activate below thresholds", () => {
    expect(computeActivation({ savedProblemCount: 2, savedIdeaCount: 0 })).toEqual(
      expect.objectContaining({ activated: false, reason: "not_activated" })
    );
  });

  it("validates ids", () => {
    expect(isNonEmptyId("pp-1")).toBe(true);
    expect(isNonEmptyId("")).toBe(false);
    expect(isNonEmptyId(null)).toBe(false);
  });
});

describe("user-auth crypto", () => {
  it("hashes and verifies passwords", () => {
    const { salt, hash } = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", salt, hash)).toBe(true);
    expect(verifyPassword("wrong-password", salt, hash)).toBe(false);
  });

  it("mints opaque session tokens and hashes them", () => {
    process.env.SESSION_SECRET = "test-pepper";
    const a = mintSessionToken();
    const b = mintSessionToken();
    expect(a).not.toEqual(b);
    expect(hashSessionToken(a)).toHaveLength(64);
    expect(hashSessionToken(a)).toEqual(hashSessionToken(a));
    expect(hashSessionToken(a)).not.toEqual(hashSessionToken(b));
  });

  it("enforces password length", () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("long-enough")).toBe(true);
  });

  it("documents session expiry + rotation policy", () => {
    expect(SESSION_TTL_DAYS).toBe(30);
    expect(SESSION_POLICY.rotateOnLogin).toBe(true);
    expect(SESSION_POLICY.revokeOnLogout).toBe(true);
    expect(SESSION_POLICY.passwordResetStatus).toBe("self_serve_email_live");
    expect(SESSION_POLICY.cookieName).toBe(SESSION_COOKIE);
  });

  it("logout clears session cookie (maxAge 0)", () => {
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});

describe("waitlist account claim decision", () => {
  it("claims when waitlist row exists and is unclaimed", () => {
    expect(
      decideWaitlistClaim({
        waitlistId: "wl-1",
        source: "pricing",
        claimedUserId: null,
        claimedAt: null,
        newUserId: "usr_abc",
      })
    ).toEqual(
      expect.objectContaining({
        claimed: true,
        waitlistId: "wl-1",
        source: "pricing",
      })
    );
  });

  it("skips when no waitlist row", () => {
    expect(
      decideWaitlistClaim({
        waitlistId: null,
        newUserId: "usr_abc",
      })
    ).toEqual({ claimed: false, reason: "no_waitlist_row" });
  });

  it("skips when already claimed", () => {
    expect(
      decideWaitlistClaim({
        waitlistId: "wl-1",
        claimedUserId: "usr_old",
        claimedAt: "2026-07-01T00:00:00Z",
        newUserId: "usr_abc",
      })
    ).toEqual({ claimed: false, reason: "already_claimed" });
  });
});
