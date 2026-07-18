import {
  decidePaidBuilderGrant,
  hasActiveBuilderAccess,
  isEntitlementEmail,
  normalizeEntitlementEmail,
} from "@/lib/entitlements";

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
});
