import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getUserSubmissionById } from "@/lib/db-service";
import {
  SUBMISSION_VERIFY_TTL_HOURS,
  buildSubmissionVerifyUrl,
} from "@/lib/submission-email-verify";
import { createSubmissionVerifyTokenDb } from "@/lib/submission-verify-db";
import { resolvePublicOrigin } from "@/lib/auth-request";

/**
 * POST /api/admin/submissions/verify-issue { submissionId }
 * Ops smoke: returns raw submissionverify token once (same pattern as
 * /api/admin/email-verification/issue). User-facing mail still goes via SMTP.
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { submissionId?: string };
    const submissionId =
      typeof body.submissionId === "string" ? body.submissionId.trim() : "";
    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }

    const submission = await getUserSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }
    if (!submission.SubmitterEmail?.trim()) {
      return NextResponse.json(
        { error: "Submission has no submitter email" },
        { status: 400 }
      );
    }
    if (submission.EmailVerifiedAt) {
      return NextResponse.json(
        { error: "Submission email already verified" },
        { status: 409 }
      );
    }

    const minted = await createSubmissionVerifyTokenDb(submissionId);
    if (!minted) {
      return NextResponse.json(
        { error: "Could not mint verification token" },
        { status: 503 }
      );
    }

    const origin = resolvePublicOrigin(request);
    const verifyUrl = buildSubmissionVerifyUrl(origin, minted.rawToken);

    return NextResponse.json({
      ok: true,
      submissionId,
      token: minted.rawToken,
      verifyUrl,
      expiresInHours: SUBMISSION_VERIFY_TTL_HOURS,
      note: "Token returned once for ops smoke; acknowledgement email delivers the user-facing link.",
    });
  } catch (error) {
    console.error("Admin submission verify-issue failed:", error);
    return NextResponse.json(
      { error: "Could not issue submission verification token" },
      { status: 503 }
    );
  }
}
