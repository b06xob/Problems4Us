import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  buildEmailVerifyUrl,
  EMAIL_VERIFY_TTL_HOURS,
} from "@/lib/email-verification";
import { createEmailVerificationTokenDb } from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";
import { resolvePublicOrigin } from "@/lib/auth-request";

/**
 * POST /api/admin/email-verification/issue { email }
 * Ops smoke path: returns the raw verification token once.
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { email?: string };
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    const issued = await createEmailVerificationTokenDb(email);
    if (!issued) {
      return NextResponse.json(
        {
          error:
            "No unverified account for that email (missing or already verified)",
        },
        { status: 404 }
      );
    }

    const origin = resolvePublicOrigin(request);
    const verifyUrl = buildEmailVerifyUrl(origin, issued.rawToken);

    return NextResponse.json({
      ok: true,
      email: issued.email,
      userId: issued.userId,
      token: issued.rawToken,
      verifyUrl,
      expiresInHours: EMAIL_VERIFY_TTL_HOURS,
      note: "Token returned once for ops smoke; SMTP/SendGrid delivers user-facing mail.",
    });
  } catch (error) {
    console.error("Admin email-verification issue failed:", error);
    return NextResponse.json(
      { error: "Could not issue verification token" },
      { status: 503 }
    );
  }
}
