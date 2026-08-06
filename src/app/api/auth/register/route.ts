import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  isValidPassword,
} from "@/lib/user-auth";
import {
  createEmailVerificationTokenDb,
  findUserByEmailDb,
  getActivationForUserDb,
  hasRecentHardMailFailureDb,
  recordMailDeliveryFailureDb,
  registerUserDb,
} from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";
import { claimWaitlistOnAccountCreateDb } from "@/lib/db-service";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";
import { isDisposableEmailDomain } from "@/lib/disposable-email";
import {
  buildEmailVerifyUrl,
  deliverEmailVerificationEmail,
  GENERIC_REGISTER,
} from "@/lib/email-verification";
import { authResponsePad, resolvePublicOrigin } from "@/lib/auth-request";

/**
 * POST /api/auth/register
 * Creates an UNVERIFIED account and sends ownership-proof email.
 * No email enumeration: existing addresses get the same generic 200 body
 * (no session cookie) as a successful create path's public message —
 * successful creates also return user payload + session for UX, but
 * EMAIL_TAKEN returns the same message without revealing existence.
 *
 * Format/disposable failures remain 400 (not account oracles).
 */
export async function POST(request: NextRequest) {
  try {
    const limited = decideRateLimit(
      PUBLIC_RATE_LIMITS["auth-register"],
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
      email?: string;
      password?: string;
    };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }
    if (isDisposableEmailDomain(email)) {
      return NextResponse.json(
        {
          error:
            "Disposable email addresses are not allowed. Use a durable inbox.",
        },
        { status: 400 }
      );
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Password must be 8–200 characters" },
        { status: 400 }
      );
    }

    const existing = await findUserByEmailDb(email);
    if (existing) {
      // No enumeration: same generic message; optional resend only via /resend-verification.
      await authResponsePad();
      return NextResponse.json(GENERIC_REGISTER, { status: 200 });
    }

    const { user, sessionToken } = await registerUserDb(email, password);
    const activation = await getActivationForUserDb(user.UserId);

    let waitlistClaim: {
      claimed: boolean;
      reason?: string;
      waitlistId?: string;
      source?: string;
    } = { claimed: false, reason: "no_waitlist_row" };
    try {
      waitlistClaim = await claimWaitlistOnAccountCreateDb({
        email: user.Email,
        userId: user.UserId,
      });
    } catch (claimError) {
      console.error("Waitlist claim on register failed:", claimError);
    }

    // Send verification email (ownership proof). Skip forever-retry on hard bounce.
    const hardBlocked = await hasRecentHardMailFailureDb(
      user.Email,
      "emailverify"
    );
    if (!hardBlocked) {
      try {
        const issued = await createEmailVerificationTokenDb(user.Email);
        if (issued) {
          const origin = resolvePublicOrigin(request);
          const verifyUrl = buildEmailVerifyUrl(origin, issued.rawToken);
          const delivery = await deliverEmailVerificationEmail({
            toEmail: issued.email,
            verifyUrl,
          });
          if (!delivery.sent) {
            console.error(
              "Register verification delivery failed:",
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
      } catch (mailErr) {
        console.error("Register verification send error:", mailErr);
      }
    }

    await authResponsePad();
    const response = NextResponse.json(
      {
        ok: true,
        message: GENERIC_REGISTER.message,
        user: {
          userId: user.UserId,
          email: user.Email,
          emailVerified: false,
        },
        activation,
        waitlistClaim,
        emailVerificationRequired: true,
      },
      { status: 201 }
    );
    return attachSessionCookie(response, sessionToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "EMAIL_TAKEN") {
      await authResponsePad();
      return NextResponse.json(GENERIC_REGISTER, { status: 200 });
    }
    if (message === "INVALID_EMAIL") {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }
    console.error("Register failed:", error);
    return NextResponse.json(
      { error: "Could not create account. Database may be unavailable." },
      { status: 503 }
    );
  }
}
