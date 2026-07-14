import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_API_KEY_HEADER = "x-admin-api-key";

/**
 * Owner/admin endpoints require ADMIN_API_KEY.
 * Fail closed when the key is unset so production cannot ship open by default.
 */
export function getAdminApiKey(): string | null {
  const key = process.env.ADMIN_API_KEY?.trim();
  return key || null;
}

function keysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function extractAdminApiKey(request: NextRequest | Request): string | null {
  const headerKey = request.headers.get(ADMIN_API_KEY_HEADER)?.trim();
  if (headerKey) return headerKey;

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    return token || null;
  }

  return null;
}

export function requireAdminAuth(
  request: NextRequest | Request
): NextResponse | null {
  const expected = getAdminApiKey();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Admin API key is not configured. Set ADMIN_API_KEY before using owner endpoints.",
      },
      { status: 503 }
    );
  }

  const provided = extractAdminApiKey(request);
  if (!provided || !keysMatch(provided, expected)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

export function isAdminRequest(request: NextRequest | Request): boolean {
  const expected = getAdminApiKey();
  if (!expected) return false;
  const provided = extractAdminApiKey(request);
  return Boolean(provided && keysMatch(provided, expected));
}
