import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getOpsReadiness } from "@/lib/ops-readiness";

/**
 * GET /api/admin/ops-readiness
 * Passport-readable credential/gate checklist (problems4us-22a/30a/11a/09b).
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const readiness = getOpsReadiness();
    return NextResponse.json({
      ok: true,
      stepIds: ["problems4us-11a", "problems4us-09b", "problems4us-22a", "problems4us-30a"],
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
