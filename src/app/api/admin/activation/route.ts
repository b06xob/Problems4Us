import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { countActivatedAccountsDb } from "@/lib/user-db";

/**
 * Ops/Passport activation metric: accounts with ≥3 saved problems OR ≥1 saved idea.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const metrics = await countActivatedAccountsDb();
    return NextResponse.json({
      ok: true,
      ...metrics,
      activationRule: "saved_problems>=3 OR saved_ideas>=1",
    });
  } catch (error) {
    console.error("Activation metrics failed:", error);
    return NextResponse.json(
      { error: "Could not read activation metrics" },
      { status: 503 }
    );
  }
}
