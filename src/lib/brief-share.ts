/**
 * M3.1 — signed share links for Builder opportunity briefs.
 * Tokens are HMAC-signed (no DB); mint only after Builder gate succeeds.
 */

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_PROBLEM_ID_LEN = 120;

export type BriefSharePayload = {
  problemId: string;
  exp: number; // unix seconds
};

export type BriefShareVerifyResult =
  | { ok: true; problemId: string; exp: number }
  | { ok: false; reason: string };

/** Prefer dedicated secret; fall back to ADMIN_API_KEY so prod works without a new App Setting. */
export function getBriefShareSecret(): string | null {
  const dedicated = process.env.BRIEF_SHARE_SECRET?.trim();
  if (dedicated) return dedicated;
  const admin = process.env.ADMIN_API_KEY?.trim();
  return admin || null;
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Buffer | null {
  try {
    const padded =
      value.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (value.length % 4)) % 4);
    return Buffer.from(padded, "base64");
  } catch {
    return null;
  }
}

function signPayload(payloadB64: string, secret: string): string {
  return base64UrlEncode(
    createHmac("sha256", secret).update(`v1.${payloadB64}`).digest()
  );
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Create a URL-safe share token for a problem brief.
 * Format: v1.<payloadB64>.<sigB64> where payload is JSON {p, exp}.
 */
export function createBriefShareToken(input: {
  problemId: string;
  secret: string;
  ttlSeconds?: number;
  nowMs?: number;
}): string | null {
  const problemId = input.problemId?.trim().slice(0, MAX_PROBLEM_ID_LEN);
  if (!problemId || !input.secret) return null;

  const ttl =
    typeof input.ttlSeconds === "number" && Number.isFinite(input.ttlSeconds)
      ? Math.max(60, Math.floor(input.ttlSeconds))
      : DEFAULT_TTL_SECONDS;
  const nowMs = input.nowMs ?? Date.now();
  const exp = Math.floor(nowMs / 1000) + ttl;
  const payloadB64 = base64UrlEncode(
    JSON.stringify({ p: problemId, exp })
  );
  const sig = signPayload(payloadB64, input.secret);
  return `v1.${payloadB64}.${sig}`;
}

export function verifyBriefShareToken(
  token: string | null | undefined,
  secret: string,
  nowMs?: number
): BriefShareVerifyResult {
  if (!token?.trim()) return { ok: false, reason: "token required" };
  if (!secret) return { ok: false, reason: "share secret not configured" };

  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return { ok: false, reason: "invalid token format" };
  }
  const [, payloadB64, sig] = parts;
  const expected = signPayload(payloadB64, secret);
  if (!safeEqual(sig, expected)) {
    return { ok: false, reason: "invalid signature" };
  }

  const raw = base64UrlDecode(payloadB64);
  if (!raw) return { ok: false, reason: "invalid payload encoding" };

  let parsed: { p?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(raw.toString("utf8")) as { p?: unknown; exp?: unknown };
  } catch {
    return { ok: false, reason: "invalid payload json" };
  }

  const problemId =
    typeof parsed.p === "string" ? parsed.p.trim().slice(0, MAX_PROBLEM_ID_LEN) : "";
  const exp = typeof parsed.exp === "number" ? parsed.exp : Number(parsed.exp);
  if (!problemId || !Number.isFinite(exp)) {
    return { ok: false, reason: "invalid payload fields" };
  }

  const now = Math.floor((nowMs ?? Date.now()) / 1000);
  if (exp < now) return { ok: false, reason: "token expired" };

  return { ok: true, problemId, exp };
}

export function buildBriefSharePath(token: string): string {
  return `/api/share/briefs?token=${encodeURIComponent(token)}`;
}

export function buildBriefShareUrl(
  token: string,
  appUrl?: string | null
): string {
  const base = (appUrl || process.env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const path = buildBriefSharePath(token);
  return base ? `${base}${path}` : path;
}

/** Audit props when a Builder mints a share link (alongside brief export). */
export function buildBriefShareAudit(input: {
  email: string;
  problemId: string;
  expiresAt: number;
}): { email: string; problemId: string; expiresAt: number } | null {
  const email = input.email?.trim().toLowerCase();
  const problemId = input.problemId?.trim().slice(0, MAX_PROBLEM_ID_LEN);
  if (!email || !problemId || !Number.isFinite(input.expiresAt)) return null;
  return { email, problemId, expiresAt: Math.floor(input.expiresAt) };
}
