import { NextRequest, NextResponse } from "next/server";
import { isValidPassword } from "@/lib/user-auth";
import { consumePasswordResetTokenDb } from "@/lib/user-db";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";

/**
 * POST /api/auth/reset-password { token, password }
 * Consumes a one-time reset token and sets a new password.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = decideRateLimit(
      PUBLIC_RATE_LIMITS["auth-reset"],
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
      token?: string;
      password?: string;
    };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !isValidPassword(password)) {
      return NextResponse.json(
        { error: "Valid token and password (8–200 characters) are required" },
        { status: 400 }
      );
    }

    const result = await consumePasswordResetTokenDb(token, password);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Reset link is invalid or expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Password updated. Sign in with your new password.",
      email: result.email,
    });
  } catch (error) {
    console.error("Reset password failed:", error);
    return NextResponse.json(
      { error: "Could not reset password. Database may be unavailable." },
      { status: 503 }
    );
  }
}
