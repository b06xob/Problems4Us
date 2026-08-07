/**
 * Outbound mail recipient safety (cos-notification-noise-20260807).
 *
 * Never send from the production sender to fabricated / RFC-reserved
 * addresses. Those probes create hard bounces that land in the Founder's
 * inbox and damage shared sender reputation.
 *
 * Override ONLY for local unit tests that mock SMTP:
 *   MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS=1
 */

import { normalizeEmail } from "./waitlist";

/** RFC 2606 / 6761 reserved + common non-routable test TLDs. */
const RESERVED_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "invalid",
  "localhost",
  "test",
]);

const RESERVED_TLDS = new Set(["example", "invalid", "localhost", "test"]);

/** Local-part prefixes used by prior agent probes against production. */
const PROBE_LOCAL_PREFIXES = [
  "p4u.verify.probe",
  "p4u-verify-probe",
  "p4u.verify+",
];

export const MAIL_RECIPIENT_POLICY = {
  blockReservedDomains: true,
  blockProbeLocalParts: true,
  overrideEnv: "MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS",
  reasonCode: "nondeliverable_recipient_blocked",
} as const;

export function mailAllowNondeliverableRecipients(): boolean {
  const v = process.env.MAIL_ALLOW_NONDELIVERABLE_RECIPIENTS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function isNondeliverableRecipient(emailRaw: string): boolean {
  const email = normalizeEmail(emailRaw);
  if (!email.includes("@")) return true;
  const [local, domain] = email.split("@");
  if (!local || !domain) return true;

  if (RESERVED_DOMAINS.has(domain)) return true;
  const labels = domain.split(".");
  const tld = labels[labels.length - 1] || "";
  if (RESERVED_TLDS.has(tld)) return true;

  for (const prefix of PROBE_LOCAL_PREFIXES) {
    if (local === prefix || local.startsWith(`${prefix}+`) || local.startsWith(`${prefix}-`)) {
      return true;
    }
  }

  return false;
}

/**
 * Guard before any production SMTP/SendGrid send.
 * Returns null when send is allowed.
 */
export function assertDeliverableRecipient(
  emailRaw: string
): { ok: true } | { ok: false; reason: string; hardFailure: true } {
  if (mailAllowNondeliverableRecipients()) {
    return { ok: true };
  }
  if (isNondeliverableRecipient(emailRaw)) {
    return {
      ok: false,
      reason: `${MAIL_RECIPIENT_POLICY.reasonCode}:${normalizeEmail(emailRaw).slice(0, 80)}`,
      hardFailure: true,
    };
  }
  return { ok: true };
}
