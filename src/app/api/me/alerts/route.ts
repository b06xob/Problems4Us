import { NextRequest, NextResponse } from "next/server";
import { extractSessionToken, unauthorizedJson } from "@/lib/user-auth";
import { resolveSessionUser } from "@/lib/user-db";
import { listAlertEventsDb } from "@/lib/alerts-db";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
    const data = await listAlertEventsDb(user.userId, limit);
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("List alerts failed:", error);
    return NextResponse.json(
      { error: "Could not list alerts" },
      { status: 503 }
    );
  }
}
