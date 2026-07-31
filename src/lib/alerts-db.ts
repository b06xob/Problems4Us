import { randomUUID } from "crypto";
import { execute, query, queryOne } from "./db";

export type WatchedProblemRecord = {
  WatchId: string;
  UserId: string;
  PainPointId: string;
  LastOpportunityScore: number | null;
  LastTrendScore: number | null;
  CreatedAt: string;
  UpdatedAt: string;
  Muted: boolean;
  AlertFrequency: AlertFrequency;
  MutedUntil: string | null;
};

export type AlertFrequency = "immediate" | "daily" | "weekly" | "muted";

export const ALERT_FREQUENCIES: AlertFrequency[] = [
  "immediate",
  "daily",
  "weekly",
  "muted",
];

export function normalizeAlertFrequency(
  value: unknown
): AlertFrequency | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return (ALERT_FREQUENCIES as string[]).includes(v)
    ? (v as AlertFrequency)
    : null;
}

/** True when frequency is muted or MutedUntil is still in the future. */
export function isWatchMuted(
  watch: { Muted?: boolean; AlertFrequency?: string; MutedUntil?: string | null },
  nowMs = Date.now()
): boolean {
  if (watch.Muted || watch.AlertFrequency === "muted") return true;
  if (!watch.MutedUntil) return false;
  const until = Date.parse(watch.MutedUntil);
  return Number.isFinite(until) && until > nowMs;
}

export type AlertEventRecord = {
  AlertId: string;
  UserId: string;
  PainPointId: string;
  AlertType: string;
  Message: string;
  PriorScore: number | null;
  NewScore: number | null;
  CreatedAt: string;
  DeliveredAt: string | null;
};

let alertTablesReady: Promise<void> | null = null;

export async function ensureAlertTables(): Promise<void> {
  if (!alertTablesReady) {
    alertTablesReady = (async () => {
      await execute(`
        IF OBJECT_ID(N'dbo.WatchedProblems', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.WatchedProblems (
            WatchId               NVARCHAR(50)  NOT NULL PRIMARY KEY,
            UserId                NVARCHAR(50)  NOT NULL,
            PainPointId           NVARCHAR(50)  NOT NULL,
            LastOpportunityScore  FLOAT         NULL,
            LastTrendScore        FLOAT         NULL,
            CreatedAt             DATETIME2     NOT NULL CONSTRAINT DF_WatchedProblems_CreatedAt DEFAULT (GETUTCDATE()),
            UpdatedAt             DATETIME2     NOT NULL CONSTRAINT DF_WatchedProblems_UpdatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_WatchedProblems_User_PainPoint
            ON dbo.WatchedProblems(UserId, PainPointId);
          CREATE INDEX IX_WatchedProblems_UserId ON dbo.WatchedProblems(UserId);
        END
      `);
      // Preference columns for problems4us-10c (mute / frequency).
      await execute(`
        IF COL_LENGTH('dbo.WatchedProblems', 'Muted') IS NULL
          ALTER TABLE dbo.WatchedProblems ADD Muted BIT NOT NULL
            CONSTRAINT DF_WatchedProblems_Muted DEFAULT (0);
      `);
      await execute(`
        IF COL_LENGTH('dbo.WatchedProblems', 'AlertFrequency') IS NULL
          ALTER TABLE dbo.WatchedProblems ADD AlertFrequency NVARCHAR(20) NOT NULL
            CONSTRAINT DF_WatchedProblems_AlertFrequency DEFAULT (N'immediate');
      `);
      await execute(`
        IF COL_LENGTH('dbo.WatchedProblems', 'MutedUntil') IS NULL
          ALTER TABLE dbo.WatchedProblems ADD MutedUntil DATETIME2 NULL;
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.AlertEvents', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.AlertEvents (
            AlertId      NVARCHAR(50)  NOT NULL PRIMARY KEY,
            UserId       NVARCHAR(50)  NOT NULL,
            PainPointId  NVARCHAR(50)  NOT NULL,
            AlertType    NVARCHAR(40)  NOT NULL,
            Message      NVARCHAR(1000) NOT NULL,
            PriorScore   FLOAT         NULL,
            NewScore     FLOAT         NULL,
            CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_AlertEvents_CreatedAt DEFAULT (GETUTCDATE()),
            DeliveredAt  DATETIME2     NULL
          );
          CREATE INDEX IX_AlertEvents_User_Created
            ON dbo.AlertEvents(UserId, CreatedAt DESC);
        END
      `);
    })().catch((err) => {
      alertTablesReady = null;
      throw err;
    });
  }
  await alertTablesReady;
}

function iso(value: Date | string): string {
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

type WatchRow = {
  WatchId: string;
  UserId: string;
  PainPointId: string;
  LastOpportunityScore: number | null;
  LastTrendScore: number | null;
  CreatedAt: Date | string;
  UpdatedAt: Date | string;
  Muted?: boolean | number | null;
  AlertFrequency?: string | null;
  MutedUntil?: Date | string | null;
};

function mapWatchRow(r: WatchRow): WatchedProblemRecord {
  const frequency = normalizeAlertFrequency(r.AlertFrequency) || "immediate";
  const mutedFlag = Boolean(r.Muted) || frequency === "muted";
  return {
    WatchId: r.WatchId,
    UserId: r.UserId,
    PainPointId: r.PainPointId,
    LastOpportunityScore: r.LastOpportunityScore,
    LastTrendScore: r.LastTrendScore,
    CreatedAt: iso(r.CreatedAt),
    UpdatedAt: iso(r.UpdatedAt),
    Muted: mutedFlag,
    AlertFrequency: frequency,
    MutedUntil: r.MutedUntil ? iso(r.MutedUntil) : null,
  };
}

export async function watchProblemDb(
  userId: string,
  painPointId: string,
  scores?: { opportunityScore?: number; trendScore?: number }
): Promise<{ record: WatchedProblemRecord; created: boolean }> {
  await ensureAlertTables();
  const existing = await queryOne<WatchRow>(
    `SELECT TOP 1 WatchId, UserId, PainPointId, LastOpportunityScore, LastTrendScore,
            CreatedAt, UpdatedAt, Muted, AlertFrequency, MutedUntil
     FROM WatchedProblems WHERE UserId = @userId AND PainPointId = @painPointId`,
    { userId, painPointId }
  );
  if (existing) {
    return {
      record: mapWatchRow(existing),
      created: false,
    };
  }

  const watchId = `wch_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await execute(
    `INSERT INTO WatchedProblems
      (WatchId, UserId, PainPointId, LastOpportunityScore, LastTrendScore, CreatedAt, UpdatedAt)
     VALUES (@watchId, @userId, @painPointId, @opp, @trend, GETUTCDATE(), GETUTCDATE())`,
    {
      watchId,
      userId,
      painPointId,
      opp: scores?.opportunityScore ?? null,
      trend: scores?.trendScore ?? null,
    }
  );
  return {
    record: {
      WatchId: watchId,
      UserId: userId,
      PainPointId: painPointId,
      LastOpportunityScore: scores?.opportunityScore ?? null,
      LastTrendScore: scores?.trendScore ?? null,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      Muted: false,
      AlertFrequency: "immediate",
      MutedUntil: null,
    },
    created: true,
  };
}

export async function unwatchProblemDb(
  userId: string,
  painPointId: string
): Promise<boolean> {
  await ensureAlertTables();
  const n = await execute(
    `DELETE FROM WatchedProblems WHERE UserId = @userId AND PainPointId = @painPointId`,
    { userId, painPointId }
  );
  return n > 0;
}

export async function listWatchedProblemsDb(
  userId: string
): Promise<WatchedProblemRecord[]> {
  await ensureAlertTables();
  const rows = await query<WatchRow>(
    `SELECT WatchId, UserId, PainPointId, LastOpportunityScore, LastTrendScore,
            CreatedAt, UpdatedAt, Muted, AlertFrequency, MutedUntil
     FROM WatchedProblems WHERE UserId = @userId ORDER BY CreatedAt DESC`,
    { userId }
  );
  return rows.map(mapWatchRow);
}

export async function updateWatchPreferencesDb(input: {
  userId: string;
  painPointId: string;
  muted?: boolean;
  frequency?: AlertFrequency;
  mutedUntil?: string | null;
}): Promise<WatchedProblemRecord | null> {
  await ensureAlertTables();
  const existing = await queryOne<WatchRow>(
    `SELECT TOP 1 WatchId, UserId, PainPointId, LastOpportunityScore, LastTrendScore,
            CreatedAt, UpdatedAt, Muted, AlertFrequency, MutedUntil
     FROM WatchedProblems WHERE UserId = @userId AND PainPointId = @painPointId`,
    { userId: input.userId, painPointId: input.painPointId }
  );
  if (!existing) return null;

  const frequency =
    input.frequency ??
    normalizeAlertFrequency(existing.AlertFrequency) ??
    "immediate";
  const muted =
    typeof input.muted === "boolean"
      ? input.muted
      : frequency === "muted" || Boolean(existing.Muted);
  const mutedUntil =
    input.mutedUntil === undefined
      ? existing.MutedUntil
        ? iso(existing.MutedUntil)
        : null
      : input.mutedUntil;

  await execute(
    `UPDATE WatchedProblems
     SET Muted = @muted,
         AlertFrequency = @frequency,
         MutedUntil = @mutedUntil,
         UpdatedAt = GETUTCDATE()
     WHERE UserId = @userId AND PainPointId = @painPointId`,
    {
      userId: input.userId,
      painPointId: input.painPointId,
      muted: muted || frequency === "muted" ? 1 : 0,
      frequency,
      mutedUntil,
    }
  );

  return mapWatchRow({
    ...existing,
    Muted: muted || frequency === "muted",
    AlertFrequency: frequency,
    MutedUntil: mutedUntil,
    UpdatedAt: new Date().toISOString(),
  });
}

export async function listAlertEventsDb(
  userId: string,
  limit = 50
): Promise<AlertEventRecord[]> {
  await ensureAlertTables();
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = await query<{
    AlertId: string;
    UserId: string;
    PainPointId: string;
    AlertType: string;
    Message: string;
    PriorScore: number | null;
    NewScore: number | null;
    CreatedAt: Date | string;
    DeliveredAt: Date | string | null;
  }>(
    `SELECT TOP (${safeLimit}) AlertId, UserId, PainPointId, AlertType, Message, PriorScore, NewScore, CreatedAt, DeliveredAt
     FROM AlertEvents WHERE UserId = @userId ORDER BY CreatedAt DESC`,
    { userId }
  );
  return rows.map((r) => ({
    AlertId: r.AlertId,
    UserId: r.UserId,
    PainPointId: r.PainPointId,
    AlertType: r.AlertType,
    Message: r.Message,
    PriorScore: r.PriorScore,
    NewScore: r.NewScore,
    CreatedAt: iso(r.CreatedAt),
    DeliveredAt: r.DeliveredAt ? iso(r.DeliveredAt) : null,
  }));
}

/**
 * Compare current scores to last snapshot; emit in-app alert when opportunity score moves ≥ threshold.
 */
export function shouldEmitScoreAlert(
  prior: number | null | undefined,
  next: number,
  threshold = 5
): boolean {
  if (prior === null || prior === undefined || !Number.isFinite(prior)) return false;
  return Math.abs(next - prior) >= threshold;
}

export async function recordScoreMoveAlertDb(input: {
  userId: string;
  painPointId: string;
  priorScore: number | null;
  newScore: number;
  trendScore?: number | null;
}): Promise<AlertEventRecord | null> {
  await ensureAlertTables();
  if (!shouldEmitScoreAlert(input.priorScore, input.newScore)) {
    await execute(
      `UPDATE WatchedProblems
       SET LastOpportunityScore = @newScore,
           LastTrendScore = @trend,
           UpdatedAt = GETUTCDATE()
       WHERE UserId = @userId AND PainPointId = @painPointId`,
      {
        userId: input.userId,
        painPointId: input.painPointId,
        newScore: input.newScore,
        trend: input.trendScore ?? null,
      }
    );
    return null;
  }

  const alertId = `alt_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const direction =
    input.priorScore !== null && input.newScore > input.priorScore
      ? "rose"
      : "fell";
  const message = `Watched problem ${input.painPointId} opportunity score ${direction} from ${input.priorScore} to ${input.newScore}.`;

  await execute(
    `INSERT INTO AlertEvents
      (AlertId, UserId, PainPointId, AlertType, Message, PriorScore, NewScore, CreatedAt, DeliveredAt)
     VALUES (@alertId, @userId, @painPointId, N'score_change', @message, @prior, @next, GETUTCDATE(), GETUTCDATE())`,
    {
      alertId,
      userId: input.userId,
      painPointId: input.painPointId,
      message,
      prior: input.priorScore,
      next: input.newScore,
    }
  );
  await execute(
    `UPDATE WatchedProblems
     SET LastOpportunityScore = @newScore,
         LastTrendScore = @trend,
         UpdatedAt = GETUTCDATE()
     WHERE UserId = @userId AND PainPointId = @painPointId`,
    {
      userId: input.userId,
      painPointId: input.painPointId,
      newScore: input.newScore,
      trend: input.trendScore ?? null,
    }
  );

  return {
    AlertId: alertId,
    UserId: input.userId,
    PainPointId: input.painPointId,
    AlertType: "score_change",
    Message: message,
    PriorScore: input.priorScore,
    NewScore: input.newScore,
    CreatedAt: new Date().toISOString(),
    DeliveredAt: new Date().toISOString(),
  };
}
