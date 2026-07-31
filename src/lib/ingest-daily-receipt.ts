import { randomUUID } from "crypto";
import { execute, query } from "./db";

export type IngestDailySourceStatus = string;

export type IngestDailyReceiptInput = {
  calendarDayUtc: string;
  runAtUtc?: string;
  ok: number;
  attempted: number;
  successRatePct: number;
  passed: boolean;
  sources?: Record<string, IngestDailySourceStatus>;
  githubRunId?: string;
  githubRunUrl?: string;
  note?: string;
};

export type IngestDailyReceiptRecord = {
  ReceiptId: string;
  CalendarDayUtc: string;
  RunAtUtc: string;
  OkCount: number;
  Attempted: number;
  SuccessRatePct: number;
  Passed: boolean;
  SourcesJson: string;
  GithubRunId: string | null;
  GithubRunUrl: string | null;
  Note: string | null;
  CreatedAt: string;
};

let tablesReady: Promise<void> | null = null;

export async function ensureIngestDailyReceiptTable(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await execute(`
        IF OBJECT_ID(N'dbo.IngestDailyReceipts', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.IngestDailyReceipts (
            ReceiptId        NVARCHAR(50)  NOT NULL PRIMARY KEY,
            CalendarDayUtc   CHAR(10)      NOT NULL,
            RunAtUtc         DATETIME2     NOT NULL,
            OkCount          INT           NOT NULL,
            Attempted        INT           NOT NULL,
            SuccessRatePct   INT           NOT NULL,
            Passed           BIT           NOT NULL,
            SourcesJson      NVARCHAR(MAX) NOT NULL CONSTRAINT DF_IngestDailyReceipts_Sources DEFAULT (N'{}'),
            GithubRunId      NVARCHAR(64)  NULL,
            GithubRunUrl     NVARCHAR(500) NULL,
            Note             NVARCHAR(500) NULL,
            CreatedAt        DATETIME2     NOT NULL CONSTRAINT DF_IngestDailyReceipts_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_IngestDailyReceipts_Day
            ON dbo.IngestDailyReceipts(CalendarDayUtc);
          CREATE INDEX IX_IngestDailyReceipts_Day_Desc
            ON dbo.IngestDailyReceipts(CalendarDayUtc DESC);
        END
      `);
    })();
  }
  await tablesReady;
}

/** YYYY-MM-DD only. */
export function isCalendarDayUtc(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Count trailing consecutive calendar days (from the newest day backward)
 * that passed the >=60% bar. Gaps or failed days break the streak.
 */
export function countConsecutivePassedDays(
  days: Array<{ calendarDayUtc: string; passed: boolean }>,
  needed = 3
): number {
  if (!days.length) return 0;
  const sorted = [...days].sort((a, b) =>
    a.calendarDayUtc < b.calendarDayUtc
      ? 1
      : a.calendarDayUtc > b.calendarDayUtc
        ? -1
        : 0
  );

  let streak = 0;
  let expectDay: string | null = null;

  for (const day of sorted) {
    if (!day.passed) break;
    if (expectDay === null) {
      streak = 1;
      expectDay = previousUtcDay(day.calendarDayUtc);
      continue;
    }
    if (day.calendarDayUtc !== expectDay) break;
    streak += 1;
    expectDay = previousUtcDay(day.calendarDayUtc);
    if (streak >= needed) break;
  }

  return streak;
}

export function previousUtcDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function normalizeReceiptInput(
  body: Partial<IngestDailyReceiptInput>
): { ok: true; value: IngestDailyReceiptInput } | { ok: false; error: string } {
  if (!isCalendarDayUtc(body.calendarDayUtc)) {
    return { ok: false, error: "calendarDayUtc must be YYYY-MM-DD" };
  }
  const ok = Number(body.ok);
  const attempted = Number(body.attempted);
  if (!Number.isFinite(ok) || ok < 0 || !Number.isFinite(attempted) || attempted < 0) {
    return { ok: false, error: "ok and attempted must be non-negative numbers" };
  }
  const successRatePct =
    body.successRatePct !== undefined
      ? Number(body.successRatePct)
      : attempted > 0
        ? Math.floor((ok * 100) / attempted)
        : 0;
  if (!Number.isFinite(successRatePct)) {
    return { ok: false, error: "successRatePct must be a number" };
  }
  const passed =
    typeof body.passed === "boolean" ? body.passed : ok >= 2 && successRatePct >= 60;

  const sources =
    body.sources && typeof body.sources === "object" && !Array.isArray(body.sources)
      ? Object.fromEntries(
          Object.entries(body.sources)
            .filter(([k, v]) => typeof k === "string" && typeof v === "string")
            .map(([k, v]) => [k.slice(0, 40), String(v).slice(0, 80)])
        )
      : {};

  return {
    ok: true,
    value: {
      calendarDayUtc: body.calendarDayUtc,
      runAtUtc:
        typeof body.runAtUtc === "string" && body.runAtUtc.length > 0
          ? body.runAtUtc.slice(0, 40)
          : new Date().toISOString(),
      ok,
      attempted,
      successRatePct: Math.max(0, Math.min(100, Math.floor(successRatePct))),
      passed,
      sources,
      githubRunId:
        typeof body.githubRunId === "string" ? body.githubRunId.slice(0, 64) : undefined,
      githubRunUrl:
        typeof body.githubRunUrl === "string"
          ? body.githubRunUrl.slice(0, 500)
          : undefined,
      note: typeof body.note === "string" ? body.note.slice(0, 500) : undefined,
    },
  };
}

function rowToRecord(r: {
  ReceiptId: string;
  CalendarDayUtc: string;
  RunAtUtc: Date | string;
  OkCount: number;
  Attempted: number;
  SuccessRatePct: number;
  Passed: boolean | number;
  SourcesJson: string;
  GithubRunId: string | null;
  GithubRunUrl: string | null;
  Note: string | null;
  CreatedAt: Date | string;
}): IngestDailyReceiptRecord {
  return {
    ReceiptId: r.ReceiptId,
    CalendarDayUtc: r.CalendarDayUtc,
    RunAtUtc:
      typeof r.RunAtUtc === "string" ? r.RunAtUtc : r.RunAtUtc.toISOString(),
    OkCount: r.OkCount,
    Attempted: r.Attempted,
    SuccessRatePct: r.SuccessRatePct,
    Passed: Boolean(r.Passed),
    SourcesJson: r.SourcesJson || "{}",
    GithubRunId: r.GithubRunId,
    GithubRunUrl: r.GithubRunUrl,
    Note: r.Note,
    CreatedAt:
      typeof r.CreatedAt === "string" ? r.CreatedAt : r.CreatedAt.toISOString(),
  };
}

/** Upsert one receipt per calendar day (latest run wins). */
export async function upsertIngestDailyReceipt(
  input: IngestDailyReceiptInput
): Promise<IngestDailyReceiptRecord> {
  await ensureIngestDailyReceiptTable();
  const id = `idr-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const sourcesJson = JSON.stringify(input.sources ?? {});

  await execute(
    `
    MERGE dbo.IngestDailyReceipts AS t
    USING (SELECT @calendarDayUtc AS CalendarDayUtc) AS s
      ON t.CalendarDayUtc = s.CalendarDayUtc
    WHEN MATCHED THEN UPDATE SET
      RunAtUtc = @runAtUtc,
      OkCount = @okCount,
      Attempted = @attempted,
      SuccessRatePct = @successRatePct,
      Passed = @passed,
      SourcesJson = @sourcesJson,
      GithubRunId = @githubRunId,
      GithubRunUrl = @githubRunUrl,
      Note = @note,
      CreatedAt = GETUTCDATE()
    WHEN NOT MATCHED THEN INSERT (
      ReceiptId, CalendarDayUtc, RunAtUtc, OkCount, Attempted, SuccessRatePct,
      Passed, SourcesJson, GithubRunId, GithubRunUrl, Note, CreatedAt
    ) VALUES (
      @receiptId, @calendarDayUtc, @runAtUtc, @okCount, @attempted, @successRatePct,
      @passed, @sourcesJson, @githubRunId, @githubRunUrl, @note, GETUTCDATE()
    );
    `,
    {
      receiptId: id,
      calendarDayUtc: input.calendarDayUtc,
      runAtUtc: input.runAtUtc ?? new Date().toISOString(),
      okCount: input.ok,
      attempted: input.attempted,
      successRatePct: input.successRatePct,
      passed: input.passed ? 1 : 0,
      sourcesJson,
      githubRunId: input.githubRunId ?? null,
      githubRunUrl: input.githubRunUrl ?? null,
      note: input.note ?? null,
    }
  );

  const rows = await listIngestDailyReceipts(1, input.calendarDayUtc);
  if (!rows.length) {
    throw new Error("upsertIngestDailyReceipt: row missing after MERGE");
  }
  return rows[0];
}

export async function listIngestDailyReceipts(
  limit = 14,
  calendarDayUtc?: string
): Promise<IngestDailyReceiptRecord[]> {
  await ensureIngestDailyReceiptTable();
  const take = Math.max(1, Math.min(90, Math.floor(limit) || 14));

  const rows = calendarDayUtc
    ? await query<{
        ReceiptId: string;
        CalendarDayUtc: string;
        RunAtUtc: Date | string;
        OkCount: number;
        Attempted: number;
        SuccessRatePct: number;
        Passed: boolean | number;
        SourcesJson: string;
        GithubRunId: string | null;
        GithubRunUrl: string | null;
        Note: string | null;
        CreatedAt: Date | string;
      }>(
        `SELECT TOP (1) ReceiptId, CalendarDayUtc, RunAtUtc, OkCount, Attempted,
                SuccessRatePct, Passed, SourcesJson, GithubRunId, GithubRunUrl, Note, CreatedAt
         FROM dbo.IngestDailyReceipts
         WHERE CalendarDayUtc = @calendarDayUtc`,
        { calendarDayUtc }
      )
    : await query<{
        ReceiptId: string;
        CalendarDayUtc: string;
        RunAtUtc: Date | string;
        OkCount: number;
        Attempted: number;
        SuccessRatePct: number;
        Passed: boolean | number;
        SourcesJson: string;
        GithubRunId: string | null;
        GithubRunUrl: string | null;
        Note: string | null;
        CreatedAt: Date | string;
      }>(
        `SELECT TOP (@take) ReceiptId, CalendarDayUtc, RunAtUtc, OkCount, Attempted,
                SuccessRatePct, Passed, SourcesJson, GithubRunId, GithubRunUrl, Note, CreatedAt
         FROM dbo.IngestDailyReceipts
         ORDER BY CalendarDayUtc DESC`,
        { take }
      );

  return rows.map(rowToRecord);
}

export function buildLedgerSummary(records: IngestDailyReceiptRecord[], needed = 3) {
  const days = records.map((r) => ({
    calendarDayUtc: r.CalendarDayUtc,
    passed: r.Passed,
    ok: r.OkCount,
    attempted: r.Attempted,
    successRatePct: r.SuccessRatePct,
    githubRunId: r.GithubRunId,
    githubRunUrl: r.GithubRunUrl,
    sources: safeParseSources(r.SourcesJson),
  }));
  const consecutive = countConsecutivePassedDays(days, needed);
  return {
    consecutiveCalendarDaysNeeded: needed,
    consecutiveCalendarDaysPassed: consecutive,
    successCriteriaMet: consecutive >= needed,
    days,
  };
}

function safeParseSources(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, v]) => typeof v === "string"
      ) as Array<[string, string]>
    );
  } catch {
    return {};
  }
}
