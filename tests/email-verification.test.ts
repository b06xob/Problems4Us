/**
 * @jest-environment node
 */
import {
  authEmailTokensEqual,
  hashAuthEmailToken,
  mintAuthEmailToken,
} from "@/lib/auth-email-token";
import {
  buildEmailVerifyUrl,
  EMAIL_VERIFY_POLICY,
  isHardMailFailure,
  UNVERIFIED_ACCOUNT_POLICY,
} from "@/lib/email-verification";
import {
  DISPOSABLE_EMAIL_POLICY,
  isDisposableEmailDomain,
} from "@/lib/disposable-email";
import {
  hashPasswordResetToken,
  mintPasswordResetToken,
} from "@/lib/password-reset";
import { isValidEmail } from "@/lib/waitlist";
import { PUBLIC_RATE_LIMITS } from "@/lib/public-rate-limit";
import { SESSION_POLICY } from "@/lib/user-auth";

describe("email verification (problems4us-22b)", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-verify-pepper";
  });

  it("mints opaque verify tokens via shared auth-email-token", () => {
    const token = mintAuthEmailToken();
    expect(token.length).toBeGreaterThan(20);
    const hash = hashAuthEmailToken("emailverify", token);
    expect(authEmailTokensEqual("emailverify", token, hash)).toBe(true);
    expect(authEmailTokensEqual("emailverify", "wrong", hash)).toBe(false);
  });

  it("keeps password-reset and verify hashes non-interchangeable", () => {
    const token = mintPasswordResetToken();
    const resetHash = hashPasswordResetToken(token);
    const verifyHash = hashAuthEmailToken("emailverify", token);
    expect(resetHash).not.toBe(verifyHash);
    expect(authEmailTokensEqual("pwdreset", token, resetHash)).toBe(true);
    expect(authEmailTokensEqual("emailverify", token, resetHash)).toBe(false);
  });

  it("builds verify URL with encoded token", () => {
    const url = buildEmailVerifyUrl("https://problems4us.com", "abc+/=token");
    expect(url).toContain("https://problems4us.com/verify-email?token=");
    expect(url).toContain(encodeURIComponent("abc+/=token"));
  });

  it("documents unverified policy and 24h TTL", () => {
    expect(EMAIL_VERIFY_POLICY.ttlHours).toBe(24);
    expect(UNVERIFIED_ACCOUNT_POLICY.mayNot).toContain("password_reset");
    expect(UNVERIFIED_ACCOUNT_POLICY.mayNot).toContain("builder_briefs");
    expect(UNVERIFIED_ACCOUNT_POLICY.may).toContain("sign_in");
    expect(SESSION_POLICY.emailVerificationStatus).toBe(
      "self_serve_email_live"
    );
  });

  it("blocks known disposable domains (policy: block)", () => {
    expect(DISPOSABLE_EMAIL_POLICY.mode).toBe("block");
    expect(isDisposableEmailDomain("user@mailinator.com")).toBe(true);
    expect(isDisposableEmailDomain("user@yopmail.com")).toBe(true);
    expect(isDisposableEmailDomain("user@example.com")).toBe(false);
  });

  it("detects hard mail failures for no-forever-retry", () => {
    expect(isHardMailFailure("smtp_error:550 user unknown")).toBe(true);
    expect(isHardMailFailure("smtp_error:421 try later")).toBe(false);
  });

  it("strengthens server-side email format checks", () => {
    expect(isValidEmail("ada@example.com")).toBe(true);
    expect(isValidEmail("a..b@example.com")).toBe(false);
    expect(isValidEmail(".ada@example.com")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("exposes verify resend rate limits per IP and per email", () => {
    expect(PUBLIC_RATE_LIMITS["auth-verify-resend-ip"].max).toBe(10);
    expect(PUBLIC_RATE_LIMITS["auth-verify-resend-email"].max).toBe(3);
    expect(PUBLIC_RATE_LIMITS["auth-verify"].max).toBe(20);
  });
});
