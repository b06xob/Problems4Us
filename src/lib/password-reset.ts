import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Password reset token TTL (problems4us-22a). */
export const PASSWORD_RESET_TTL_MINUTES = 60;

export const PASSWORD_RESET_POLICY = {
  ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
  /** Hash only stored; raw token shown once at issue/email time. */
  storeRawToken: false,
  minPasswordLength: 8,
} as const;

function getResetPepper(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    "problems4us-reset-dev-pepper"
  );
}

export function mintPasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256")
    .update(`${getResetPepper()}:pwdreset:${token}`)
    .digest("hex");
}

export function passwordResetTokensEqual(
  rawToken: string,
  expectedHash: string
): boolean {
  try {
    const a = Buffer.from(hashPasswordResetToken(rawToken), "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
  | { channel: "none"; sent: false; reason: string };

/**
 * Best-effort email delivery. Without SENDGRID_API_KEY, returns channel none
 * (formal self-serve close blocked until Founder wires a mailer).
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

  if (!apiKey || !from) {
    return {
      channel: "none",
      sent: false,
      reason: "SENDGRID_API_KEY or FROM email not configured",
    };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.toEmail }] }],
      from: { email: from, name: "Problems4Us" },
      subject: "Reset your Problems4Us password",
      content: [
        {
          type: "text/plain",
          value: `Reset your password (link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes):\n\n${input.resetUrl}\n\nIf you did not request this, ignore this email.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("SendGrid password reset failed:", res.status, body.slice(0, 200));
    return {
      channel: "none",
      sent: false,
      reason: `sendgrid_http_${res.status}`,
    };
  }

  return { channel: "sendgrid", sent: true };
}
