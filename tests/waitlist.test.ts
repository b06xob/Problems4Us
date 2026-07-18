import {
  isValidEmail,
  normalizeEmail,
  parseWaitlistSource,
} from "@/lib/waitlist";
import {
  CONVERSION_EVENT_NAMES,
  buildConversionFunnelCounts,
  isConversionEventName,
} from "@/lib/conversion-events";

describe("waitlist helpers", () => {
  it("normalizes email case and whitespace", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("validates email shape", () => {
    expect(isValidEmail("ada@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("parses known waitlist sources and falls back", () => {
    expect(parseWaitlistSource("pricing-builder")).toBe("pricing-builder");
    expect(parseWaitlistSource("landing")).toBe("landing");
    expect(parseWaitlistSource("nope")).toBe("other");
    expect(parseWaitlistSource(null)).toBe("other");
  });
});

describe("conversion events", () => {
  it("accepts known event names only", () => {
    for (const name of CONVERSION_EVENT_NAMES) {
      expect(isConversionEventName(name)).toBe(true);
    }
    expect(isConversionEventName("random_event")).toBe(false);
    expect(isConversionEventName(undefined)).toBe(false);
  });

  it("builds zero-filled funnel counts from DB rows", () => {
    const summary = buildConversionFunnelCounts([
      { eventName: "waitlist_view", count: 10 },
      { eventName: "waitlist_submit", count: 3 },
      { eventName: "waitlist_success", count: 2 },
      { eventName: "pricing_view", count: 5 },
      { eventName: "unknown_noise", count: 99 },
    ]);
    expect(summary.waitlist_view).toBe(10);
    expect(summary.waitlist_submit).toBe(3);
    expect(summary.waitlist_success).toBe(2);
    expect(summary.pricing_view).toBe(5);
    expect(summary.pricing_cta_click).toBe(0);
    expect(summary.early_access_interest).toBe(0);
    expect(summary.checkout_session_created).toBe(0);
    expect(summary.checkout_return_success).toBe(0);
    expect(summary.checkout_return_cancel).toBe(0);
    expect(summary.paid_early_access).toBe(0);
    expect(summary.total).toBe(10 + 3 + 2 + 5 + 99);
  });
});
