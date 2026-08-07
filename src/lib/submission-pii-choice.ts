/**
 * PII choice tokens + email (founder 2026-08-07).
 * Hold publish until submitter picks original vs rewrite.
 */

import {
  hashAuthEmailToken,
  mintAuthEmailToken,
} from "./auth-email-token";
import { asciiEmailSubject, MAIL_PLAIN_TEXT_TYPE } from "./mail-encoding";
import { getSmtpConfig, sendSmtpPlainText } from "./smtp-mail";
import { isHardMailFailure, type EmailDelivery } from "./email-verification";
import { assertDeliverableRecipient } from "./mail-recipient-policy";
import type { PiiFinding } from "./submission-pii-review";
import { execute, queryOne } from "./db";
import { ensureUserSubmissionColumns } from "./db-service";

export const PII_CHOICE_TTL_DAYS = 14;
export const PII_CHOICE_TTL_HOURS = PII_CHOICE_TTL_DAYS * 24;

export type PiiChoiceValue = "original" | "rewrite";

export function mintPiiChoiceToken(): string {
  return mintAuthEmailToken();
}

export function hashPiiChoiceToken(token: string): string {
  return hashAuthEmailToken("submissionpiichoice", token);
}

export function buildPiiChoiceUrl(
  origin: string,
  token: string,
  choice: PiiChoiceValue
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/choose-submission-version?token=${encodeURIComponent(token)}&choice=${choice}`;
}

export async function ensurePiiChoiceTable(): Promise<void> {
  await ensureUserSubmissionColumns();
  await execute(`
    IF OBJECT_ID(N'dbo.SubmissionPiiChoiceTokens', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SubmissionPiiChoiceTokens (
        ChoiceId      NVARCHAR(50)  NOT NULL PRIMARY KEY,
        SubmissionId  NVARCHAR(50)  NOT NULL,
        TokenHash     NVARCHAR(64)  NOT NULL,
        ExpiresAt     DATETIME2     NOT NULL,
        UsedAt        DATETIME2     NULL,
        ChosenVersion NVARCHAR(20)  NULL,
        CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_SubPiiChoice_CreatedAt DEFAULT (GETUTCDATE())
      );
      CREATE UNIQUE INDEX UX_SubPiiChoice_TokenHash
        ON dbo.SubmissionPiiChoiceTokens(TokenHash);
      CREATE INDEX IX_SubPiiChoice_SubmissionId
        ON dbo.SubmissionPiiChoiceTokens(SubmissionId);
    END
  `);
}

export async function createPiiChoiceTokenDb(
  submissionId: string
): Promise<{ rawToken: string; choiceId: string } | null> {
  await ensurePiiChoiceTable();
  const rawToken = mintPiiChoiceToken();
  const tokenHash = hashPiiChoiceToken(rawToken);
  const choiceId = `pii-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const ttlHours = PII_CHOICE_TTL_HOURS;

  await execute(
    `INSERT INTO dbo.SubmissionPiiChoiceTokens
       (ChoiceId, SubmissionId, TokenHash, ExpiresAt, UsedAt, ChosenVersion, CreatedAt)
     VALUES
       (@choiceId, @submissionId, @tokenHash, DATEADD(hour, @ttl, GETUTCDATE()), NULL, NULL, GETUTCDATE())`,
    { choiceId, submissionId, tokenHash, ttl: ttlHours }
  );
  return { rawToken, choiceId };
}

export async function consumePiiChoiceTokenDb(
  rawToken: string,
  choice: PiiChoiceValue
): Promise<
  | { ok: true; submissionId: string }
  | { ok: false; reason: string }
> {
  await ensurePiiChoiceTable();
  const tokenHash = hashPiiChoiceToken(rawToken);
  const row = await queryOne<{
    ChoiceId: string;
    SubmissionId: string;
    UsedAt: Date | string | null;
    ExpiresAt: Date | string;
  }>(
    `SELECT ChoiceId, SubmissionId, UsedAt, ExpiresAt
     FROM dbo.SubmissionPiiChoiceTokens
     WHERE TokenHash = @tokenHash`,
    { tokenHash }
  );
  if (!row) return { ok: false, reason: "invalid" };
  if (row.UsedAt) return { ok: false, reason: "already_used" };
  if (new Date(row.ExpiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const updated = await execute(
    `UPDATE dbo.SubmissionPiiChoiceTokens
     SET UsedAt = GETUTCDATE(), ChosenVersion = @choice
     WHERE ChoiceId = @choiceId AND UsedAt IS NULL`,
    { choiceId: row.ChoiceId, choice }
  );
  if (updated === 0) return { ok: false, reason: "already_used" };
  return { ok: true, submissionId: row.SubmissionId };
}

function findingsBlock(findings: PiiFinding[]): string[] {
  if (!findings.length) return ["(no specific flags)"];
  return findings.map(
    (f) => `- [${f.bucket}] ${f.note}${f.excerpt ? ` - "${f.excerpt}"` : ""}`
  );
}

export async function deliverPiiChoiceEmail(input: {
  toEmail: string;
  submissionId: string;
  submitterName?: string;
  originalTitle: string;
  originalDescription: string;
  proposedTitle: string;
  proposedDescription: string;
  findings: PiiFinding[];
  originalUrl: string;
  rewriteUrl: string;
  rewriteChanged: boolean;
}): Promise<EmailDelivery> {
  const recipientGuard = assertDeliverableRecipient(input.toEmail);
  if (!recipientGuard.ok) {
    return {
      channel: "none",
      sent: false,
      reason: recipientGuard.reason,
      hardFailure: true,
    };
  }

  const name = input.submitterName?.trim() || "there";
  const subject = asciiEmailSubject(
    `Choose how your problem appears publicly - ${input.submissionId}`
  );
  const text = [
    `Hi ${name},`,
    "",
    "Thanks for submitting a problem to Problems4Us.",
    "",
    "IMPORTANT: whatever you choose will become a PUBLIC, search-indexed page",
    "under the name you provided. Please read both versions carefully.",
    "",
    `Reference: ${input.submissionId}`,
    "",
    "=== WHAT WE NOTICED ===",
    ...findingsBlock(input.findings),
    "",
    "Direct identifiers (email, phone, address, employer name, account numbers,",
    "personal profile links) are removed in the rewrite. Professional background",
    "and audience context that make the problem solvable are kept. Voluntary",
    "sensitive detail (faith, health, personal transformation, hardship) is",
    "flagged above - we do not decide for you; you keep or remove it.",
    "",
    "=== VERSION A - YOUR ORIGINAL ===",
    `Title: ${input.originalTitle}`,
    "",
    input.originalDescription,
    "",
    `Keep original: ${input.originalUrl}`,
    "",
    "=== VERSION B - PRIVACY REWRITE ===",
    input.rewriteChanged
      ? "We removed direct identifiers and left the problem substance intact:"
      : "No direct identifiers were found to remove. Version B matches A except for any edits you request later. You can still confirm A or ask us to soften voluntary detail.",
    "",
    `Title: ${input.proposedTitle}`,
    "",
    input.proposedDescription,
    "",
    `Use rewrite: ${input.rewriteUrl}`,
    "",
    "We will publish NEITHER version until you choose. One reminder will follow.",
    "If you never respond, the submission stays unpublished - it is your content.",
    "",
    "- Problems4Us",
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
        content: [{ type: MAIL_PLAIN_TEXT_TYPE, value: text }],
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
