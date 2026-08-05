/**
 * Builder brief export identity (security review 2026-08-05).
 * Entitlement alone is not enough — caller must prove identity via
 * session cookie OR ADMIN_API_KEY (ops/pilot harness).
 */

import { isAdminRequest } from "./admin-auth";
import {
  isEntitlementEmail,
  normalizeEntitlementEmail,
} from "./entitlements";
import type { SessionUser } from "./user-auth";

export type BuilderBriefCaller =
  | { ok: true; email: string; via: "session" | "admin" }
  | { ok: false; status: 401 | 403 | 400; error: string };

/**
 * Resolve which email may be used for Builder brief export.
 * - Admin API key: may target any email (ops harness / pilot smoke).
 * - Signed-in user: email is taken from the session (claimable query/header ignored unless it matches).
 * - Anonymous: rejected.
 */
export function resolveBuilderBriefCaller(input: {
  request: Request;
  sessionUser: SessionUser | null;
  claimedEmail: string;
}): BuilderBriefCaller {
  const claimed = (input.claimedEmail || "").trim();

  if (isAdminRequest(input.request)) {
    if (!claimed || !isEntitlementEmail(claimed)) {
      return {
        ok: false,
        status: 400,
        error: "Valid email required for Builder access",
      };
    }
    return {
      ok: true,
      email: normalizeEntitlementEmail(claimed),
      via: "admin",
    };
  }

  if (!input.sessionUser) {
    return {
      ok: false,
      status: 401,
      error: "Sign in required for Builder brief export",
    };
  }

  const sessionEmail = normalizeEntitlementEmail(input.sessionUser.email);
  if (!isEntitlementEmail(sessionEmail)) {
    return {
      ok: false,
      status: 401,
      error: "Sign in required for Builder brief export",
    };
  }

  if (claimed && normalizeEntitlementEmail(claimed) !== sessionEmail) {
    return {
      ok: false,
      status: 403,
      error: "Builder brief email must match the signed-in account",
    };
  }

  return { ok: true, email: sessionEmail, via: "session" };
}
