/**
 * Email verification (problems4us-22b) — proof of ownership at registration.
 * Uses shared auth-email-token mint/hash (same mechanism as password reset).
 */

import {
  hashAuthEmailToken,
  mintAuthEmailToken,
} from "./auth-email-token";
import { getSmtpConfig, sendSmtpPlainText } from "./smtp-mail";

/** Verification link TTL — 24h typical. */
export const EMAIL_VERIFY_TTL_HOURS = 24;
export const EMAIL_VERIFY_TTL_MINUTES = EMAIL_VERIFY_TTL_HOURS * 60;

/**
 * Unverified account policy (explicit for ops + product).
 *
 * MAY:
 * - Sign in / keep session
 * - Browse public catalog
 * - Save problems/ideas, watches, alerts (activation path)
 *
 * MAY NOT:
 * - Self-serve password reset (address ownership unproven)
 * - Builder brief export / paid entitlement consumption keyed to email
 * - Claim invite-cohort / paid access as a durable identity
 */
export const UNVERIFIED_ACCOUNT_POLICY = {
  may: [
    "sign_in",
    "browse_public",
    "save_problems_ideas",
    "watches_alerts",
  ],
  mayNot: [
    "password_reset",
    "builder_briefs",
    "paid_entitlement_claim",
  ],
  verifyTtlHours: EMAIL_VERIFY_TTL_HOURS,
} as const;

export const EMAIL_VERIFY_POLICY = {
  ttlHours: EMAIL_VERIFY_TTL_HOURS,
  ttlMinutes: EMAIL_VERIFY_TTL_MINUTES,
  storeRawToken: false,
  singleUse: true,
  invalidateOnPasswordChange: true,
  /** Per-address verification send cap (rolling window). */
  maxSendsPerEmailPerHour: 3,
  /** Per-IP verification send cap (rolling window). */
  maxSendsPerIpPerHour: 10,
} as const;

export function mintEmailVerifyToken(): string {
  return mintAuthEmailToken();
}

export function hashEmailVerifyToken(token: string): string {
  return hashAuthEmailToken("emailverify", token);
}

export function buildEmailVerifyUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export type EmailDelivery =
  | { channel: "sendgrid"; sent: true }
  | { channel: "smtp"; sent: true }
  | { channel: "none"; sent: false; reason: string; hardFailure?: boolean };

const VERIFY_SUBJECT = "Verify your Problems4Us email";

function verifyBody(verifyUrl: string): string {
  return `Confirm your email for Problems4Us (link expires in ${EMAIL_VERIFY_TTL_HOURS} hours):\n\n${verifyUrl}\n\nIf you did not create an account, ignore this email.`;
}

/** Heuristic: SMTP/SendGrid permanent failures that must not retry forever. */
export function isHardMailFailure(reason: string): boolean {
  const r = reason.toLowerCase();
  return (
    /\b550\b/.test(r) ||
    /\b551\b/.test(r) ||
    /\b553\b/.test(r) ||
    /\b5\.1\.1\b/.test(r) ||
    /\b5\.1\.2\b/.test(r) ||
    r.includes("user unknown") ||
    r.includes("mailbox unavailable") ||
    r.includes("recipient rejected")
  );
}

export async function deliverEmailVerificationEmail(input: {
  toEmail: string;
  verifyUrl: string;
}): Promise<EmailDelivery> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const from =
    process.env.PASSWORD_RESET_FROM_EMAIL?.trim() ||
    process.env.SENDGRID_FROM_EMAIL?.trim() ||
    "";

  if (apiKey && from) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.toEmail }] }],
        from: { email: from, name: "Problems4Us" },
        subject: VERIFY_SUBJECT,
        content: [{ type: "text/plain", value: verifyBody(input.verifyUrl) }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const reason = `sendgrid_http_${res.status}:${body.slice(0, 120)}`;
      console.error("SendGrid email verify failed:", res.status, body.slice(0, 200));
      return {
        channel: "none",
        sent: false,
        reason,
        hardFailure: res.status === 400 || res.status === 403,
      };
    }

    return { channel: "sendgrid", sent: true };
  }

  if (getSmtpConfig()) {
    const smtp = await sendSmtpPlainText({
      to: input.toEmail,
      subject: VERIFY_SUBJECT,
      text: verifyBody(input.verifyUrl),
    });
    if (smtp.sent) {
      return { channel: "smtp", sent: true };
    }
    return {
      channel: "none",
      sent: false,
      reason: smtp.reason,
      hardFailure: isHardMailFailure(smtp.reason),
    };
  }

  return {
    channel: "none",
    sent: false,
    reason: "SENDGRID_API_KEY or SMTP_HOST/USER/PASSWORD not configured",
  };
}

/** Generic public copy — never reveals whether the address is registered. */
export const GENERIC_VERIFY_RESEND = {
  ok: true,
  message:
    "If an unverified account exists for that email, a verification link was sent.",
} as const;

export const GENERIC_REGISTER = {
  ok: true,
  message:
    "If this email can be used, we created an account and sent a verification link. Check your inbox.",
} as const;
