import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "p4u_session";
export const SESSION_TTL_DAYS = 30;
const SCRYPT_KEYLEN = 64;

export type SessionUser = {
  userId: string;
  email: string;
};

function getSessionPepper(): string {
  const pepper =
    process.env.SESSION_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    "";
  return pepper;
}

export function hashPassword(password: string, saltHex?: string): {
  salt: string;
  hash: string;
} {
  const salt = saltHex ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { salt, hash };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mintSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Store only a salted hash of the session token. */
export function hashSessionToken(token: string): string {
  const pepper = getSessionPepper();
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}

export function extractSessionToken(
  request: NextRequest | Request
): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)
  );
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch {
      return match[1].trim();
    }
  }

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    return token || null;
  }

  const headerToken = request.headers.get("x-session-token")?.trim();
  return headerToken || null;
}

export function sessionCookieOptions(maxAgeSeconds: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function attachSessionCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(SESSION_TTL_DAYS * 24 * 60 * 60)
  );
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}

/** Session policy summary for ops/security docs and unit tests. */
export const SESSION_POLICY = {
  cookieName: SESSION_COOKIE,
  ttlDays: SESSION_TTL_DAYS,
  httpOnly: true,
  sameSite: "lax" as const,
  /** Login mints a new token and deletes prior UserSessions for that user. */
  rotateOnLogin: true,
  /** Logout deletes TokenHash row and clears cookie maxAge=0. */
  revokeOnLogout: true,
  /**
   * Password reset: token APIs + pages shipped (problems4us-22a).
   * Self-serve email delivery still requires SENDGRID_API_KEY + FROM address.
   * Ops can issue a one-time token via POST /api/admin/password-reset/issue.
   */
  passwordResetStatus: "tokens_shipped_email_pending" as const,
};

export function unauthorizedJson(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && password.length <= 200;
}
