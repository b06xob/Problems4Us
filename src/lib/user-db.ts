import { randomUUID } from "crypto";
import { execute, query, queryOne } from "./db";
import {
  hashPassword,
  hashSessionToken,
  mintSessionToken,
  SESSION_TTL_DAYS,
  verifyPassword,
  type SessionUser,
} from "./user-auth";
import { computeActivation, type ActivationStatus } from "./user-accounts";
import { isValidEmail, normalizeEmail } from "./waitlist";

export type UserAccountRecord = {
  UserId: string;
  Email: string;
  CreatedAt: string;
};

export type SavedProblemRecord = {
  SavedId: string;
  UserId: string;
  PainPointId: string;
  CreatedAt: string;
};

export type SavedIdeaRecord = {
  SavedId: string;
  UserId: string;
  ProductIdeaId: string;
  CreatedAt: string;
};

let userTablesReady: Promise<void> | null = null;

export async function ensureUserTables(): Promise<void> {
  if (!userTablesReady) {
    userTablesReady = (async () => {
      await execute(`
        IF OBJECT_ID(N'dbo.UserAccounts', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.UserAccounts (
            UserId        NVARCHAR(50)  NOT NULL PRIMARY KEY,
            Email         NVARCHAR(200) NOT NULL,
            PasswordSalt  NVARCHAR(64)  NOT NULL,
            PasswordHash  NVARCHAR(128) NOT NULL,
            CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_UserAccounts_CreatedAt DEFAULT (GETUTCDATE()),
            UpdatedAt     DATETIME2     NOT NULL CONSTRAINT DF_UserAccounts_UpdatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_UserAccounts_Email ON dbo.UserAccounts(Email);
        END
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.UserSessions', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.UserSessions (
            SessionId     NVARCHAR(50)  NOT NULL PRIMARY KEY,
            UserId        NVARCHAR(50)  NOT NULL,
            TokenHash     NVARCHAR(64)  NOT NULL,
            ExpiresAt     DATETIME2     NOT NULL,
            CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_UserSessions_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_UserSessions_TokenHash ON dbo.UserSessions(TokenHash);
          CREATE INDEX IX_UserSessions_UserId ON dbo.UserSessions(UserId);
          CREATE INDEX IX_UserSessions_ExpiresAt ON dbo.UserSessions(ExpiresAt);
        END
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.SavedProblems', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.SavedProblems (
            SavedId       NVARCHAR(50)  NOT NULL PRIMARY KEY,
            UserId        NVARCHAR(50)  NOT NULL,
            PainPointId   NVARCHAR(50)  NOT NULL,
            CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_SavedProblems_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_SavedProblems_User_PainPoint
            ON dbo.SavedProblems(UserId, PainPointId);
          CREATE INDEX IX_SavedProblems_UserId ON dbo.SavedProblems(UserId);
        END
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.SavedIdeas', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.SavedIdeas (
            SavedId         NVARCHAR(50)  NOT NULL PRIMARY KEY,
            UserId          NVARCHAR(50)  NOT NULL,
            ProductIdeaId   NVARCHAR(50)  NOT NULL,
            CreatedAt       DATETIME2     NOT NULL CONSTRAINT DF_SavedIdeas_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_SavedIdeas_User_Idea
            ON dbo.SavedIdeas(UserId, ProductIdeaId);
          CREATE INDEX IX_SavedIdeas_UserId ON dbo.SavedIdeas(UserId);
        END
      `);
    })().catch((err) => {
      userTablesReady = null;
      throw err;
    });
  }
  await userTablesReady;
}

function iso(value: Date | string): string {
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

export async function registerUserDb(
  emailRaw: string,
  password: string
): Promise<{ user: UserAccountRecord; sessionToken: string; created: boolean }> {
  await ensureUserTables();
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    throw new Error("INVALID_EMAIL");
  }

  const existing = await queryOne<{
    UserId: string;
    Email: string;
    CreatedAt: Date | string;
  }>(`SELECT TOP 1 UserId, Email, CreatedAt FROM UserAccounts WHERE Email = @email`, {
    email,
  });
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }

  const userId = `usr_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const { salt, hash } = hashPassword(password);
  await execute(
    `INSERT INTO UserAccounts (UserId, Email, PasswordSalt, PasswordHash, CreatedAt, UpdatedAt)
     VALUES (@userId, @email, @salt, @hash, GETUTCDATE(), GETUTCDATE())`,
    { userId, email, salt, hash }
  );

  const sessionToken = await createSessionForUser(userId);
  return {
    user: { UserId: userId, Email: email, CreatedAt: new Date().toISOString() },
    sessionToken,
    created: true,
  };
}

export async function loginUserDb(
  emailRaw: string,
  password: string
): Promise<{ user: UserAccountRecord; sessionToken: string } | null> {
  await ensureUserTables();
  const email = normalizeEmail(emailRaw);
  const row = await queryOne<{
    UserId: string;
    Email: string;
    PasswordSalt: string;
    PasswordHash: string;
    CreatedAt: Date | string;
  }>(
    `SELECT TOP 1 UserId, Email, PasswordSalt, PasswordHash, CreatedAt
     FROM UserAccounts WHERE Email = @email`,
    { email }
  );
  if (!row) return null;
  if (!verifyPassword(password, row.PasswordSalt, row.PasswordHash)) return null;

  const sessionToken = await createSessionForUser(row.UserId);
  return {
    user: {
      UserId: row.UserId,
      Email: row.Email,
      CreatedAt: iso(row.CreatedAt),
    },
    sessionToken,
  };
}

async function createSessionForUser(userId: string): Promise<string> {
  const token = mintSessionToken();
  const tokenHash = hashSessionToken(token);
  const sessionId = `ses_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await execute(
    `INSERT INTO UserSessions (SessionId, UserId, TokenHash, ExpiresAt, CreatedAt)
     VALUES (@sessionId, @userId, @tokenHash, DATEADD(day, @ttl, GETUTCDATE()), GETUTCDATE())`,
    { sessionId, userId, tokenHash, ttl: SESSION_TTL_DAYS }
  );
  return token;
}

export async function resolveSessionUser(
  token: string | null | undefined
): Promise<SessionUser | null> {
  if (!token) return null;
  await ensureUserTables();
  const tokenHash = hashSessionToken(token);
  const row = await queryOne<{ UserId: string; Email: string }>(
    `SELECT TOP 1 u.UserId, u.Email
     FROM UserSessions s
     INNER JOIN UserAccounts u ON u.UserId = s.UserId
     WHERE s.TokenHash = @tokenHash AND s.ExpiresAt > GETUTCDATE()`,
    { tokenHash }
  );
  if (!row) return null;
  return { userId: row.UserId, email: row.Email };
}

export async function revokeSessionDb(token: string): Promise<void> {
  await ensureUserTables();
  const tokenHash = hashSessionToken(token);
  await execute(`DELETE FROM UserSessions WHERE TokenHash = @tokenHash`, {
    tokenHash,
  });
}

export async function getActivationForUserDb(
  userId: string
): Promise<ActivationStatus> {
  await ensureUserTables();
  const problems = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM SavedProblems WHERE UserId = @userId`,
    { userId }
  );
  const ideas = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM SavedIdeas WHERE UserId = @userId`,
    { userId }
  );
  return computeActivation({
    savedProblemCount: problems?.cnt ?? 0,
    savedIdeaCount: ideas?.cnt ?? 0,
  });
}

/** Admin/ops: count activated accounts (activation metric measurable in DB). */
export async function countActivatedAccountsDb(): Promise<{
  totalAccounts: number;
  activatedAccounts: number;
}> {
  await ensureUserTables();
  const totals = await queryOne<{ totalAccounts: number; activatedAccounts: number }>(`
    SELECT
      (SELECT COUNT(*) FROM UserAccounts) AS totalAccounts,
      (
        SELECT COUNT(*) FROM UserAccounts u
        WHERE
          (SELECT COUNT(*) FROM SavedIdeas i WHERE i.UserId = u.UserId) >= 1
          OR (SELECT COUNT(*) FROM SavedProblems p WHERE p.UserId = u.UserId) >= 3
      ) AS activatedAccounts
  `);
  return {
    totalAccounts: totals?.totalAccounts ?? 0,
    activatedAccounts: totals?.activatedAccounts ?? 0,
  };
}

export async function saveProblemDb(
  userId: string,
  painPointId: string
): Promise<{ record: SavedProblemRecord; created: boolean }> {
  await ensureUserTables();
  const existing = await queryOne<{
    SavedId: string;
    UserId: string;
    PainPointId: string;
    CreatedAt: Date | string;
  }>(
    `SELECT TOP 1 SavedId, UserId, PainPointId, CreatedAt
     FROM SavedProblems WHERE UserId = @userId AND PainPointId = @painPointId`,
    { userId, painPointId }
  );
  if (existing) {
    return {
      record: {
        SavedId: existing.SavedId,
        UserId: existing.UserId,
        PainPointId: existing.PainPointId,
        CreatedAt: iso(existing.CreatedAt),
      },
      created: false,
    };
  }
  const savedId = `svp_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await execute(
    `INSERT INTO SavedProblems (SavedId, UserId, PainPointId, CreatedAt)
     VALUES (@savedId, @userId, @painPointId, GETUTCDATE())`,
    { savedId, userId, painPointId }
  );
  return {
    record: {
      SavedId: savedId,
      UserId: userId,
      PainPointId: painPointId,
      CreatedAt: new Date().toISOString(),
    },
    created: true,
  };
}

export async function unsaveProblemDb(
  userId: string,
  painPointId: string
): Promise<boolean> {
  await ensureUserTables();
  const n = await execute(
    `DELETE FROM SavedProblems WHERE UserId = @userId AND PainPointId = @painPointId`,
    { userId, painPointId }
  );
  return n > 0;
}

export async function listSavedProblemsDb(
  userId: string
): Promise<SavedProblemRecord[]> {
  await ensureUserTables();
  const rows = await query<{
    SavedId: string;
    UserId: string;
    PainPointId: string;
    CreatedAt: Date | string;
  }>(
    `SELECT SavedId, UserId, PainPointId, CreatedAt
     FROM SavedProblems WHERE UserId = @userId ORDER BY CreatedAt DESC`,
    { userId }
  );
  return rows.map((r) => ({
    SavedId: r.SavedId,
    UserId: r.UserId,
    PainPointId: r.PainPointId,
    CreatedAt: iso(r.CreatedAt),
  }));
}

export async function saveIdeaDb(
  userId: string,
  productIdeaId: string
): Promise<{ record: SavedIdeaRecord; created: boolean }> {
  await ensureUserTables();
  const existing = await queryOne<{
    SavedId: string;
    UserId: string;
    ProductIdeaId: string;
    CreatedAt: Date | string;
  }>(
    `SELECT TOP 1 SavedId, UserId, ProductIdeaId, CreatedAt
     FROM SavedIdeas WHERE UserId = @userId AND ProductIdeaId = @productIdeaId`,
    { userId, productIdeaId }
  );
  if (existing) {
    return {
      record: {
        SavedId: existing.SavedId,
        UserId: existing.UserId,
        ProductIdeaId: existing.ProductIdeaId,
        CreatedAt: iso(existing.CreatedAt),
      },
      created: false,
    };
  }
  const savedId = `svi_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await execute(
    `INSERT INTO SavedIdeas (SavedId, UserId, ProductIdeaId, CreatedAt)
     VALUES (@savedId, @userId, @productIdeaId, GETUTCDATE())`,
    { savedId, userId, productIdeaId }
  );
  return {
    record: {
      SavedId: savedId,
      UserId: userId,
      ProductIdeaId: productIdeaId,
      CreatedAt: new Date().toISOString(),
    },
    created: true,
  };
}

export async function unsaveIdeaDb(
  userId: string,
  productIdeaId: string
): Promise<boolean> {
  await ensureUserTables();
  const n = await execute(
    `DELETE FROM SavedIdeas WHERE UserId = @userId AND ProductIdeaId = @productIdeaId`,
    { userId, productIdeaId }
  );
  return n > 0;
}

export async function listSavedIdeasDb(
  userId: string
): Promise<SavedIdeaRecord[]> {
  await ensureUserTables();
  const rows = await query<{
    SavedId: string;
    UserId: string;
    ProductIdeaId: string;
    CreatedAt: Date | string;
  }>(
    `SELECT SavedId, UserId, ProductIdeaId, CreatedAt
     FROM SavedIdeas WHERE UserId = @userId ORDER BY CreatedAt DESC`,
    { userId }
  );
  return rows.map((r) => ({
    SavedId: r.SavedId,
    UserId: r.UserId,
    ProductIdeaId: r.ProductIdeaId,
    CreatedAt: iso(r.CreatedAt),
  }));
}
