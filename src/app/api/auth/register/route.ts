import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  isValidPassword,
} from "@/lib/user-auth";
import { getActivationForUserDb, registerUserDb } from "@/lib/user-db";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist";

export async function POST(request: NextRequest) {
  try {
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
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Password must be 8–200 characters" },
        { status: 400 }
      );
    }

    const { user, sessionToken } = await registerUserDb(email, password);
    const activation = await getActivationForUserDb(user.UserId);
    const response = NextResponse.json(
      {
        ok: true,
        user: { userId: user.UserId, email: user.Email },
        activation,
      },
      { status: 201 }
    );
    return attachSessionCookie(response, sessionToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 }
      );
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
