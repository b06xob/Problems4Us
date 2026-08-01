/**
 * @jest-environment node
 */
/** problems4us-12c — funnel KPI rollup builder + admin fail-closed. */
import { NextRequest } from "next/server";
import { requireAdminAuth, ADMIN_API_KEY_HEADER } from "@/lib/admin-auth";
import { buildConversionFunnelCounts } from "@/lib/conversion-events";
import { buildFunnelKpiRollup } from "@/lib/funnel-kpi";

describe("funnel KPI rollup (problems4us-12c)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("admin funnel fails closed when ADMIN_API_KEY unset", () => {
    delete process.env.ADMIN_API_KEY;
    const req = new NextRequest("http://localhost/api/admin/funnel");
    expect(requireAdminAuth(req)?.status).toBe(503);
  });

  it("admin funnel rejects wrong keys", () => {
    process.env.ADMIN_API_KEY = "expected-key";
    const headers = new Headers();
    headers.set(ADMIN_API_KEY_HEADER, "wrong");
    const req = new NextRequest("http://localhost/api/admin/funnel", {
      headers,
    });
    expect(requireAdminAuth(req)?.status).toBe(401);
  });

  it("joins visits, waitlist, activated, and paid seats into one rollup", () => {
    const eventCounts = buildConversionFunnelCounts([
      { eventName: "pricing_view", count: 4 },
      { eventName: "waitlist_view", count: 32 },
      { eventName: "paid_early_access", count: 0 },
      { eventName: "builder_brief_export", count: 5 },
      { eventName: "admin_pilot_grant", count: 5 },
    ]);

    const rollup = buildFunnelKpiRollup({
      windowHours: 168,
      eventCounts,
      waitlistTotal: 1,
      totalAccounts: 5,
      activatedAccounts: 1,
      activeBuilderSeats: 1,
      activePilotSeats: 1,
      checkout: {
        gate: "G7",
        sessionConfigured: false,
        webhookConfigured: false,
        checkoutReady: false,
      },
    });

    expect(rollup.stepId).toBe("problems4us-12c");
    expect(rollup.gate).toBe("M2.5");
    expect(rollup.visits.pricing_view).toBe(4);
    expect(rollup.visits.waitlist_view).toBe(32);
    expect(rollup.waitlist.totalRecords).toBe(1);
    expect(rollup.activated).toEqual({
      totalAccounts: 5,
      activatedAccounts: 1,
      rule: "saved_problems>=3 OR saved_ideas>=1",
    });
    expect(rollup.paidOrEntitledSeats.activeBuilderSeats).toBe(1);
    expect(rollup.paidOrEntitledSeats.activePilotSeats).toBe(1);
    expect(rollup.paidOrEntitledSeats.stripePaidEarlyAccessEvents).toBe(0);
    expect(rollup.paidOrEntitledSeats.checkoutReady).toBe(false);
    expect(rollup.checkout.checkoutReady).toBe(false);
    expect(rollup.otherEvents.builder_brief_export).toBe(5);
  });
});
