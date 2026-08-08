import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  listUserSubmissions,
  createUserSubmissionDb,
  getUserSubmissionById,
  updateSubmissionPipelineFields,
} from "@/lib/db-service";
import { SUBMISSION_CATEGORIES } from "@/lib/user-submissions";
import type {
  CreateSubmissionInput,
  SubmissionStatus,
  SubmissionUrgency,
  UserProblemSubmission,
} from "@/lib/types";
import {
  triageSubmissionText,
  sendSubmissionConfirmationEmail,
  runAcceptedSubmissionJourney,
} from "@/lib/submission-pipeline";
import { reviewSubmissionForPii } from "@/lib/submission-pii-review";
import {
  buildPiiChoiceUrl,
  createPiiChoiceTokenDb,
  deliverPiiChoiceEmail,
} from "@/lib/submission-pii-choice";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";
import { extractSessionToken } from "@/lib/user-auth";
import { findUserByEmailDb, resolveSessionUser } from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";
import { isNondeliverableRecipient } from "@/lib/mail-recipient-policy";
import {
  handleOutboundMailResult,
  isAddressMailBlocked,
  MAIL_BOUNCE_POLICY,
} from "@/lib/mail-bounce";

const VALID_URGENCIES: SubmissionUrgency[] = [
  "low",
  "medium",
  "high",
  "critical",
];

function toPublicSubmission(
  submission: UserProblemSubmission
): Omit<UserProblemSubmission, "SubmitterEmail"> & {
  SubmitterEmail?: never;
} {
  const { SubmitterEmail: _email, ...publicFields } = submission;
  void _email;
  return publicFields;
}

/**
 * Map triage → stored status. Clean text stays pending until email is verified,
 * unless verification is already inherited from a registered account.
 * PII / voluntary-sensitive review holds as reviewing until submitter chooses.
 */
function resolveInitialStatus(
  triageStatus: SubmissionStatus,
  emailVerified: boolean,
  piiHold: boolean
): { status: SubmissionStatus; reasonSuffix?: string } {
  if (triageStatus === "declined") {
    return { status: triageStatus };
  }
  if (piiHold || triageStatus === "reviewing") {
    return {
      status: "reviewing",
      reasonSuffix:
        "Held for submitter privacy choice before any public publish",
    };
  }
  // triageStatus === "accepted" (clean)
  if (emailVerified) {
    return { status: "accepted" };
  }
  return {
    status: "pending",
    reasonSuffix: "Awaiting email verification before publication",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const admin = isAdminRequest(request);

    // Public browse: only approved (accepted) submissions — never pending/reviewing/declined.
    const statusFilter = admin
      ? searchParams.get("status") ?? undefined
      : "accepted";

    const data = await listUserSubmissions({
      category: searchParams.get("category") ?? undefined,
      urgency: searchParams.get("urgency") ?? undefined,
      status: statusFilter,
      search: searchParams.get("search") ?? undefined,
    });

    const payload = admin ? data : data.map(toPublicSubmission);

    return NextResponse.json({ data: payload, total: payload.length });
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = extractClientIp(request.headers);
    const ipLimit = decideRateLimit(PUBLIC_RATE_LIMITS["submissions-ip"], ip);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: ipLimit.error },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        }
      );
    }

    const body = (await request.json()) as Partial<CreateSubmissionInput>;

    const title = body.title?.trim();
    const description = body.description?.trim();
    const category = body.category?.trim();
    const urgency = body.urgency;
    const emailRaw = body.submitterEmail?.trim() ?? "";

    if (!title || title.length < 10) {
      return NextResponse.json(
        { error: "Title must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (!description || description.length < 30) {
      return NextResponse.json(
        { error: "Description must be at least 30 characters" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (
      !SUBMISSION_CATEGORIES.includes(
        category as (typeof SUBMISSION_CATEGORIES)[number]
      )
    ) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!urgency || !VALID_URGENCIES.includes(urgency)) {
      return NextResponse.json(
        { error: "Valid urgency level is required" },
        { status: 400 }
      );
    }

    if (!emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json(
        {
          error:
            "Email is required. We send a receipt and confirm the address before your problem is published.",
        },
        { status: 400 }
      );
    }

    if (isNondeliverableRecipient(emailRaw)) {
      return NextResponse.json(
        {
          error:
            "That email address cannot receive mail. Use an address you control — not a test/example domain.",
          code: "NONDELIVERABLE_EMAIL",
        },
        { status: 400 }
      );
    }

    const email = normalizeEmail(emailRaw);

    if (await isAddressMailBlocked(email)) {
      return NextResponse.json(
        {
          error:
            "That email address previously hard-bounced. We cannot verify it or publish from it. Use a different deliverable address.",
          code: "EMAIL_HARD_BOUNCED",
        },
        { status: 409 }
      );
    }

    const emailLimit = decideRateLimit(
      PUBLIC_RATE_LIMITS["submissions-email"],
      email
    );
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: emailLimit.error },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSec) },
        }
      );
    }

    const sessionUser = await resolveSessionUser(extractSessionToken(request));
    const accountByEmail = await findUserByEmailDb(email);

    let submitterUserId: string | null = null;
    let emailVerifiedAt: string | null = null;

    if (sessionUser) {
      submitterUserId = sessionUser.userId;
      if (
        normalizeEmail(sessionUser.email) === email &&
        sessionUser.emailVerified
      ) {
        emailVerifiedAt = new Date().toISOString();
      }
    }

    if (!emailVerifiedAt && accountByEmail?.emailVerified) {
      emailVerifiedAt = new Date().toISOString();
      if (!submitterUserId) submitterUserId = accountByEmail.userId;
    } else if (accountByEmail && !submitterUserId) {
      submitterUserId = accountByEmail.userId;
    }

    const triage = triageSubmissionText(title, description);
    const piiReview = reviewSubmissionForPii(title, description);
    const piiHold = triage.status !== "declined" && piiReview.needsChoice;

    const initial = resolveInitialStatus(
      triage.status,
      Boolean(emailVerifiedAt),
      piiHold
    );

    let moderationAction: "keep" | "drop_toxic" | "drop_pii" | "pii_choice" =
      triage.moderationAction;
    let moderationReason = triage.reason;
    if (piiHold) {
      moderationAction = piiReview.hasDirectIdentifiers
        ? "drop_pii"
        : "pii_choice";
      moderationReason =
        "Privacy review: submitter must choose original vs rewrite before publish";
    }
    if (initial.reasonSuffix) {
      moderationReason = `${moderationReason}. ${initial.reasonSuffix}`;
    }

    const submission = await createUserSubmissionDb({
      title,
      description,
      category,
      urgency,
      submitterName: body.submitterName,
      submitterEmail: email,
      submitterUserId,
      emailVerifiedAt,
      status: initial.status,
      moderationAction,
      moderationReason,
    });

    const origin =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "https://problems4us.com";

    let piiChoiceEmailSent = false;
    let piiHardBounce = false;
    if (piiHold) {
      await updateSubmissionPipelineFields(submission.SubmissionId, {
        proposedTitle: piiReview.proposedTitle,
        proposedDescription: piiReview.proposedDescription,
        piiFindingsJson: JSON.stringify(piiReview.findings),
        piiChoiceStatus: "awaiting",
      });

      const minted = await createPiiChoiceTokenDb(submission.SubmissionId);
      if (minted) {
        const delivery = await deliverPiiChoiceEmail({
          toEmail: email,
          submissionId: submission.SubmissionId,
          submitterName: body.submitterName,
          originalTitle: title,
          originalDescription: description,
          proposedTitle: piiReview.proposedTitle,
          proposedDescription: piiReview.proposedDescription,
          findings: piiReview.findings,
          originalUrl: buildPiiChoiceUrl(origin, minted.rawToken, "original"),
          rewriteUrl: buildPiiChoiceUrl(origin, minted.rawToken, "rewrite"),
          rewriteChanged: piiReview.rewriteChanged,
        });
        piiChoiceEmailSent = delivery.sent;
        if (delivery.sent) {
          await updateSubmissionPipelineFields(submission.SubmissionId, {
            piiChoiceEmailSentAt: new Date().toISOString(),
          });
        } else {
          const handled = await handleOutboundMailResult({
            email,
            purpose: MAIL_BOUNCE_POLICY.purposes.submissionpii,
            delivery,
            submissionId: submission.SubmissionId,
          });
          piiHardBounce = handled.hardBounce;
        }
      }
    }

    const confirm = await sendSubmissionConfirmationEmail(submission, {
      alreadyVerified: Boolean(emailVerifiedAt),
      origin,
    });

    let pipeline: Awaited<
      ReturnType<typeof runAcceptedSubmissionJourney>
    > | null = null;
    // Never publish while PII choice is outstanding or email hard-bounced.
    const emailUnusable = Boolean(confirm.emailUnusable || piiHardBounce);
    if (
      initial.status === "accepted" &&
      emailVerifiedAt &&
      !piiHold &&
      !emailUnusable
    ) {
      pipeline = await runAcceptedSubmissionJourney(submission.SubmissionId);
    }

    const refreshed =
      (await getUserSubmissionById(submission.SubmissionId)) ?? submission;

    return NextResponse.json(
      {
        data: toPublicSubmission(refreshed),
        reference: refreshed.SubmissionId,
        triage: {
          status: triage.status,
          storedStatus: refreshed.Status,
          reason: moderationReason,
          emailVerified: Boolean(refreshed.EmailVerifiedAt),
          piiChoiceRequired: piiHold,
          emailHardBounced: Boolean(refreshed.EmailHardBouncedAt),
        },
        confirmationEmailSent: confirm.sent,
        piiChoiceEmailSent,
        awaitingEmailVerification:
          !refreshed.EmailVerifiedAt &&
          refreshed.Status !== "declined" &&
          !refreshed.EmailHardBouncedAt,
        emailUnusable: Boolean(refreshed.EmailHardBouncedAt) || emailUnusable,
        awaitingPiiChoice: piiHold && !emailUnusable,
        pipeline: pipeline
          ? {
              outcome: pipeline.pipeline.outcome,
              painPointId: pipeline.pipeline.painPointId,
              opportunityScore: pipeline.pipeline.opportunityScore,
              similarReporterCount: pipeline.pipeline.similarReporterCount,
              percentileRank: pipeline.pipeline.percentileRank,
              outcomeEmailSent: pipeline.outcomeEmail.sent,
              error: pipeline.pipeline.error ?? null,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
