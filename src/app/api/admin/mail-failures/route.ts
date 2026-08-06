import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { listMailDeliveryFailuresDb } from "@/lib/user-db";

/**
 * GET /api/admin/mail-failures?limit=50
 * Ops visibility into hard/soft outbound mail failures (no silent forever-retry).
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(200, Math.max(1, Math.floor(limitRaw)))
      : 50;
    const failures = await listMailDeliveryFailuresDb(limit);
    return NextResponse.json({
      ok: true,
      count: failures.length,
      failures,
    });
  } catch (error) {
    console.error("List mail failures failed:", error);
    return NextResponse.json(
      { error: "Could not list mail failures" },
      { status: 503 }
    );
  }
}
