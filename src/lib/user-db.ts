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
import {
  hashPasswordResetToken,
  mintPasswordResetToken,
  PASSWORD_RESET_TTL_MINUTES,
} from "./password-reset";
import {
  EMAIL_VERIFY_TTL_MINUTES,
  hashEmailVerifyToken,
  mintEmailVerifyToken,
} from "./email-verification";
import { computeActivation, type ActivationStatus } from "./user-accounts";
import { isValidEmail, normalizeEmail } from "./waitlist";

export type UserAccountRecord = {
  UserId: string;
  Email: string;
  CreatedAt: string;
  EmailVerifiedAt: string | null;
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
      await execute(`
        IF OBJECT_ID(N'dbo.PasswordResetTokens', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.PasswordResetTokens (
            ResetId       NVARCHAR(50)  NOT NULL PRIMARY KEY,
            UserId        NVARCHAR(50)  NOT NULL,
            TokenHash     NVARCHAR(64)  NOT NULL,
            ExpiresAt     DATETIME2     NOT NULL,
            UsedAt        DATETIME2     NULL,
            CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_PasswordResetTokens_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_PasswordResetTokens_TokenHash
            ON dbo.PasswordResetTokens(TokenHash);
          CREATE INDEX IX_PasswordResetTokens_UserId ON dbo.PasswordResetTokens(UserId);
          CREATE INDEX IX_PasswordResetTokens_ExpiresAt ON dbo.PasswordResetTokens(ExpiresAt);
        END
      `);
      // problems4us-22b: EmailVerifiedAt + verification tokens + mail failure log
      // ALTER and UPDATE must be separate batches (SQL Server metadata visibility).
      await execute(`
        IF COL_LENGTH(N'dbo.UserAccounts', N'EmailVerifiedAt') IS NULL
        BEGIN
          ALTER TABLE dbo.UserAccounts ADD EmailVerifiedAt DATETIME2 NULL;
        END
      `);
      await execute(`
        IF COL_LENGTH(N'dbo.UserAccounts', N'EmailVerifiedAt') IS NOT NULL
        BEGIN
          -- Grandfather only pre-22b rows (CreatedAt before this feature shipped).
          UPDATE dbo.UserAccounts
          SET EmailVerifiedAt = CreatedAt
          WHERE EmailVerifiedAt IS NULL
            AND CreatedAt < '2026-08-06T02:30:00';
        END
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.EmailVerificationTokens', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.EmailVerificationTokens (
            VerifyId      NVARCHAR(50)  NOT NULL PRIMARY KEY,
            UserId        NVARCHAR(50)  NOT NULL,
            TokenHash     NVARCHAR(64)  NOT NULL,
            ExpiresAt     DATETIME2     NOT NULL,
            UsedAt        DATETIME2     NULL,
            CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_EmailVerificationTokens_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE UNIQUE INDEX UX_EmailVerificationTokens_TokenHash
            ON dbo.EmailVerificationTokens(TokenHash);
          CREATE INDEX IX_EmailVerificationTokens_UserId ON dbo.EmailVerificationTokens(UserId);
          CREATE INDEX IX_EmailVerificationTokens_ExpiresAt ON dbo.EmailVerificationTokens(ExpiresAt);
        END
      `);
      await execute(`
        IF OBJECT_ID(N'dbo.MailDeliveryFailures', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.MailDeliveryFailures (
            FailureId     NVARCHAR(50)  NOT NULL PRIMARY KEY,
            Email         NVARCHAR(200) NOT NULL,
            Purpose       NVARCHAR(40)  NOT NULL,
            Reason        NVARCHAR(400) NOT NULL,
            HardFailure   BIT           NOT NULL CONSTRAINT DF_MailDeliveryFailures_Hard DEFAULT (0),
            CreatedAt     DATETIME2     NOT NULL CONSTRAINT DF_MailDeliveryFailures_CreatedAt DEFAULT (GETUTCDATE())
          );
          CREATE INDEX IX_MailDeliveryFailures_Email ON dbo.MailDeliveryFailures(Email);
          CREATE INDEX IX_MailDeliveryFailures_CreatedAt ON dbo.MailDeliveryFailures(CreatedAt);
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

export async function findUserByEmailDb(
  emailRaw: string
): Promise<{
  userId: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
} | null> {
  await ensureUserTables();
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return null;
  const row = await queryOne<{
    UserId: string;
    Email: string;
    EmailVerifiedAt: Date | string | null;
    CreatedAt: Date | string;
  }>(
    `SELECT TOP 1 UserId, Email, EmailVerifiedAt, CreatedAt
     FROM UserAccounts WHERE Email = @email`,
    { email }
  );
  if (!row) return null;
  return {
    userId: row.UserId,
    email: row.Email,
    emailVerified: Boolean(row.EmailVerifiedAt),
    createdAt: iso(row.CreatedAt),
  };
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
    EmailVerifiedAt: Date | string | null;
  }>(
    `SELECT TOP 1 UserId, Email, CreatedAt, EmailVerifiedAt FROM UserAccounts WHERE Email = @email`,
    { email }
  );
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }

  const userId = `usr_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const { salt, hash } = hashPassword(password);
  // New registrations start UNVERIFIED (EmailVerifiedAt NULL).
  await execute(
    `INSERT INTO UserAccounts (UserId, Email, PasswordSalt, PasswordHash, CreatedAt, UpdatedAt, EmailVerifiedAt)
     VALUES (@userId, @email, @salt, @hash, GETUTCDATE(), GETUTCDATE(), NULL)`,
    { userId, email, salt, hash }
  );

  const sessionToken = await createSessionForUser(userId, { rotate: false });
  return {
    user: {
      UserId: userId,
      Email: email,
      CreatedAt: new Date().toISOString(),
      EmailVerifiedAt: null,
    },
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
    EmailVerifiedAt: Date | string | null;
  }>(
    `SELECT TOP 1 UserId, Email, PasswordSalt, PasswordHash, CreatedAt, EmailVerifiedAt
     FROM UserAccounts WHERE Email = @email`,
    { email }
  );
  if (!row) return null;
  if (!verifyPassword(password, row.PasswordSalt, row.PasswordHash)) return null;

  // Login rotates: drop prior sessions for this user, then mint a fresh token.
  const sessionToken = await createSessionForUser(row.UserId, { rotate: true });
  return {
    user: {
      UserId: row.UserId,
      Email: row.Email,
      CreatedAt: iso(row.CreatedAt),
      EmailVerifiedAt: row.EmailVerifiedAt ? iso(row.EmailVerifiedAt) : null,
    },
    sessionToken,
  };
}

async function createSessionForUser(
  userId: string,
  opts: { rotate: boolean }
): Promise<string> {
  if (opts.rotate) {
    await execute(`DELETE FROM UserSessions WHERE UserId = @userId`, { userId });
  }
  // Housekeeping: expire stale rows for all users when minting.
  await execute(`DELETE FROM UserSessions WHERE ExpiresAt <= GETUTCDATE()`);
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
  const row = await queryOne<{
    UserId: string;
    Email: string;
    EmailVerifiedAt: Date | string | null;
  }>(
    `SELECT TOP 1 u.UserId, u.Email, u.EmailVerifiedAt
     FROM UserSessions s
     INNER JOIN UserAccounts u ON u.UserId = s.UserId
     WHERE s.TokenHash = @tokenHash AND s.ExpiresAt > GETUTCDATE()`,
    { tokenHash }
  );
  if (!row) return null;
  return {
    userId: row.UserId,
    email: row.Email,
    emailVerified: Boolean(row.EmailVerifiedAt),
  };
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

/**
 * Create a one-time password reset token for an email (if account exists AND verified).
 * Returns null when email is unknown or unverified (caller should still return a generic 200).
 * problems4us-22b: reset must not assume ownership of an unverified address.
 */
export async function createPasswordResetTokenDb(
  emailRaw: string
): Promise<{ userId: string; email: string; rawToken: string } | null> {
  await ensureUserTables();
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return null;

  const user = await queryOne<{
    UserId: string;
    Email: string;
    EmailVerifiedAt: Date | string | null;
  }>(
    `SELECT TOP 1 UserId, Email, EmailVerifiedAt FROM UserAccounts WHERE Email = @email`,
    { email }
  );
  if (!user || !user.EmailVerifiedAt) return null;

  // Invalidate prior unused tokens for this user.
  await execute(
    `UPDATE PasswordResetTokens SET UsedAt = GETUTCDATE()
     WHERE UserId = @userId AND UsedAt IS NULL`,
    { userId: user.UserId }
  );
  await execute(
    `DELETE FROM PasswordResetTokens WHERE ExpiresAt <= GETUTCDATE() OR UsedAt IS NOT NULL`
  );

  const rawToken = mintPasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const resetId = `pwr_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await execute(
    `INSERT INTO PasswordResetTokens (ResetId, UserId, TokenHash, ExpiresAt, UsedAt, CreatedAt)
     VALUES (@resetId, @userId, @tokenHash, DATEADD(minute, @ttl, GETUTCDATE()), NULL, GETUTCDATE())`,
    {
      resetId,
      userId: user.UserId,
      tokenHash,
      ttl: PASSWORD_RESET_TTL_MINUTES,
    }
  );

  return { userId: user.UserId, email: user.Email, rawToken };
}

/**
 * Consume a valid unused reset token and set a new password.
 * Rotates sessions after success.
 */
export async function consumePasswordResetTokenDb(
  rawToken: string,
  newPassword: string
): Promise<{ ok: true; userId: string; email: string } | { ok: false; reason: string }> {
  await ensureUserTables();
  const tokenHash = hashPasswordResetToken(rawToken);
  const row = await queryOne<{
    ResetId: string;
    UserId: string;
    Email: string;
  }>(
    `SELECT TOP 1 t.ResetId, t.UserId, u.Email
     FROM PasswordResetTokens t
     INNER JOIN UserAccounts u ON u.UserId = t.UserId
     WHERE t.TokenHash = @tokenHash
       AND t.UsedAt IS NULL
       AND t.ExpiresAt > GETUTCDATE()`,
    { tokenHash }
  );
  if (!row) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  const { salt, hash } = hashPassword(newPassword);
  await execute(
    `UPDATE UserAccounts
     SET PasswordSalt = @salt, PasswordHash = @hash, UpdatedAt = GETUTCDATE()
     WHERE UserId = @userId`,
    { salt, hash, userId: row.UserId }
  );
  await execute(
    `UPDATE PasswordResetTokens SET UsedAt = GETUTCDATE() WHERE ResetId = @resetId`,
    { resetId: row.ResetId }
  );
  // Invalidate outstanding email-verify tokens on password change (22b).
  await execute(
    `UPDATE EmailVerificationTokens SET UsedAt = GETUTCDATE()
     WHERE UserId = @userId AND UsedAt IS NULL`,
    { userId: row.UserId }
  );
  // Force re-login: drop all sessions for this user.
  await execute(`DELETE FROM UserSessions WHERE UserId = @userId`, {
    userId: row.UserId,
  });

  return { ok: true, userId: row.UserId, email: row.Email };
}

/**
 * Issue a one-time email verification token for a user (or by email).
 * Invalidates prior unused verify tokens for that user.
 */
export async function createEmailVerificationTokenDb(
  emailRaw: string
): Promise<{ userId: string; email: string; rawToken: string } | null> {
  await ensureUserTables();
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return null;

  const user = await queryOne<{
    UserId: string;
    Email: string;
    EmailVerifiedAt: Date | string | null;
  }>(
    `SELECT TOP 1 UserId, Email, EmailVerifiedAt FROM UserAccounts WHERE Email = @email`,
    { email }
  );
  if (!user) return null;
  if (user.EmailVerifiedAt) return null; // already verified — caller returns generic

  await execute(
    `UPDATE EmailVerificationTokens SET UsedAt = GETUTCDATE()
     WHERE UserId = @userId AND UsedAt IS NULL`,
    { userId: user.UserId }
  );
  await execute(
    `DELETE FROM EmailVerificationTokens WHERE ExpiresAt <= GETUTCDATE() OR UsedAt IS NOT NULL`
  );

  const rawToken = mintEmailVerifyToken();
  const tokenHash = hashEmailVerifyToken(rawToken);
  const verifyId = `ev_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await execute(
    `INSERT INTO EmailVerificationTokens (VerifyId, UserId, TokenHash, ExpiresAt, UsedAt, CreatedAt)
     VALUES (@verifyId, @userId, @tokenHash, DATEADD(minute, @ttl, GETUTCDATE()), NULL, GETUTCDATE())`,
    {
      verifyId,
      userId: user.UserId,
      tokenHash,
      ttl: EMAIL_VERIFY_TTL_MINUTES,
    }
  );

  return { userId: user.UserId, email: user.Email, rawToken };
}

/**
 * Consume a valid unused verification token; set EmailVerifiedAt.
 */
export async function consumeEmailVerificationTokenDb(
  rawToken: string
): Promise<{ ok: true; userId: string; email: string } | { ok: false; reason: string }> {
  await ensureUserTables();
  const tokenHash = hashEmailVerifyToken(rawToken);
  const row = await queryOne<{
    VerifyId: string;
    UserId: string;
    Email: string;
  }>(
    `SELECT TOP 1 t.VerifyId, t.UserId, u.Email
     FROM EmailVerificationTokens t
     INNER JOIN UserAccounts u ON u.UserId = t.UserId
     WHERE t.TokenHash = @tokenHash
       AND t.UsedAt IS NULL
       AND t.ExpiresAt > GETUTCDATE()`,
    { tokenHash }
  );
  if (!row) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  await execute(
    `UPDATE UserAccounts
     SET EmailVerifiedAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
     WHERE UserId = @userId`,
    { userId: row.UserId }
  );
  await execute(
    `UPDATE EmailVerificationTokens SET UsedAt = GETUTCDATE() WHERE VerifyId = @verifyId`,
    { verifyId: row.VerifyId }
  );
  // Single-use: burn any other outstanding tokens for this user.
  await execute(
    `UPDATE EmailVerificationTokens SET UsedAt = GETUTCDATE()
     WHERE UserId = @userId AND UsedAt IS NULL`,
    { userId: row.UserId }
  );

  return { ok: true, userId: row.UserId, email: row.Email };
}

export async function recordMailDeliveryFailureDb(input: {
  email: string;
  purpose: string;
  reason: string;
  hardFailure: boolean;
}): Promise<void> {
  await ensureUserTables();
  const failureId = `mdf_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await execute(
    `INSERT INTO MailDeliveryFailures (FailureId, Email, Purpose, Reason, HardFailure, CreatedAt)
     VALUES (@failureId, @email, @purpose, @reason, @hard, GETUTCDATE())`,
    {
      failureId,
      email: normalizeEmail(input.email).slice(0, 200),
      purpose: input.purpose.slice(0, 40),
      reason: input.reason.slice(0, 400),
      hard: input.hardFailure ? 1 : 0,
    }
  );
}

/** True when a hard failure was recorded for this email+purpose in the last N days. */
export async function hasRecentHardMailFailureDb(
  emailRaw: string,
  purpose: string,
  withinDays = 30
): Promise<boolean> {
  await ensureUserTables();
  const email = normalizeEmail(emailRaw);
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM MailDeliveryFailures
     WHERE Email = @email AND Purpose = @purpose AND HardFailure = 1
       AND CreatedAt > DATEADD(day, -@days, GETUTCDATE())`,
    { email, purpose, days: withinDays }
  );
  return (row?.cnt ?? 0) > 0;
}

/** True when any hard failure exists for this email (any purpose) in the last N days. */
export async function hasRecentHardMailFailureForEmailDb(
  emailRaw: string,
  withinDays = 30
): Promise<boolean> {
  await ensureUserTables();
  const email = normalizeEmail(emailRaw);
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM MailDeliveryFailures
     WHERE Email = @email AND HardFailure = 1
       AND CreatedAt > DATEADD(day, -@days, GETUTCDATE())`,
    { email, days: withinDays }
  );
  return (row?.cnt ?? 0) > 0;
}

export async function listMailDeliveryFailuresDb(limit = 50): Promise<
  Array<{
    failureId: string;
    email: string;
    purpose: string;
    reason: string;
    hardFailure: boolean;
    createdAt: string;
  }>
> {
  await ensureUserTables();
  const rows = await query<{
    FailureId: string;
    Email: string;
    Purpose: string;
    Reason: string;
    HardFailure: boolean | number;
    CreatedAt: Date | string;
  }>(
    `SELECT TOP (@limit) FailureId, Email, Purpose, Reason, HardFailure, CreatedAt
     FROM MailDeliveryFailures
     ORDER BY CreatedAt DESC`,
    { limit }
  );
  return rows.map((r) => ({
    failureId: r.FailureId,
    email: r.Email,
    purpose: r.Purpose,
    reason: r.Reason,
    hardFailure: Boolean(r.HardFailure),
    createdAt: iso(r.CreatedAt),
  }));
}
