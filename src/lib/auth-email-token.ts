/**
 * Shared opaque email-token primitives for password reset and email verification.
 * One mint/hash mechanism; purpose prefixes keep hashes non-interchangeable.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export type AuthEmailTokenPurpose =
  | "pwdreset"
  | "emailverify"
  /** Submission acknowledgement / publish-gate verification (same mint/hash). */
  | "submissionverify";

function getAuthEmailPepper(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    "problems4us-auth-email-dev-pepper"
  );
}

/** Cryptographically random opaque token (base64url). */
export function mintAuthEmailToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAuthEmailToken(
  purpose: AuthEmailTokenPurpose,
  token: string
): string {
  return createHash("sha256")
    .update(`${getAuthEmailPepper()}:${purpose}:${token}`)
    .digest("hex");
}

export function authEmailTokensEqual(
  purpose: AuthEmailTokenPurpose,
  rawToken: string,
  expectedHash: string
): boolean {
  try {
    const a = Buffer.from(hashAuthEmailToken(purpose, rawToken), "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
