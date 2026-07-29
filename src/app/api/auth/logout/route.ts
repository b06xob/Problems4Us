import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  extractSessionToken,
} from "@/lib/user-auth";
import { revokeSessionDb } from "@/lib/user-db";

export async function POST(request: NextRequest) {
  const token = extractSessionToken(request);
  if (token) {
    try {
      await revokeSessionDb(token);
    } catch (error) {
      console.error("Logout revoke failed:", error);
    }
  }
  const response = NextResponse.json({ ok: true });
  return clearSessionCookie(response);
}
