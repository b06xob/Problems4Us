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
  SubmissionUrgency,
  UserProblemSubmission,
} from "@/lib/types";
import {
  triageSubmissionText,
  sendSubmissionConfirmationEmail,
  runAcceptedSubmissionJourney,
} from "@/lib/submission-pipeline";

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
    const body = (await request.json()) as Partial<CreateSubmissionInput>;

    const title = body.title?.trim();
    const description = body.description?.trim();
    const category = body.category?.trim();
    const urgency = body.urgency;

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

    const email = body.submitterEmail?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const triage = triageSubmissionText(title, description);

    const submission = await createUserSubmissionDb({
      title,
      description,
      category,
      urgency,
      submitterName: body.submitterName,
      submitterEmail: email,
      status: triage.status,
      moderationAction: triage.moderationAction,
      moderationReason: triage.reason,
    });

    let confirmationEmailSent = false;
    if (email) {
      const confirm = await sendSubmissionConfirmationEmail(submission);
      confirmationEmailSent = confirm.sent;
    }

    let pipeline: Awaited<
      ReturnType<typeof runAcceptedSubmissionJourney>
    > | null = null;
    if (triage.status === "accepted") {
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
          reason: triage.reason,
        },
        confirmationEmailSent,
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
