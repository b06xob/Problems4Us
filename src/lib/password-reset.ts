import {
  authEmailTokensEqual,
  hashAuthEmailToken,
  mintAuthEmailToken,
} from "./auth-email-token";
import { getSmtpConfig, sendSmtpPlainText } from "./smtp-mail";

/** Password reset token TTL (problems4us-22a). */
export const PASSWORD_RESET_TTL_MINUTES = 60;

export const PASSWORD_RESET_POLICY = {
  ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
  /** Hash only stored; raw token shown once at issue/email time. */
  storeRawToken: false,
  minPasswordLength: 8,
  /** Shares mint/hash with email verification (auth-email-token). */
  sharedTokenMechanism: "auth-email-token" as const,
} as const;

export function mintPasswordResetToken(): string {
  return mintAuthEmailToken();
}

export function hashPasswordResetToken(token: string): string {
  return hashAuthEmailToken("pwdreset", token);
}

export function passwordResetTokensEqual(
  rawToken: string,
  expectedHash: string
): boolean {
  return authEmailTokensEqual("pwdreset", rawToken, expectedHash);
}

export function buildPasswordResetUrl(
  origin: string,
  token: string
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export type PasswordResetDelivery =
  | { channel: "sendgrid"; sent: true }
  | { channel: "smtp"; sent: true }
  | { channel: "none"; sent: false; reason: string };

const RESET_SUBJECT = "Reset your Problems4Us password";

function resetBody(resetUrl: string): string {
  return `Reset your password (link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
}

/**
 * Best-effort email delivery via SendGrid or company SMTP (equivalent mailer).
 */
export async function deliverPasswordResetEmail(input: {
  toEmail: string;
  resetUrl: string;
}): Promise<PasswordResetDelivery> {
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
        subject: RESET_SUBJECT,
        content: [{ type: "text/plain", value: resetBody(input.resetUrl) }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "SendGrid password reset failed:",
        res.status,
        body.slice(0, 200)
      );
      return {
        channel: "none",
        sent: false,
        reason: `sendgrid_http_${res.status}`,
      };
    }

    return { channel: "sendgrid", sent: true };
  }

  if (getSmtpConfig()) {
    const smtp = await sendSmtpPlainText({
      to: input.toEmail,
      subject: RESET_SUBJECT,
      text: resetBody(input.resetUrl),
    });
    if (smtp.sent) {
      return { channel: "smtp", sent: true };
    }
    return { channel: "none", sent: false, reason: smtp.reason };
  }

  return {
    channel: "none",
    sent: false,
    reason: "SENDGRID_API_KEY or SMTP_HOST/USER/PASSWORD not configured",
  };
}
