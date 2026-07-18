import {
  decideAdminPilotGrant,
  decideAdminPilotRevoke,
  decideBuilderGate,
  decidePaidBuilderGrant,
  filterEntitlementList,
  hasActiveBuilderAccess,
  isAdminPilotSessionId,
  isEntitlementEmail,
  normalizeEntitlementEmail,
  toEntitlementListItem,
} from "@/lib/entitlements";
import { formatOpportunityBriefMarkdown } from "@/lib/opportunity-brief";

describe("M2.2 plan entitlements", () => {
  it("normalizes entitlement emails", () => {
    expect(normalizeEntitlementEmail("  Pilot@Example.COM ")).toBe(
      "pilot@example.com"
    );
  });

  it("validates entitlement emails", () => {
    expect(isEntitlementEmail("a@b.co")).toBe(true);
    expect(isEntitlementEmail("not-an-email")).toBe(false);
    expect(isEntitlementEmail("")).toBe(false);
  });

  it("grants Builder when paid event has email + session", () => {
    expect(
      decidePaidBuilderGrant({
        email: "Pilot@Example.com",
        sessionId: "cs_test_1",
        stripeEventId: "evt_1",
        paymentStatus: "paid",
      })
    ).toEqual({
      ok: true,
      email: "pilot@example.com",
      tier: "builder",
      status: "active",
    });
  });

  it("refuses grant without email", () => {
    const result = decidePaidBuilderGrant({
      email: "",
      sessionId: "cs_test_1",
      stripeEventId: "evt_1",
      paymentStatus: "paid",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/email/i);
    }
  });

  it("refuses grant on unpaid status", () => {
    const result = decidePaidBuilderGrant({
      email: "a@b.co",
      sessionId: "cs_test_1",
      stripeEventId: "evt_1",
      paymentStatus: "unpaid",
    });
    expect(result.ok).toBe(false);
  });

  it("hasActiveBuilderAccess only for active builder", () => {
    expect(
      hasActiveBuilderAccess({ Tier: "builder", Status: "active" })
    ).toBe(true);
    expect(
      hasActiveBuilderAccess({ Tier: "builder", Status: "canceled" })
    ).toBe(false);
    expect(
      hasActiveBuilderAccess({ Tier: "explorer", Status: "active" })
    ).toBe(false);
    expect(hasActiveBuilderAccess(null)).toBe(false);
  });

  it("decideBuilderGate requires email and active Builder entitlement", () => {
    expect(decideBuilderGate("", null)).toEqual({
      ok: false,
      status: 400,
      error: "Valid email required for Builder access",
    });
    expect(decideBuilderGate("pilot@example.com", null)).toEqual({
      ok: false,
      status: 403,
      error: "Builder early-access entitlement required",
    });
    expect(
      decideBuilderGate("Pilot@Example.com", {
        Tier: "builder",
        Status: "active",
      })
    ).toEqual({ ok: true, email: "pilot@example.com" });
  });

  it("admin pilot grant uses synthetic session id", () => {
    const result = decideAdminPilotGrant("Pilot@Example.com", "Hourly Smoke!");
    expect(result).toEqual({
      ok: true,
      email: "pilot@example.com",
      tier: "builder",
      status: "active",
      sessionId: "admin_pilot:hourly-smoke",
    });
    if (result.ok) {
      expect(isAdminPilotSessionId(result.sessionId)).toBe(true);
    }
    expect(isAdminPilotSessionId("cs_test_1")).toBe(false);
  });

  it("admin pilot grant refuses bad email", () => {
    const result = decideAdminPilotGrant("nope");
    expect(result.ok).toBe(false);
  });

  it("admin pilot revoke marks canceled", () => {
    expect(decideAdminPilotRevoke("Pilot@Example.com")).toEqual({
      ok: true,
      email: "pilot@example.com",
      status: "canceled",
    });
    expect(decideAdminPilotRevoke("").ok).toBe(false);
  });

  it("toEntitlementListItem marks pilot grants", () => {
    expect(
      toEntitlementListItem({
        Email: "pilot@example.com",
        Tier: "builder",
        Status: "active",
        GrantedAt: "2026-07-18T10:00:00.000Z",
        UpdatedAt: "2026-07-18T11:00:00.000Z",
        StripeSessionId: "admin_pilot:hourly-smoke",
      })
    ).toEqual({
      email: "pilot@example.com",
      tier: "builder",
      status: "active",
      grantedAt: "2026-07-18T10:00:00.000Z",
      updatedAt: "2026-07-18T11:00:00.000Z",
      stripeSessionId: "admin_pilot:hourly-smoke",
      pilotGrant: true,
    });
  });

  it("filterEntitlementList supports pilotOnly and limit", () => {
    const rows = [
      toEntitlementListItem({
        Email: "pilot@example.com",
        Tier: "builder",
        Status: "active",
        GrantedAt: "a",
        UpdatedAt: "a",
        StripeSessionId: "admin_pilot:a",
      }),
      toEntitlementListItem({
        Email: "paid@example.com",
        Tier: "builder",
        Status: "active",
        GrantedAt: "b",
        UpdatedAt: "b",
        StripeSessionId: "cs_test_paid",
      }),
      toEntitlementListItem({
        Email: "pilot2@example.com",
        Tier: "builder",
        Status: "active",
        GrantedAt: "c",
        UpdatedAt: "c",
        StripeSessionId: "admin_pilot:b",
      }),
    ];
    expect(filterEntitlementList(rows, { pilotOnly: true }).map((r) => r.email)).toEqual([
      "pilot@example.com",
      "pilot2@example.com",
    ]);
    expect(filterEntitlementList(rows, { limit: 1 }).map((r) => r.email)).toEqual([
      "pilot@example.com",
    ]);
  });
});

describe("Builder opportunity brief (M3.1 prep)", () => {
  it("formats markdown with score facets and ideas", () => {
    const markdown = formatOpportunityBriefMarkdown(
      {
        PainPointId: "pp-1",
        Title: "Invoice chasing is manual",
        Summary: "SMBs lose hours chasing late invoices.",
        Category: "Finance",
        OpportunityScore: 82,
        SeverityScore: 70,
        FrequencyScore: 80,
        WillingnessToPayScore: 75,
        TrendDirection: "rising",
      },
      [
        {
          Name: "Collections Copilot",
          Description: "Automate polite follow-ups.",
          TargetCustomer: "SMB finance teams",
          RecommendedFirstFeature: "Email chase sequences",
          RevenuePotentialScore: 70,
        },
      ]
    );
    expect(markdown).toContain("# Opportunity brief: Invoice chasing is manual");
    expect(markdown).toContain("**Opportunity score:** 82");
    expect(markdown).toContain("### 1. Collections Copilot");
    expect(markdown).toContain("Email chase sequences");
  });
});
