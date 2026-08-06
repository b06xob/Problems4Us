/**
 * Disposable / throwaway email domain policy (problems4us-22b).
 *
 * DECISION (2026-08-05, Problems4Us Agent): BLOCK known disposable domains
 * at registration and resend. Paid entitlements and password reset already
 * assume a durable address; throwaway inboxes defeat ownership proof.
 *
 * Not a complete blocklist — covers common public disposable providers.
 * Unknown / corporate domains are allowed. Review list periodically.
 */

const DISPOSABLE_DOMAINS = new Set(
  [
    "mailinator.com",
    "guerrillamail.com",
    "guerrillamail.net",
    "sharklasers.com",
    "grr.la",
    "guerrillamailblock.com",
    "pokemail.net",
    "spam4.me",
    "tempmail.com",
    "temp-mail.org",
    "temp-mail.io",
    "throwaway.email",
    "yopmail.com",
    "yopmail.fr",
    "trashmail.com",
    "trashmail.me",
    "10minutemail.com",
    "10minutemail.net",
    "minuteinbox.com",
    "getnada.com",
    "maildrop.cc",
    "discard.email",
    "dispostable.com",
    "mailnesia.com",
    "fakeinbox.com",
    "tempail.com",
    "emailondeck.com",
    "mohmal.com",
    "guerrillamail.org",
  ].map((d) => d.toLowerCase())
);

export const DISPOSABLE_EMAIL_POLICY = {
  mode: "block" as const,
  decidedUtc: "2026-08-06T02:30:00Z",
  rationale:
    "Block known disposable domains so verification and password-reset links land in durable inboxes; entitlements key off email.",
  domainCount: DISPOSABLE_DOMAINS.size,
};

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

export function isDisposableEmailDomain(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  // Subdomain of a known disposable root (e.g. foo.mailinator.com)
  for (const blocked of DISPOSABLE_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}
