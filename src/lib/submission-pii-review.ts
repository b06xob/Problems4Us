/**
 * PII review with submitter choice (founder 2026-08-07).
 *
 * Reuses problems4us-32 direct-identifier detection (ingest-moderation).
 * Distinguishes three buckets — never guts substantive problem context.
 */

import {
  containsHeavyPii,
  classifyModeration,
} from "./ingest-moderation";

export type PiiBucket =
  | "direct_identifier"
  | "substantive_context"
  | "voluntary_sensitive";

export type PiiFinding = {
  bucket: PiiBucket;
  excerpt: string;
  note: string;
};

export type PiiReviewResult = {
  /** True when we must hold publish and offer a choice (or flag voluntary detail). */
  needsChoice: boolean;
  hasDirectIdentifiers: boolean;
  hasVoluntarySensitive: boolean;
  findings: PiiFinding[];
  proposedTitle: string;
  proposedDescription: string;
  rewriteChanged: boolean;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE =
  /(?<!\d)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\d)/g;
const SSN_RE = /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g;
const SECRET_ASSIGN_RE =
  /\b(password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*\S+/gi;
const LONG_TOKEN_RE =
  /\b(?:sk|pk|ghp|gho|xox[baprs])-[A-Za-z0-9_-]{16,}\b/gi;
const PROFILE_URL_RE =
  /https?:\/\/(?:www\.)?(?:linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com)\/[^\s)]+/gi;

/** Voluntary sensitive themes — flag for informed choice; do not auto-strip. */
const VOLUNTARY_SENSITIVE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(faith|church|religion|spiritual|gospel|prayer)\b/i, label: "faith / spiritual life" },
  {
    re: /\b(personal transformation|reinvent(?:ing)? myself|my (?:divorce|illness|diagnosis|depression|anxiety|addiction|bankruptcy|eviction))\b/i,
    label: "personal / hardship detail",
  },
  {
    re: /\b(cancer|chemotherapy|disability|mental health|therapy)\b/i,
    label: "health detail",
  },
];

/** Phrases that are problem context, not identifiers — keep and note. */
const SUBSTANTIVE_CONTEXT_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: /\b(\d+\+?\s*years?\s+of\s+(?:corporate|technology|industry|leadership)\s+experience)\b/i,
    label: "professional tenure / background",
  },
  {
    re: /\b(audience is|primary audience|target audience|women over \d+|men over \d+)\b/i,
    label: "audience definition (makes the problem solvable)",
  },
  {
    re: /\b(comedian|keynote speaker|emcee|storyteller|content creator|consultant)\b/i,
    label: "professional role / venture context",
  },
];

function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + length + 24);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function stripDirectIdentifiers(text: string): {
  text: string;
  removals: PiiFinding[];
} {
  const removals: PiiFinding[] = [];
  let out = text;

  const replaceAll = (re: RegExp, label: string) => {
    out = out.replace(re, (match, ...args) => {
      const offset = typeof args[args.length - 2] === "number"
        ? (args[args.length - 2] as number)
        : out.indexOf(match);
      removals.push({
        bucket: "direct_identifier",
        excerpt: excerptAround(text, Math.max(0, offset), match.length),
        note: `Removed ${label}`,
      });
      return `[${label} removed]`;
    });
  };

  replaceAll(EMAIL_RE, "email address");
  replaceAll(PHONE_RE, "phone number");
  replaceAll(SSN_RE, "account/SSN-like number");
  replaceAll(SECRET_ASSIGN_RE, "secret/credential");
  replaceAll(LONG_TOKEN_RE, "API token");
  replaceAll(PROFILE_URL_RE, "personal profile link");

  // Collapse awkward double spaces from removals
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return { text: out, removals };
}

function findVoluntarySensitive(text: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  for (const { re, label } of VOLUNTARY_SENSITIVE_PATTERNS) {
    const m = re.exec(text);
    if (m && m.index != null) {
      findings.push({
        bucket: "voluntary_sensitive",
        excerpt: excerptAround(text, m.index, m[0].length),
        note: `Flagged for your choice: ${label}. We will not remove this unless you ask us to.`,
      });
    }
  }
  return findings;
}

function findSubstantiveContext(text: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  for (const { re, label } of SUBSTANTIVE_CONTEXT_PATTERNS) {
    const m = re.exec(text);
    if (m && m.index != null) {
      findings.push({
        bucket: "substantive_context",
        excerpt: excerptAround(text, m.index, m[0].length),
        note: `Kept: ${label}`,
      });
    }
  }
  return findings;
}

/**
 * Review title+description. Produces a rewrite that removes direct identifiers
 * only. Voluntary sensitive detail is flagged, not stripped. Substantive
 * context is preserved.
 */
export function reviewSubmissionForPii(
  title: string,
  description: string
): PiiReviewResult {
  const combined = `${title}\n${description}`;
  const hasDirectIdentifiers =
    containsHeavyPii(combined) || classifyModeration(combined) === "drop_pii";

  const titleStrip = stripDirectIdentifiers(title);
  const descStrip = stripDirectIdentifiers(description);
  const proposedTitle = titleStrip.text || title;
  const proposedDescription = descStrip.text || description;
  const rewriteChanged =
    proposedTitle !== title || proposedDescription !== description;

  const voluntary = findVoluntarySensitive(combined);
  const substantive = findSubstantiveContext(combined);
  const findings: PiiFinding[] = [
    ...titleStrip.removals,
    ...descStrip.removals,
    ...substantive,
    ...voluntary,
  ];

  const hasVoluntarySensitive = voluntary.length > 0;
  // Hold + offer choice when direct IDs present OR voluntary sensitive flagged.
  const needsChoice = hasDirectIdentifiers || hasVoluntarySensitive;

  return {
    needsChoice,
    hasDirectIdentifiers,
    hasVoluntarySensitive,
    findings,
    proposedTitle,
    proposedDescription,
    rewriteChanged,
  };
}
