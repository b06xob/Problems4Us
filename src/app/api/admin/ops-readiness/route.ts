import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getOpsReadiness } from "@/lib/ops-readiness";

/**
 * GET /api/admin/ops-readiness
 * Passport-readable credential/gate checklist (problems4us-22a/30a/09b).
 * Reddit (11a) removed 2026-08-02 — no longer an open founder gate.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const readiness = getOpsReadiness();
    const stepIds = Array.from(
      new Set(readiness.openFounderGates.map((g) => g.stepId))
    );
    return NextResponse.json({
      ok: true,
      stepIds,
      readiness,
      humanActionRequired: readiness.openFounderGates.length > 0,
    });
  } catch (error) {
    console.error("ops-readiness GET failed:", error);
    return NextResponse.json(
      { error: "Failed to load ops readiness" },
      { status: 500 }
    );
  }
}
