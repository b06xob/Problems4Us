import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  getUserSubmissionById,
  updateSubmissionStatusDb,
} from "@/lib/db-service";
import type { SubmissionStatus } from "@/lib/types";
import { runAcceptedSubmissionJourney } from "@/lib/submission-pipeline";

const VALID_STATUSES: SubmissionStatus[] = [
  "pending",
  "reviewing",
  "accepted",
  "declined",
];

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Admin approve/reject (and takedown) for community submissions.
 * PATCH body: { status: 'accepted' | 'declined' | 'reviewing' | 'pending', reason?: string }
 * Accepting requires EmailVerifiedAt and runs the score/merge/notify pipeline.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
    }

    const existing = await getUserSubmissionById(id);
    if (!existing) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      status?: SubmissionStatus;
      reason?: string;
    };

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: "Valid status is required (accepted|declined|reviewing|pending)" },
        { status: 400 }
      );
    }

    if (body.status === "accepted" && !existing.EmailVerifiedAt) {
      return NextResponse.json(
        {
          error:
            "Cannot accept: submitter email is not verified. Send a verification request or wait for the submitter to confirm.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 409 }
      );
    }

    const updated = await updateSubmissionStatusDb(id, body.status, {
      moderationReason:
        body.reason?.trim() ||
        (body.status === "accepted"
          ? "Admin approved"
          : body.status === "declined"
            ? "Admin declined / takedown"
            : existing.ModerationReason),
      moderationAction:
        body.status === "declined"
          ? existing.ModerationAction || "admin_decline"
          : existing.ModerationAction || "admin_review",
    });

    let pipeline = null;
    if (body.status === "accepted") {
      const result = await runAcceptedSubmissionJourney(id);
      pipeline = {
        outcome: result.pipeline.outcome,
        painPointId: result.pipeline.painPointId,
        opportunityScore: result.pipeline.opportunityScore,
        similarReporterCount: result.pipeline.similarReporterCount,
        percentileRank: result.pipeline.percentileRank,
        outcomeEmailSent: result.outcomeEmail.sent,
        error: result.pipeline.error ?? null,
      };
    }

    const fresh = (await getUserSubmissionById(id)) ?? updated;

    return NextResponse.json({ data: fresh, pipeline });
  } catch (error) {
    console.error("Failed to patch submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const row = await getUserSubmissionById(id);
    if (!row) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    return NextResponse.json({ data: row });
  } catch (error) {
    console.error("Failed to get submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}
