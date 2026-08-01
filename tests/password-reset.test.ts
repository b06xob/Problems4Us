/**
 * @jest-environment node
 */
import {
  buildPasswordResetUrl,
  hashPasswordResetToken,
  mintPasswordResetToken,
  PASSWORD_RESET_POLICY,
  passwordResetTokensEqual,
} from "@/lib/password-reset";
import { SESSION_POLICY } from "@/lib/user-auth";

describe("password-reset tokens (problems4us-22a)", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-reset-pepper";
  });

  it("mints opaque tokens and verifies hashed equality", () => {
    const token = mintPasswordResetToken();
    expect(token.length).toBeGreaterThan(20);
    const hash = hashPasswordResetToken(token);
    expect(passwordResetTokensEqual(token, hash)).toBe(true);
    expect(passwordResetTokensEqual("wrong-token", hash)).toBe(false);
  });

  it("builds reset URL with encoded token", () => {
    const url = buildPasswordResetUrl(
      "https://problems4us.com",
      "abc+/=token"
    );
    expect(url).toContain("https://problems4us.com/reset-password?token=");
    expect(url).toContain(encodeURIComponent("abc+/=token"));
  });

  it("exposes policy TTL and session policy status", () => {
    expect(PASSWORD_RESET_POLICY.ttlMinutes).toBe(60);
    expect(SESSION_POLICY.passwordResetStatus).toBe(
      "tokens_shipped_email_pending"
    );
  });
});
