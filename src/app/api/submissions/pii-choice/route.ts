import { NextRequest, NextResponse } from "next/server";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";
import {
  consumePiiChoiceTokenDb,
  type PiiChoiceValue,
} from "@/lib/submission-pii-choice";
import {
  getUserSubmissionById,
  updateSubmissionPipelineFields,
  updateSubmissionStatusDb,
} from "@/lib/db-service";
import { runAcceptedSubmissionJourney } from "@/lib/submission-pipeline";

/**
 * POST /api/submissions/pii-choice { token, choice: 'original'|'rewrite' }
 * Records consent, applies chosen text, may promote to accepted+score.
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

    const body = (await request.json()) as {
      token?: string;
      choice?: string;
    };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const choiceRaw =
      typeof body.choice === "string" ? body.choice.trim().toLowerCase() : "";
    if (!token || token.length < 16 || token.length > 200) {
      return NextResponse.json(
        { error: "Invalid or expired choice link." },
        { status: 400 }
      );
    }
    if (choiceRaw !== "original" && choiceRaw !== "rewrite") {
      return NextResponse.json(
        { error: "Choice must be original or rewrite." },
        { status: 400 }
      );
    }
    const choice = choiceRaw as PiiChoiceValue;

    const consumed = await consumePiiChoiceTokenDb(token, choice);
    if (!consumed.ok) {
      return NextResponse.json(
        { error: "Invalid or expired choice link." },
        { status: 400 }
      );
    }

    let submission = await getUserSubmissionById(consumed.submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const title =
      choice === "rewrite" && submission.ProposedTitle
        ? submission.ProposedTitle
        : submission.Title;
    const description =
      choice === "rewrite" && submission.ProposedDescription
        ? submission.ProposedDescription
        : submission.Description;

    await updateSubmissionPipelineFields(submission.SubmissionId, {
      title,
      description,
      piiChoiceStatus: choice,
      piiChoiceAt: now,
      moderationAction: "keep",
      moderationReason: `Submitter chose ${choice} version at ${now}`,
    });

    submission =
      (await getUserSubmissionById(submission.SubmissionId)) ?? submission;

    let published = false;
    let pipeline = null;

    // After choice: if email verified and not declined, promote + score.
    // If email not verified yet, move to pending awaiting verify (not public).
    if (submission.Status !== "declined") {
      if (submission.EmailVerifiedAt) {
        await updateSubmissionStatusDb(submission.SubmissionId, "accepted", {
          moderationAction: "keep",
          moderationReason: `Submitter chose ${choice}; email verified — publishing`,
        });
        const journey = await runAcceptedSubmissionJourney(
          submission.SubmissionId
        );
        published =
          journey.pipeline.outcome === "standalone" ||
          journey.pipeline.outcome === "merged";
        pipeline = {
          outcome: journey.pipeline.outcome,
          painPointId: journey.pipeline.painPointId,
          opportunityScore: journey.pipeline.opportunityScore,
          outcomeEmailSent: journey.outcomeEmail.sent,
          error: journey.pipeline.error ?? null,
        };
      } else {
        await updateSubmissionStatusDb(submission.SubmissionId, "pending", {
          moderationAction: "keep",
          moderationReason: `Submitter chose ${choice}; awaiting email verification before publish`,
        });
      }
    }

    const fresh =
      (await getUserSubmissionById(submission.SubmissionId)) ?? submission;

    return NextResponse.json({
      ok: true,
      choice,
      choiceRecordedAt: now,
      message: published
        ? "Choice recorded. Your problem is being published."
        : fresh.Status === "pending"
          ? "Choice recorded. Confirm your email to publish."
          : "Choice recorded.",
      submission: {
        submissionId: fresh.SubmissionId,
        status: fresh.Status,
        piiChoiceStatus: fresh.PiiChoiceStatus,
        published,
      },
      pipeline,
    });
  } catch (error) {
    console.error("PII choice failed:", error);
    return NextResponse.json(
      { error: "Could not record your choice." },
      { status: 503 }
    );
  }
}
