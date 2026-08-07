/**
 * Hard-bounce handling for outbound mail (journey step 4 /
 * cos-notification-noise-20260807).
 *
 * Rules:
 * - Detect hard failures (SMTP 5xx / SendGrid permanent / async MAILER-DAEMON).
 * - Record to MailDeliveryFailures (ops visibility).
 * - Mark submitter address unusable on affected submissions.
 * - Stop retrying that address for 30 days.
 * - Under verified-email rule: bounced address can never verify → must not publish.
 */

import { isHardMailFailure, type EmailDelivery } from "./email-verification";
import {
  hasRecentHardMailFailureDb,
  hasRecentHardMailFailureForEmailDb,
  recordMailDeliveryFailureDb,
} from "./user-db";
import {
  listUserSubmissionsByEmailDb,
  updateSubmissionPipelineFields,
  updateSubmissionStatusDb,
} from "./db-service";
import { normalizeEmail } from "./waitlist";

export const MAIL_BOUNCE_POLICY = {
  suppressRetryDays: 30,
  moderationAction: "email_hard_bounce",
  moderationReason:
    "Hard bounce: submitter address unusable. Stopped mail retries. Submission cannot publish until a deliverable verified address is provided.",
  purposes: {
    emailverify: "emailverify",
    submissionverify: "submissionverify",
    submissionoutcome: "submissionoutcome",
    submissionpii: "submissionpii",
    submissionbackfill: "submissionbackfill",
    asyncBounce: "async_bounce",
  },
} as const;

export type MailPurpose =
  (typeof MAIL_BOUNCE_POLICY.purposes)[keyof typeof MAIL_BOUNCE_POLICY.purposes];

export function deliveryLooksHard(delivery: EmailDelivery): boolean {
  if (delivery.sent) return false;
  if (delivery.hardFailure) return true;
  return isHardMailFailure(delivery.reason);
}

/** True when any recent hard failure exists for this address (any purpose). */
export async function isAddressMailBlocked(email: string): Promise<boolean> {
  return hasRecentHardMailFailureForEmailDb(
    email,
    MAIL_BOUNCE_POLICY.suppressRetryDays
  );
}

export async function isPurposeMailBlocked(
  email: string,
  purpose: MailPurpose
): Promise<boolean> {
  return hasRecentHardMailFailureDb(
    email,
    purpose,
    MAIL_BOUNCE_POLICY.suppressRetryDays
  );
}

/**
 * Record a hard bounce and mark matching unverified submissions unusable.
 */
export async function applyHardMailBounce(input: {
  email: string;
  purpose: MailPurpose;
  reason: string;
  submissionId?: string;
}): Promise<{
  recorded: boolean;
  submissionsMarked: string[];
}> {
  const email = normalizeEmail(input.email);
  if (!email) {
    return { recorded: false, submissionsMarked: [] };
  }

  await recordMailDeliveryFailureDb({
    email,
    purpose: input.purpose,
    reason: input.reason.slice(0, 400),
    hardFailure: true,
  });

  const bouncedAt = new Date().toISOString();
  const submissionsMarked: string[] = [];
  const candidates = await listUserSubmissionsByEmailDb(email);

  for (const sub of candidates) {
    if (sub.EmailVerifiedAt) continue;

    const nextStatus = sub.Status === "declined" ? "declined" : "pending";

    if (!sub.EmailHardBouncedAt) {
      await updateSubmissionStatusDb(sub.SubmissionId, nextStatus, {
        moderationAction: MAIL_BOUNCE_POLICY.moderationAction,
        moderationReason: MAIL_BOUNCE_POLICY.moderationReason,
      });
      await updateSubmissionPipelineFields(sub.SubmissionId, {
        emailHardBouncedAt: bouncedAt,
        verificationGraceEndsAt: null,
        pipelineOutcome: "email_bounced",
      });
    }
    submissionsMarked.push(sub.SubmissionId);
  }

  return { recorded: true, submissionsMarked };
}

/**
 * Soft (non-hard) failure: still visible to ops, does not block address.
 */
export async function recordSoftMailFailure(input: {
  email: string;
  purpose: MailPurpose;
  reason: string;
}): Promise<void> {
  await recordMailDeliveryFailureDb({
    email: input.email,
    purpose: input.purpose,
    reason: input.reason.slice(0, 400),
    hardFailure: false,
  });
}

/**
 * After an outbound attempt: record soft/hard and apply bounce side-effects.
 */
export async function handleOutboundMailResult(input: {
  email: string;
  purpose: MailPurpose;
  delivery: EmailDelivery;
  submissionId?: string;
}): Promise<{
  sent: boolean;
  hardBounce: boolean;
  blockedRetry: boolean;
  submissionsMarked: string[];
  reason?: string;
}> {
  if (input.delivery.sent) {
    return {
      sent: true,
      hardBounce: false,
      blockedRetry: false,
      submissionsMarked: [],
    };
  }

  const reason =
    "reason" in input.delivery ? input.delivery.reason : "send_failed";
  const hard = deliveryLooksHard(input.delivery);

  if (hard) {
    const applied = await applyHardMailBounce({
      email: input.email,
      purpose: input.purpose,
      reason,
      submissionId: input.submissionId,
    });
    return {
      sent: false,
      hardBounce: true,
      blockedRetry: true,
      submissionsMarked: applied.submissionsMarked,
      reason,
    };
  }

  await recordSoftMailFailure({
    email: input.email,
    purpose: input.purpose,
    reason,
  });
  return {
    sent: false,
    hardBounce: false,
    blockedRetry: false,
    submissionsMarked: [],
    reason,
  };
}
