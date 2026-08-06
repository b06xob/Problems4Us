import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  isValidPassword,
} from "@/lib/user-auth";
import { getActivationForUserDb, loginUserDb } from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";
import {
  decideRateLimit,
  extractClientIp,
  PUBLIC_RATE_LIMITS,
} from "@/lib/public-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const limited = decideRateLimit(
      PUBLIC_RATE_LIMITS["auth-login"],
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

    if (!isValidEmail(email) || !isValidPassword(password)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const result = await loginUserDb(email, password);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const activation = await getActivationForUserDb(result.user.UserId);
    const response = NextResponse.json({
      ok: true,
      user: {
        userId: result.user.UserId,
        email: result.user.Email,
        emailVerified: Boolean(result.user.EmailVerifiedAt),
      },
      activation,
    });
    return attachSessionCookie(response, result.sessionToken);
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Could not sign in. Database may be unavailable." },
      { status: 503 }
    );
  }
}
