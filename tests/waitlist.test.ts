import {
  isValidEmail,
  normalizeEmail,
  parseWaitlistSource,
} from "@/lib/waitlist";
import {
  CONVERSION_EVENT_NAMES,
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
});
