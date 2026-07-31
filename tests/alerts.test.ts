/**
 * @jest-environment node
 */
import {
  isWatchMuted,
  normalizeAlertFrequency,
  shouldEmitScoreAlert,
} from "@/lib/alerts-db";
import {
  hashBriefShareToken,
  stripShareBriefPii,
} from "@/lib/brief-share-revoke";

describe("shouldEmitScoreAlert", () => {
  it("requires a prior score and threshold move", () => {
    expect(shouldEmitScoreAlert(null, 80)).toBe(false);
    expect(shouldEmitScoreAlert(70, 74)).toBe(false);
    expect(shouldEmitScoreAlert(70, 75)).toBe(true);
    expect(shouldEmitScoreAlert(70, 60)).toBe(true);
  });
});

describe("alert preferences (problems4us-10c)", () => {
  it("normalizes frequency values", () => {
    expect(normalizeAlertFrequency("Daily")).toBe("daily");
    expect(normalizeAlertFrequency("muted")).toBe("muted");
    expect(normalizeAlertFrequency("hourly")).toBeNull();
  });

  it("detects muted watches by flag, frequency, or MutedUntil", () => {
    expect(isWatchMuted({ Muted: true })).toBe(true);
    expect(isWatchMuted({ AlertFrequency: "muted" })).toBe(true);
    expect(
      isWatchMuted(
        { MutedUntil: "2099-01-01T00:00:00.000Z" },
        Date.parse("2026-07-31T00:00:00.000Z")
      )
    ).toBe(true);
    expect(
      isWatchMuted(
        { MutedUntil: "2020-01-01T00:00:00.000Z", AlertFrequency: "immediate" },
        Date.parse("2026-07-31T00:00:00.000Z")
      )
    ).toBe(false);
  });
});

describe("brief share revoke helpers (problems4us-15c)", () => {
  it("hashes tokens stably", () => {
    expect(hashBriefShareToken("v1.abc.def")).toHaveLength(64);
    expect(hashBriefShareToken("v1.abc.def")).toBe(
      hashBriefShareToken("v1.abc.def")
    );
  });

  it("strips emails and secret-like assignments from shared text", () => {
    const cleaned = stripShareBriefPii(
      "Contact founder@breivax.com or set api_key=supersecret before share"
    );
    expect(cleaned).toContain("[redacted-email]");
    expect(cleaned).not.toContain("founder@breivax.com");
    expect(cleaned).toContain("api_key=[redacted]");
    expect(cleaned).not.toContain("supersecret");
  });
});
