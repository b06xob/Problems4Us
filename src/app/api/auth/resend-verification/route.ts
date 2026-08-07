import { NextRequest, NextResponse } from "next/server";
import {
  createEmailVerificationTokenDb,
  hasRecentHardMailFailureForEmailDb,
  recordMailDeliveryFailureDb,
} from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";
import { isDisposableEmailDomain } from "@/lib/disposable-email";
import {
  buildEmailVerifyUrl,
  deliverEmailVerificationEmail,
  GENERIC_VERIFY_RESEND,
} from "@/lib/email-verification";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";
import { authResponsePad, resolvePublicOrigin } from "@/lib/auth-request";

/**
 * POST /api/auth/resend-verification { email }
 * Always returns a generic success payload (no email enumeration).
 * Rate-limited per IP and per address.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = extractClientIp(request.headers);
    const ipLimit = decideRateLimit(
      PUBLIC_RATE_LIMITS["auth-verify-resend-ip"],
      ip
    );
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: ipLimit.error },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        }
      );
    }

    const body = (await request.json()) as { email?: string };
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!isValidEmail(email) || isDisposableEmailDomain(email)) {
      await authResponsePad();
      return NextResponse.json(GENERIC_VERIFY_RESEND);
    }

    const emailLimit = decideRateLimit(
      PUBLIC_RATE_LIMITS["auth-verify-resend-email"],
      email
    );
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: emailLimit.error },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSec) },
        }
      );
    }

    const hardBlocked = await hasRecentHardMailFailureForEmailDb(email);
    if (!hardBlocked) {
      const issued = await createEmailVerificationTokenDb(email);
      if (issued) {
        const origin = resolvePublicOrigin(request);
        const verifyUrl = buildEmailVerifyUrl(origin, issued.rawToken);
        const delivery = await deliverEmailVerificationEmail({
          toEmail: issued.email,
          verifyUrl,
        });
        if (!delivery.sent) {
          console.error(
            "Resend verification delivery failed:",
            delivery.reason
          );
          await recordMailDeliveryFailureDb({
            email: issued.email,
            purpose: "emailverify",
            reason: delivery.reason,
            hardFailure: Boolean(delivery.hardFailure),
          });
        }
      }
    }

    await authResponsePad();
    return NextResponse.json(GENERIC_VERIFY_RESEND);
  } catch (error) {
    console.error("Resend verification failed:", error);
    await authResponsePad();
    return NextResponse.json(GENERIC_VERIFY_RESEND);
  }
}
