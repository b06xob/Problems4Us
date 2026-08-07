import { NextRequest, NextResponse } from "next/server";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";
import { consumeSubmissionVerifyTokenDb } from "@/lib/submission-verify-db";
import {
  getUserSubmissionById,
  updateSubmissionPipelineFields,
  updateSubmissionStatusDb,
} from "@/lib/db-service";
import { runAcceptedSubmissionJourney } from "@/lib/submission-pipeline";
import { findUserByEmailDb, ensureUserTables } from "@/lib/user-db";
import { execute } from "@/lib/db";

/**
 * POST /api/submissions/verify-email { token }
 * Consumes single-use submissionverify token; may promote to accepted+score.
 * Generic errors — no enumeration of submission existence beyond token validity.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = decideRateLimit(
      PUBLIC_RATE_LIMITS["submissions-verify"],
      extractClientIp(request.headers)
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: limited.error },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        }
      );
    }

    const body = (await request.json()) as { token?: string };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token || token.length < 16 || token.length > 200) {
      return NextResponse.json(
        { error: "Invalid or expired verification link." },
        { status: 400 }
      );
    }

    const result = await consumeSubmissionVerifyTokenDb(token);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Invalid or expired verification link." },
        { status: 400 }
      );
    }

    let submission = result.submission;

    // If a registered account uses this email and is unverified, inherit proof.
    const account = submission.SubmitterEmail
      ? await findUserByEmailDb(submission.SubmitterEmail)
      : null;
    if (account && !account.emailVerified) {
      await ensureUserTables();
      await execute(
        `UPDATE UserAccounts
         SET EmailVerifiedAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
         WHERE UserId = @userId AND EmailVerifiedAt IS NULL`,
        { userId: account.userId }
      );
      if (!submission.SubmitterUserId) {
        await updateSubmissionPipelineFields(submission.SubmissionId, {
          submitterUserId: account.userId,
        });
      }
    } else if (account && !submission.SubmitterUserId) {
      await updateSubmissionPipelineFields(submission.SubmissionId, {
        submitterUserId: account.userId,
      });
    }

    let published = false;
    let pipeline = null;

    // Promote only when moderation already said keep and we were waiting on verify.
    const canAutoAccept =
      submission.Status !== "declined" &&
      submission.Status !== "reviewing" &&
      (submission.ModerationAction === "keep" ||
        submission.Status === "pending" ||
        submission.Status === "accepted");

    if (canAutoAccept && submission.Status !== "accepted") {
      // Re-check: reviewing stays reviewing even after verify.
      if (submission.ModerationAction === "drop_pii") {
        // stay reviewing
      } else {
        await updateSubmissionStatusDb(submission.SubmissionId, "accepted", {
          moderationReason:
            "Email verified — auto-approved for scoring",
          moderationAction: "keep",
        });
        submission =
          (await getUserSubmissionById(submission.SubmissionId)) ?? submission;
      }
    }

    if (submission.Status === "accepted" && submission.EmailVerifiedAt) {
      const journey = await runAcceptedSubmissionJourney(submission.SubmissionId);
      published =
        journey.pipeline.outcome === "standalone" ||
        journey.pipeline.outcome === "merged";
      pipeline = {
        outcome: journey.pipeline.outcome,
        painPointId: journey.pipeline.painPointId,
        opportunityScore: journey.pipeline.opportunityScore,
        similarReporterCount: journey.pipeline.similarReporterCount,
        percentileRank: journey.pipeline.percentileRank,
        outcomeEmailSent: journey.outcomeEmail.sent,
        error: journey.pipeline.error ?? null,
      };
    }

    const fresh =
      (await getUserSubmissionById(submission.SubmissionId)) ?? submission;

    return NextResponse.json({
      ok: true,
      message: published
        ? "Email verified. Your problem is being published."
        : fresh.Status === "reviewing"
          ? "Email verified. Your submission is still in review."
          : fresh.Status === "declined"
            ? "Email verified. This submission was not approved for publication."
            : "Email verified. Thank you.",
      submission: {
        submissionId: fresh.SubmissionId,
        status: fresh.Status,
        emailVerified: Boolean(fresh.EmailVerifiedAt),
        published,
      },
      pipeline,
    });
  } catch (error) {
    console.error("Submission verify email failed:", error);
    return NextResponse.json(
      { error: "Could not verify email." },
      { status: 503 }
    );
  }
}
