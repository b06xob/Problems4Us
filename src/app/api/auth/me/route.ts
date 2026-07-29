import { NextRequest, NextResponse } from "next/server";
import { extractSessionToken, unauthorizedJson } from "@/lib/user-auth";
import {
  getActivationForUserDb,
  resolveSessionUser,
} from "@/lib/user-db";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();

    const activation = await getActivationForUserDb(user.userId);
    return NextResponse.json({
      ok: true,
      user: { userId: user.userId, email: user.email },
      activation,
    });
  } catch (error) {
    console.error("Me failed:", error);
    return NextResponse.json(
      { error: "Could not load account" },
      { status: 503 }
    );
  }
}
