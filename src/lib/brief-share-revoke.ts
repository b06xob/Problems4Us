/**
 * M3.1c — revoke list for signed brief share tokens (token-hash denylist).
 * Tokens remain HMAC-verifiable; revoked hashes fail at load time.
 */

import { createHash } from "crypto";
import { execute, queryOne } from "./db";

let revokeTableReady: Promise<void> | null = null;

export function hashBriefShareToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export async function ensureBriefShareRevokeTable(): Promise<void> {
  if (!revokeTableReady) {
    revokeTableReady = (async () => {
      await execute(`
        IF OBJECT_ID(N'dbo.BriefShareRevocations', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.BriefShareRevocations (
            TokenHash   CHAR(64)      NOT NULL PRIMARY KEY,
            ProblemId   NVARCHAR(120) NULL,
            Reason      NVARCHAR(200) NULL,
            RevokedAt   DATETIME2     NOT NULL CONSTRAINT DF_BriefShareRevocations_RevokedAt DEFAULT (GETUTCDATE()),
            RevokedBy   NVARCHAR(120) NULL
          );
          CREATE INDEX IX_BriefShareRevocations_RevokedAt
            ON dbo.BriefShareRevocations(RevokedAt DESC);
        END
      `);
    })().catch((err) => {
      revokeTableReady = null;
      throw err;
    });
  }
  await revokeTableReady;
}

export async function isBriefShareTokenRevokedDb(
  token: string
): Promise<boolean> {
  const tokenHash = hashBriefShareToken(token);
  await ensureBriefShareRevokeTable();
  const row = await queryOne<{ TokenHash: string }>(
    `SELECT TOP 1 TokenHash FROM BriefShareRevocations WHERE TokenHash = @tokenHash`,
    { tokenHash }
  );
  return Boolean(row);
}

export async function revokeBriefShareTokenDb(input: {
  token: string;
  problemId?: string | null;
  reason?: string | null;
  revokedBy?: string | null;
}): Promise<{ revoked: true; tokenHash: string; alreadyRevoked: boolean }> {
  const token = input.token?.trim();
  if (!token) {
    throw new Error("token required");
  }
  const tokenHash = hashBriefShareToken(token);
  await ensureBriefShareRevokeTable();
  const existing = await queryOne<{ TokenHash: string }>(
    `SELECT TOP 1 TokenHash FROM BriefShareRevocations WHERE TokenHash = @tokenHash`,
    { tokenHash }
  );
  if (existing) {
    return { revoked: true, tokenHash, alreadyRevoked: true };
  }
  await execute(
    `INSERT INTO BriefShareRevocations (TokenHash, ProblemId, Reason, RevokedAt, RevokedBy)
     VALUES (@tokenHash, @problemId, @reason, GETUTCDATE(), @revokedBy)`,
    {
      tokenHash,
      problemId: input.problemId?.trim().slice(0, 120) || null,
      reason: input.reason?.trim().slice(0, 200) || null,
      revokedBy: input.revokedBy?.trim().slice(0, 120) || null,
    }
  );
  return { revoked: true, tokenHash, alreadyRevoked: false };
}

/** Redact emails and obvious secret-like keys from shared brief text. */
export function stripShareBriefPii(text: string): string {
  if (!text) return text;
  let out = text.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[redacted-email]"
  );
  out = out.replace(
    /\b(password|token|secret|api[_-]?key)\s*[:=]\s*\S+/gi,
    "$1=[redacted]"
  );
  return out;
}
