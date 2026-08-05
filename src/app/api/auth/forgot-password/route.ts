import { NextRequest, NextResponse } from "next/server";
import {
  buildPasswordResetUrl,
  deliverPasswordResetEmail,
} from "@/lib/password-reset";
import { createPasswordResetTokenDb } from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";

/**
 * POST /api/auth/forgot-password { email }
 * Always returns a generic success payload (no email enumeration).
 * Creates a reset token when the account exists; emails when SendGrid is wired.
 */
const GENERIC_FORGOT = {
  ok: true,
  message:
    "If an account exists for that email, password reset instructions were sent.",
} as const;

export async function POST(request: NextRequest) {
  try {
    const limited = decideRateLimit(
      PUBLIC_RATE_LIMITS["auth-forgot"],
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

    const body = (await request.json()) as { email?: string };
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!isValidEmail(email)) {
      return NextResponse.json(GENERIC_FORGOT);
    }

    const issued = await createPasswordResetTokenDb(email);
    if (issued) {
      const origin =
        request.headers.get("x-forwarded-host")
          ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host")}`
          : request.nextUrl.origin;

      const resetUrl = buildPasswordResetUrl(origin, issued.rawToken);
      const delivery = await deliverPasswordResetEmail({
        toEmail: issued.email,
        resetUrl,
      });
      // Never echo deliverySent/deliveryChannel — those fields enumerated accounts.
      if (!delivery.sent) {
        console.error(
          "Forgot password delivery failed:",
          delivery.channel,
          "reason" in delivery ? delivery.reason : ""
        );
      }
    }

    return NextResponse.json(GENERIC_FORGOT);
  } catch (error) {
    console.error("Forgot password failed:", error);
    // Same generic body as success path — avoid auth-oracle via error shape.
    return NextResponse.json(GENERIC_FORGOT);
  }
}
