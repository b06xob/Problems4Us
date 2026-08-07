/**
 * DB ops for submission email verification tokens.
 * Tokens use auth-email-token purpose "submissionverify".
 */

import { randomUUID } from "crypto";
import { execute, query, queryOne } from "./db";
import {
  ensureUserSubmissionColumns,
  getUserSubmissionById,
  updateSubmissionPipelineFields,
  updateSubmissionStatusDb,
} from "./db-service";
import {
  SUBMISSION_VERIFY_GRACE_DAYS,
  SUBMISSION_VERIFY_TTL_MINUTES,
  hashSubmissionVerifyToken,
  mintSubmissionVerifyToken,
} from "./submission-email-verify";
import type { UserProblemSubmission } from "./types";
import { normalizeEmail } from "./waitlist";
import { isAddressMailBlocked } from "./mail-bounce";
import { isNondeliverableRecipient } from "./mail-recipient-policy";

export async function createSubmissionVerifyTokenDb(
  submissionId: string
): Promise<{ rawToken: string; expiresAt: string } | null> {
  await ensureUserSubmissionColumns();
  const submission = await getUserSubmissionById(submissionId);
  if (!submission?.SubmitterEmail?.trim()) return null;
  if (submission.EmailHardBouncedAt) return null;

  await execute(
    `UPDATE SubmissionEmailVerificationTokens SET UsedAt = GETUTCDATE()
     WHERE SubmissionId = @submissionId AND UsedAt IS NULL`,
    { submissionId }
  );
  await execute(
    `DELETE FROM SubmissionEmailVerificationTokens
     WHERE ExpiresAt <= GETUTCDATE() OR UsedAt IS NOT NULL`
  );

  const rawToken = mintSubmissionVerifyToken();
  const tokenHash = hashSubmissionVerifyToken(rawToken);
  const verifyId = `sev_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const expiresAt = new Date(
    Date.now() + SUBMISSION_VERIFY_TTL_MINUTES * 60_000
  ).toISOString();

  await execute(
    `INSERT INTO SubmissionEmailVerificationTokens
       (VerifyId, SubmissionId, TokenHash, ExpiresAt, UsedAt, CreatedAt)
     VALUES
       (@verifyId, @submissionId, @tokenHash, DATEADD(minute, @ttl, GETUTCDATE()), NULL, GETUTCDATE())`,
    {
      verifyId,
      submissionId,
      tokenHash,
      ttl: SUBMISSION_VERIFY_TTL_MINUTES,
    }
  );

  return { rawToken, expiresAt };
}

/**
 * Consume a single-use submission verify token.
 * Marks EmailVerifiedAt; clears grace; does NOT auto-accept (caller decides).
 */
export async function consumeSubmissionVerifyTokenDb(
  rawToken: string
): Promise<
  | { ok: true; submission: UserProblemSubmission }
  | { ok: false; reason: string }
> {
  await ensureUserSubmissionColumns();
  const tokenHash = hashSubmissionVerifyToken(rawToken);
  const row = await queryOne<{
    VerifyId: string;
    SubmissionId: string;
  }>(
    `SELECT TOP 1 VerifyId, SubmissionId
     FROM SubmissionEmailVerificationTokens
     WHERE TokenHash = @tokenHash
       AND UsedAt IS NULL
       AND ExpiresAt > GETUTCDATE()`,
    { tokenHash }
  );
  if (!row) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  const now = new Date().toISOString();
  await execute(
    `UPDATE SubmissionEmailVerificationTokens SET UsedAt = GETUTCDATE()
     WHERE VerifyId = @verifyId`,
    { verifyId: row.VerifyId }
  );
  await execute(
    `UPDATE SubmissionEmailVerificationTokens SET UsedAt = GETUTCDATE()
     WHERE SubmissionId = @submissionId AND UsedAt IS NULL`,
    { submissionId: row.SubmissionId }
  );

  await updateSubmissionPipelineFields(row.SubmissionId, {
    emailVerifiedAt: now,
    verificationGraceEndsAt: null,
  });

  const submission = await getUserSubmissionById(row.SubmissionId);
  if (!submission) {
    return { ok: false, reason: "SUBMISSION_MISSING" };
  }
  return { ok: true, submission };
}

export type BackfillSplit = {
  totalAccepted: number;
  withEmail: number;
  withoutEmail: number;
  verifyEmailsSent: number;
  unpublishedNoEmail: number;
  unpublishedGraceExpired: number;
  alreadyVerified: number;
  errors: Array<{ submissionId: string; error: string }>;
};

/**
 * Backfill founder policy for currently accepted rows:
 * - email present + unverified → send verify, set grace
 * - no email → unpublish (pending)
 * - grace expired → unpublish
 */
export async function runAcceptedSubmissionEmailBackfill(opts: {
  sendVerifyEmail: (row: UserProblemSubmission, verifyUrl: string, graceEndsAt: string) => Promise<{ sent: boolean; reason?: string }>;
  buildVerifyUrl: (rawToken: string) => string;
  now?: Date;
}): Promise<BackfillSplit> {
  await ensureUserSubmissionColumns();
  const now = opts.now ?? new Date();
  const accepted = await query<UserProblemSubmission>(`
    SELECT SubmissionId, Title, Description, Category, Urgency,
           SubmitterName, SubmitterEmail, Status, CreatedAt, UpdatedAt,
           ModerationAction, ModerationReason, LinkedPainPointId, PipelineOutcome,
           ConfirmationEmailSentAt, OutcomeEmailSentAt,
           EmailVerifiedAt, SubmitterUserId, VerificationGraceEndsAt,
           EmailHardBouncedAt
    FROM UserSubmissions
    WHERE Status = N'accepted'
    ORDER BY CreatedAt ASC
  `);

  const split: BackfillSplit = {
    totalAccepted: accepted.length,
    withEmail: 0,
    withoutEmail: 0,
    verifyEmailsSent: 0,
    unpublishedNoEmail: 0,
    unpublishedGraceExpired: 0,
    alreadyVerified: 0,
    errors: [],
  };

  for (const raw of accepted) {
    const email = (raw.SubmitterEmail ?? "").trim();
    const verified = Boolean(raw.EmailVerifiedAt);
    if (verified) {
      split.alreadyVerified += 1;
      if (email) split.withEmail += 1;
      else split.withoutEmail += 1;
      continue;
    }

    if (!email) {
      split.withoutEmail += 1;
      try {
        await updateSubmissionStatusDb(raw.SubmissionId, "pending", {
          moderationReason:
            "Unpublished: no submitter email for verification (founder 2026-08-07). Recoverable if email is added and verified.",
          moderationAction: raw.ModerationAction || "unpublish_no_email",
        });
        await updateSubmissionPipelineFields(raw.SubmissionId, {
          verificationGraceEndsAt: null,
        });
        split.unpublishedNoEmail += 1;
      } catch (err) {
        split.errors.push({
          submissionId: raw.SubmissionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    split.withEmail += 1;

    if (raw.EmailHardBouncedAt || isNondeliverableRecipient(email)) {
      try {
        await updateSubmissionStatusDb(raw.SubmissionId, "pending", {
          moderationReason:
            "Unpublished: submitter email hard-bounced or nondeliverable. Stopped retries.",
          moderationAction: "email_hard_bounce",
        });
        await updateSubmissionPipelineFields(raw.SubmissionId, {
          verificationGraceEndsAt: null,
          emailHardBouncedAt: raw.EmailHardBouncedAt || new Date().toISOString(),
          pipelineOutcome: "email_bounced",
        });
      } catch (err) {
        split.errors.push({
          submissionId: raw.SubmissionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    if (await isAddressMailBlocked(email)) {
      try {
        await updateSubmissionStatusDb(raw.SubmissionId, "pending", {
          moderationReason:
            "Unpublished: submitter email previously hard-bounced. Stopped retries.",
          moderationAction: "email_hard_bounce",
        });
        await updateSubmissionPipelineFields(raw.SubmissionId, {
          verificationGraceEndsAt: null,
          emailHardBouncedAt: new Date().toISOString(),
          pipelineOutcome: "email_bounced",
        });
      } catch (err) {
        split.errors.push({
          submissionId: raw.SubmissionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    const graceEnds = raw.VerificationGraceEndsAt
      ? new Date(raw.VerificationGraceEndsAt)
      : null;
    if (graceEnds && graceEnds.getTime() <= now.getTime()) {
      try {
        await updateSubmissionStatusDb(raw.SubmissionId, "pending", {
          moderationReason:
            "Unpublished: verification grace period expired (founder 2026-08-07). Recoverable on verify.",
          moderationAction: raw.ModerationAction || "unpublish_grace_expired",
        });
        await updateSubmissionPipelineFields(raw.SubmissionId, {
          verificationGraceEndsAt: null,
        });
        split.unpublishedGraceExpired += 1;
      } catch (err) {
        split.errors.push({
          submissionId: raw.SubmissionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    try {
      const graceEndsAt =
        graceEnds?.toISOString() ??
        new Date(
          now.getTime() + SUBMISSION_VERIFY_GRACE_DAYS * 24 * 60 * 60_000
        ).toISOString();

      if (!graceEnds) {
        await updateSubmissionPipelineFields(raw.SubmissionId, {
          verificationGraceEndsAt: graceEndsAt,
        });
      }

      const minted = await createSubmissionVerifyTokenDb(raw.SubmissionId);
      if (!minted) {
        split.errors.push({
          submissionId: raw.SubmissionId,
          error: "token_mint_failed",
        });
        continue;
      }

      const delivery = await opts.sendVerifyEmail(
        { ...raw, SubmitterEmail: normalizeEmail(email) },
        opts.buildVerifyUrl(minted.rawToken),
        graceEndsAt
      );
      if (delivery.sent) {
        split.verifyEmailsSent += 1;
        await updateSubmissionPipelineFields(raw.SubmissionId, {
          confirmationEmailSentAt: now.toISOString(),
        });
      } else {
        split.errors.push({
          submissionId: raw.SubmissionId,
          error: delivery.reason || "email_send_failed",
        });
      }
    } catch (err) {
      split.errors.push({
        submissionId: raw.SubmissionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return split;
}
