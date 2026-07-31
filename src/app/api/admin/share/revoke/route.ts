import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { verifyBriefShareToken, getBriefShareSecret } from "@/lib/brief-share";
import { revokeBriefShareTokenDb } from "@/lib/brief-share-revoke";

/**
 * Admin: revoke a signed brief share token (problems4us-15c).
 * POST { "token": "v1....", "reason": "optional" }
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => null)) as {
      token?: string;
      reason?: string;
    } | null;
    const token = body?.token?.trim() || "";
    if (!token) {
      return NextResponse.json(
        { error: "token is required", gate: "M3.1c" },
        { status: 400 }
      );
    }

    const secret = getBriefShareSecret();
    let problemId: string | null = null;
    if (secret) {
      const verified = verifyBriefShareToken(token, secret);
      if (verified.ok) problemId = verified.problemId;
    }

    const result = await revokeBriefShareTokenDb({
      token,
      problemId,
      reason: body?.reason || "admin_revoke",
      revokedBy: "admin",
    });

    return NextResponse.json({
      ok: true,
      gate: "M3.1c",
      ...result,
      problemId,
    });
  } catch (error) {
    console.error("Share revoke failed:", error);
    return NextResponse.json(
      { error: "Could not revoke share token", gate: "M3.1c" },
      { status: 503 }
    );
  }
}
