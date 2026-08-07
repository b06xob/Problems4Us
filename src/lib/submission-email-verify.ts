/**
 * Submission email acknowledgement + verification (founder 2026-08-07).
 * Reuses auth-email-token mint/hash — same mechanism as registration verify
 * and password reset. Purpose prefix "submissionverify" keeps hashes
 * non-interchangeable with account emailverify tokens.
 */

import {
  hashAuthEmailToken,
  mintAuthEmailToken,
} from "./auth-email-token";
import { getSmtpConfig, sendSmtpPlainText } from "./smtp-mail";
import { isHardMailFailure, type EmailDelivery } from "./email-verification";

/** Verification / ack link TTL — align with account email verify (24h). */
export const SUBMISSION_VERIFY_TTL_HOURS = 24;
export const SUBMISSION_VERIFY_TTL_MINUTES = SUBMISSION_VERIFY_TTL_HOURS * 60;

/**
 * Grace period for legacy accepted submissions that already have an email:
 * after this window without verify, status reverts out of accepted (unpublish).
 */
export const SUBMISSION_VERIFY_GRACE_DAYS = 7;

export const SUBMISSION_VERIFY_POLICY = {
  ttlHours: SUBMISSION_VERIFY_TTL_HOURS,
  ttlMinutes: SUBMISSION_VERIFY_TTL_MINUTES,
  graceDays: SUBMISSION_VERIFY_GRACE_DAYS,
  storeRawToken: false,
  singleUse: true,
  sharedTokenMechanism: "auth-email-token" as const,
  purpose: "submissionverify" as const,
} as const;

export function mintSubmissionVerifyToken(): string {
  return mintAuthEmailToken();
}

export function hashSubmissionVerifyToken(token: string): string {
  return hashAuthEmailToken("submissionverify", token);
}

export function buildSubmissionVerifyUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/verify-submission?token=${encodeURIComponent(token)}`;
}

const ACK_SUBJECT_PREFIX = "We received your problem";

function ackVerifyBody(input: {
  submissionId: string;
  title: string;
  verifyUrl: string;
  alreadyVerified: boolean;
}): string {
  const lines = [
    "Thanks for submitting a problem to Problems4Us.",
    "",
    `Reference: ${input.submissionId}`,
    `Title: ${input.title}`,
    "",
  ];

  if (input.alreadyVerified) {
    lines.push(
      "Your email is already verified on your Problems4Us account,",
      "so we will not ask you to confirm again.",
      "",
      "What happens next:",
      "1. We check the submission (toxicity / sensitive data).",
      "2. If it passes, we score it and publish it to the catalog.",
      "3. Approved problems typically go live within about an hour.",
      ""
    );
  } else {
    lines.push(
      "Confirm your email to publish this problem (one click).",
      `This link expires in ${SUBMISSION_VERIFY_TTL_HOURS} hours:`,
      "",
      input.verifyUrl,
      "",
      "Why we ask: we email you a receipt, and we confirm the address",
      "before your problem is published or scored. No account required.",
      "",
      "What happens next after you confirm:",
      "1. We finish checking the submission.",
      "2. If it passes, we score it and publish it to the catalog.",
      "3. Approved problems typically go live within about an hour.",
      ""
    );
  }

  lines.push("— Problems4Us");
  return lines.join("\n");
}

/**
 * Acknowledgement email that doubles as the verification message.
 */
export async function deliverSubmissionAckVerifyEmail(input: {
  toEmail: string;
  submissionId: string;
  title: string;
  verifyUrl: string;
  alreadyVerified: boolean;
}): Promise<EmailDelivery> {
  const subject = `${ACK_SUBJECT_PREFIX} — ${input.submissionId}`;
  const text = ackVerifyBody(input);

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
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const reason = `sendgrid_http_${res.status}:${body.slice(0, 120)}`;
      console.error("SendGrid submission ack failed:", res.status, body.slice(0, 200));
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
      subject,
      text,
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

/** Backfill / grace reminder — verify request for already-live rows. */
export async function deliverSubmissionBackfillVerifyEmail(input: {
  toEmail: string;
  submissionId: string;
  title: string;
  verifyUrl: string;
  graceEndsAt: string;
}): Promise<EmailDelivery> {
  const subject = `Confirm your email to keep your problem live — ${input.submissionId}`;
  const text = [
    "Problems4Us now requires a verified email for published community problems.",
    "",
    `Reference: ${input.submissionId}`,
    `Title: ${input.title}`,
    "",
    "Please confirm ownership of this address:",
    input.verifyUrl,
    "",
    `If we do not hear from you by ${input.graceEndsAt} (UTC), we will`,
    "unpublish the problem (status reverts out of accepted — nothing is deleted).",
    "",
    "— Problems4Us",
  ].join("\n");

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
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        channel: "none",
        sent: false,
        reason: `sendgrid_http_${res.status}:${body.slice(0, 120)}`,
        hardFailure: res.status === 400 || res.status === 403,
      };
    }
    return { channel: "sendgrid", sent: true };
  }

  if (getSmtpConfig()) {
    const smtp = await sendSmtpPlainText({
      to: input.toEmail,
      subject,
      text,
    });
    if (smtp.sent) return { channel: "smtp", sent: true };
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
