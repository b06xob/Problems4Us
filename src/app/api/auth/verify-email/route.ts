import { NextRequest, NextResponse } from "next/server";
import { consumeEmailVerificationTokenDb } from "@/lib/user-db";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";

/**
 * POST /api/auth/verify-email { token }
 * Consumes a single-use verification token; marks EmailVerifiedAt.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = decideRateLimit(
      PUBLIC_RATE_LIMITS["auth-verify"],
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

    const body = (await request.json()) as { token?: string };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token || token.length < 16 || token.length > 200) {
      return NextResponse.json(
        { error: "Invalid or expired verification link." },
        { status: 400 }
      );
    }

    const result = await consumeEmailVerificationTokenDb(token);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Invalid or expired verification link." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Email verified. You can use password reset and paid features.",
      user: { userId: result.userId, email: result.email, emailVerified: true },
    });
  } catch (error) {
    console.error("Verify email failed:", error);
    return NextResponse.json(
      { error: "Could not verify email." },
      { status: 503 }
    );
  }
}
