import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { listMailDeliveryFailuresDb } from "@/lib/user-db";
import {
  applyHardMailBounce,
  MAIL_BOUNCE_POLICY,
  type MailPurpose,
} from "@/lib/mail-bounce";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";

/**
 * GET /api/admin/mail-failures?limit=50
 * Ops visibility into hard/soft outbound mail failures (no silent forever-retry).
 *
 * POST /api/admin/mail-failures
 * Record an async hard bounce (MAILER-DAEMON / ISP DSN) and mark matching
 * unverified submissions unusable. Body:
 *   { email, reason?, purpose?, hardFailure?: true }
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(200, Math.max(1, Math.floor(limitRaw)))
      : 50;
    const failures = await listMailDeliveryFailuresDb(limit);
    return NextResponse.json({
      ok: true,
      count: failures.length,
      failures,
    });
  } catch (error) {
    console.error("List mail failures failed:", error);
    return NextResponse.json(
      { error: "Could not list mail failures" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      email?: string;
      reason?: string;
      purpose?: string;
      hardFailure?: boolean;
    };

    const emailRaw = body.email?.trim() || "";
    if (!emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const hardFailure = body.hardFailure !== false;
    if (!hardFailure) {
      return NextResponse.json(
        {
          error:
            "POST is for hard bounces. Soft failures are recorded automatically on send.",
        },
        { status: 400 }
      );
    }

    const purpose = (body.purpose?.trim() ||
      MAIL_BOUNCE_POLICY.purposes.asyncBounce) as MailPurpose;
    const reason =
      body.reason?.trim() ||
      "async_hard_bounce:MAILER-DAEMON or ISP permanent failure reported to ops";

    const applied = await applyHardMailBounce({
      email: normalizeEmail(emailRaw),
      purpose,
      reason,
    });

    return NextResponse.json({
      ok: true,
      recorded: applied.recorded,
      email: normalizeEmail(emailRaw),
      purpose,
      submissionsMarked: applied.submissionsMarked,
      policy: {
        suppressRetryDays: MAIL_BOUNCE_POLICY.suppressRetryDays,
        moderationAction: MAIL_BOUNCE_POLICY.moderationAction,
      },
    });
  } catch (error) {
    console.error("Record mail failure failed:", error);
    return NextResponse.json(
      { error: "Could not record mail failure" },
      { status: 503 }
    );
  }
}
