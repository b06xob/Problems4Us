/**
 * @jest-environment node
 */
import {
  buildLedgerSummary,
  countConsecutiveFailedDays,
  countConsecutivePassedDays,
  isCalendarDayUtc,
  normalizeReceiptInput,
  previousUtcDay,
  type IngestDailyReceiptRecord,
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

  it("counts consecutive failed days and escalates after 2", () => {
    expect(
      countConsecutiveFailedDays([
        { calendarDayUtc: "2026-08-01", passed: false },
        { calendarDayUtc: "2026-07-31", passed: false },
      ])
    ).toBe(2);

    expect(
      countConsecutiveFailedDays([
        { calendarDayUtc: "2026-08-01", passed: false },
        { calendarDayUtc: "2026-07-31", passed: true },
      ])
    ).toBe(1);

    const failRecords: IngestDailyReceiptRecord[] = [
      {
        ReceiptId: "a",
        CalendarDayUtc: "2026-08-01",
        RunAtUtc: "2026-08-01T06:20:00Z",
        OkCount: 0,
        Attempted: 3,
        SuccessRatePct: 0,
        Passed: false,
        SourcesJson: "{}",
        GithubRunId: null,
        GithubRunUrl: null,
        Note: null,
        CreatedAt: "2026-08-01T06:20:00Z",
      },
      {
        ReceiptId: "b",
        CalendarDayUtc: "2026-07-31",
        RunAtUtc: "2026-07-31T06:20:00Z",
        OkCount: 1,
        Attempted: 3,
        SuccessRatePct: 33,
        Passed: false,
        SourcesJson: "{}",
        GithubRunId: null,
        GithubRunUrl: null,
        Note: null,
        CreatedAt: "2026-07-31T06:20:00Z",
      },
    ];
    const summary = buildLedgerSummary(failRecords, 3);
    expect(summary.escalateWarningToPassport).toBe(true);
    expect(summary.consecutiveFailedCalendarDays).toBe(2);
    expect(summary.escalateWarning).toMatch(/Warning\+/);

    const okSummary = buildLedgerSummary(
      [
        {
          ...failRecords[0],
          Passed: true,
          OkCount: 2,
          SuccessRatePct: 66,
        },
        {
          ...failRecords[1],
          Passed: true,
          OkCount: 2,
          SuccessRatePct: 66,
        },
      ],
      3
    );
    expect(okSummary.escalateWarningToPassport).toBe(false);
    expect(okSummary.escalateWarning).toBeNull();
  });

  it("flags founder Reddit action after 2 soft_credentials days", () => {
    const soft: IngestDailyReceiptRecord[] = [
      {
        ReceiptId: "a",
        CalendarDayUtc: "2026-08-01",
        RunAtUtc: "2026-08-01T06:20:00Z",
        OkCount: 2,
        Attempted: 3,
        SuccessRatePct: 66,
        Passed: true,
        SourcesJson:
          '{"github":"ok","hackernews":"ok","reddit":"soft_credentials"}',
        GithubRunId: null,
        GithubRunUrl: null,
        Note: null,
        CreatedAt: "2026-08-01T06:20:00Z",
      },
      {
        ReceiptId: "b",
        CalendarDayUtc: "2026-07-31",
        RunAtUtc: "2026-07-31T06:20:00Z",
        OkCount: 2,
        Attempted: 3,
        SuccessRatePct: 66,
        Passed: true,
        SourcesJson:
          '{"github":"ok","hackernews":"ok","reddit":"soft_credentials"}',
        GithubRunId: null,
        GithubRunUrl: null,
        Note: null,
        CreatedAt: "2026-07-31T06:20:00Z",
      },
    ];
    const summary = buildLedgerSummary(soft, 3);
    expect(summary.consecutiveRedditSoftCredentialDays).toBe(2);
    expect(summary.founderActionRequiredReddit).toBe(true);
    expect(summary.founderActionReddit).toMatch(/11f/);
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
