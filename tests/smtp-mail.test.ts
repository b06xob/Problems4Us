/**
 * @jest-environment node
 */
import { getSmtpConfig } from "@/lib/smtp-mail";
import { isPasswordResetEmailConfigured } from "@/lib/ops-readiness";

describe("smtp-mail + ops readiness (problems4us-22a)", () => {
  const keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "PASSWORD_RESET_FROM_EMAIL",
    "SENDGRID_API_KEY",
    "SENDGRID_FROM_EMAIL",
  ] as const;
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      prev[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  it("reads SMTP config when host/user/password set", () => {
    process.env.SMTP_HOST = "smtp.mail.att.net";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.PASSWORD_RESET_FROM_EMAIL = "noreply@example.com";
    expect(getSmtpConfig()).toEqual({
      host: "smtp.mail.att.net",
      port: 587,
      user: "user@example.com",
      password: "secret",
      from: "noreply@example.com",
    });
    expect(isPasswordResetEmailConfigured()).toBe(true);
  });

  it("treats missing SMTP as not configured", () => {
    expect(getSmtpConfig()).toBeNull();
    expect(isPasswordResetEmailConfigured()).toBe(false);
  });
});
