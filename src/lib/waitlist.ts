const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistSource =
  | "landing"
  | "pricing"
  | "pricing-explorer"
  | "pricing-builder"
  | "other";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 200 && EMAIL_RE.test(normalized);
}

export function parseWaitlistSource(value: unknown): WaitlistSource {
  const allowed: WaitlistSource[] = [
    "landing",
    "pricing",
    "pricing-explorer",
    "pricing-builder",
    "other",
  ];
  if (typeof value === "string" && allowed.includes(value as WaitlistSource)) {
    return value as WaitlistSource;
  }
  return "other";
}
