/**
 * @jest-environment node
 */
import {
  countConsecutivePassedDays,
  isCalendarDayUtc,
  normalizeReceiptInput,
  previousUtcDay,
} from "@/lib/ingest-daily-receipt";

describe("ingest-daily-receipt (problems4us-11e)", () => {
  it("validates calendarDayUtc shape", () => {
    expect(isCalendarDayUtc("2026-07-31")).toBe(true);
    expect(isCalendarDayUtc("2026-7-31")).toBe(false);
    expect(isCalendarDayUtc("")).toBe(false);
  });

  it("previousUtcDay crosses month boundaries", () => {
    expect(previousUtcDay("2026-08-01")).toBe("2026-07-31");
    expect(previousUtcDay("2026-03-01")).toBe("2026-02-28");
  });

  it("counts consecutive passed days from newest backward", () => {
    expect(
      countConsecutivePassedDays([
        { calendarDayUtc: "2026-07-31", passed: true },
      ])
    ).toBe(1);

    expect(
      countConsecutivePassedDays([
        { calendarDayUtc: "2026-07-31", passed: true },
        { calendarDayUtc: "2026-07-30", passed: true },
        { calendarDayUtc: "2026-07-29", passed: true },
      ])
    ).toBe(3);

    expect(
      countConsecutivePassedDays([
        { calendarDayUtc: "2026-07-31", passed: true },
        { calendarDayUtc: "2026-07-30", passed: false },
        { calendarDayUtc: "2026-07-29", passed: true },
      ])
    ).toBe(1);

    expect(
      countConsecutivePassedDays([
        { calendarDayUtc: "2026-07-31", passed: true },
        { calendarDayUtc: "2026-07-29", passed: true },
      ])
    ).toBe(1);
  });

  it("normalizeReceiptInput computes rate and passed", () => {
    const bad = normalizeReceiptInput({ calendarDayUtc: "bad" });
    expect(bad.ok).toBe(false);

    const good = normalizeReceiptInput({
      calendarDayUtc: "2026-07-31",
      ok: 2,
      attempted: 3,
      sources: { github: "ok", hackernews: "ok", reddit: "soft_credentials" },
      githubRunId: "123",
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.value.successRatePct).toBe(66);
      expect(good.value.passed).toBe(true);
      expect(good.value.sources?.reddit).toBe("soft_credentials");
    }

    const fail = normalizeReceiptInput({
      calendarDayUtc: "2026-07-31",
      ok: 1,
      attempted: 3,
    });
    expect(fail.ok).toBe(true);
    if (fail.ok) {
      expect(fail.value.passed).toBe(false);
      expect(fail.value.successRatePct).toBe(33);
    }
  });
});
