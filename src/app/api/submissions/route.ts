import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  listUserSubmissions,
  createUserSubmissionDb,
  getUserSubmissionById,
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
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";
import { extractSessionToken } from "@/lib/user-auth";
import { findUserByEmailDb, resolveSessionUser } from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";

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
 */
function resolveInitialStatus(
  triageStatus: SubmissionStatus,
  emailVerified: boolean
): { status: SubmissionStatus; reasonSuffix?: string } {
  if (triageStatus === "declined" || triageStatus === "reviewing") {
    return { status: triageStatus };
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

    const email = normalizeEmail(emailRaw);
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
      // Prefer session identity when logged in; still require matching email or use session email.
      if (normalizeEmail(sessionUser.email) === email && sessionUser.emailVerified) {
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
    const initial = resolveInitialStatus(
      triage.status,
      Boolean(emailVerifiedAt)
    );
    const moderationReason = initial.reasonSuffix
      ? `${triage.reason}. ${initial.reasonSuffix}`
      : triage.reason;

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
      moderationAction: triage.moderationAction,
      moderationReason,
    });

    const origin =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "https://problems4us.com";

    const confirm = await sendSubmissionConfirmationEmail(submission, {
      alreadyVerified: Boolean(emailVerifiedAt),
      origin,
    });

    let pipeline: Awaited<
      ReturnType<typeof runAcceptedSubmissionJourney>
    > | null = null;
    if (initial.status === "accepted" && emailVerifiedAt) {
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
        },
        confirmationEmailSent: confirm.sent,
        awaitingEmailVerification:
          !refreshed.EmailVerifiedAt && refreshed.Status !== "declined",
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
