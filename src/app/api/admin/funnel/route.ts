import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { summarizeConversionEventsDb, countWaitlistEntriesDb } from "@/lib/db-service";
import {
  countActiveBuilderEntitlementsDb,
  countActivePilotBuilderEntitlementsDb,
} from "@/lib/db-service";
import { countActivatedAccountsDb } from "@/lib/user-db";
import { getStripeCheckoutPublicStatus } from "@/lib/stripe-checkout";
import { buildFunnelKpiRollup } from "@/lib/funnel-kpi";

/**
 * GET /api/admin/funnel?hours=168
 * Passport one-call funnel: visits → waitlist → activated → paid/entitled seats.
 * problems4us-12c
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const hoursParam = request.nextUrl.searchParams.get("hours");
    const windowHours = hoursParam ? Number(hoursParam) : 168;

    const [
      events,
      waitlistTotal,
      activation,
      activeBuilderSeats,
      activePilotSeats,
    ] = await Promise.all([
      summarizeConversionEventsDb(windowHours),
      countWaitlistEntriesDb(),
      countActivatedAccountsDb(),
      countActiveBuilderEntitlementsDb(),
      countActivePilotBuilderEntitlementsDb(),
    ]);

    const rollup = buildFunnelKpiRollup({
      windowHours: events.sinceHours,
      eventCounts: events.counts,
      waitlistTotal,
      totalAccounts: activation.totalAccounts,
      activatedAccounts: activation.activatedAccounts,
      activeBuilderSeats,
      activePilotSeats,
      checkout: getStripeCheckoutPublicStatus(),
    });

    return NextResponse.json({
      ok: true,
      ...rollup,
      passportReadablePath: "GET /api/admin/funnel?hours=168",
      asOfUtc: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Funnel KPI rollup failed:", error);
    return NextResponse.json(
      { error: "Could not build funnel KPI rollup" },
      { status: 503 }
    );
  }
}
