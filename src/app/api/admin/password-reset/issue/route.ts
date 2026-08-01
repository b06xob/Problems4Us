import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  buildPasswordResetUrl,
  PASSWORD_RESET_TTL_MINUTES,
} from "@/lib/password-reset";
import { createPasswordResetTokenDb } from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";

/**
 * POST /api/admin/password-reset/issue { email }
 * Ops smoke path when SendGrid is not wired: returns the raw reset token once.
 * Does not replace user-facing email delivery for problems4us-22a formal close.
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

    const issued = await createPasswordResetTokenDb(email);
    if (!issued) {
      return NextResponse.json(
        { error: "No account for that email" },
        { status: 404 }
      );
    }

    const origin =
      request.headers.get("x-forwarded-host")
        ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host")}`
        : request.nextUrl.origin;
    const resetUrl = buildPasswordResetUrl(origin, issued.rawToken);

    return NextResponse.json({
      ok: true,
      email: issued.email,
      userId: issued.userId,
      token: issued.rawToken,
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
      note: "Token returned once for ops smoke; wire SENDGRID_API_KEY for self-serve email.",
    });
  } catch (error) {
    console.error("Admin password-reset issue failed:", error);
    return NextResponse.json(
      { error: "Could not issue reset token" },
      { status: 503 }
    );
  }
}
