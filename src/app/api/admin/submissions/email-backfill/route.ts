import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  buildSubmissionVerifyUrl,
  deliverSubmissionBackfillVerifyEmail,
} from "@/lib/submission-email-verify";
import { runAcceptedSubmissionEmailBackfill } from "@/lib/submission-verify-db";

/**
 * POST /api/admin/submissions/email-backfill
 * Applies founder verified-email policy to currently accepted rows.
 * Reports the split: with email (verify+grace) vs without (unpublish).
 */
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const origin =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "https://problems4us.com";

    const split = await runAcceptedSubmissionEmailBackfill({
      buildVerifyUrl: (rawToken) => buildSubmissionVerifyUrl(origin, rawToken),
      sendVerifyEmail: async (row, verifyUrl, graceEndsAt) => {
        const delivery = await deliverSubmissionBackfillVerifyEmail({
          toEmail: row.SubmitterEmail,
          submissionId: row.SubmissionId,
          title: row.Title,
          verifyUrl,
          graceEndsAt,
        });
        return {
          sent: delivery.sent,
          reason: delivery.sent ? undefined : delivery.reason,
        };
      },
    });

    return NextResponse.json({
      ok: true,
      completed_utc: new Date().toISOString(),
      split,
      policy: {
        graceDays: 7,
        unpublishNoEmail: true,
        unpublishGraceExpired: true,
        deleteNever: true,
      },
    });
  } catch (error) {
    console.error("Submission email backfill failed:", error);
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 }
    );
  }
}
