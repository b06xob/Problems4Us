/**
 * Content moderation before score publish (problems4us-32).
 * Drops clearly toxic / PII-heavy raw posts before DB write and AI extraction.
 * Applies to GitHub Issues and Hacker News ingest paths.
 */

export type ModerationAction = "keep" | "drop_toxic" | "drop_pii";

export type ModerationStats = {
  inCount: number;
  outCount: number;
  droppedToxic: number;
  droppedPii: number;
};

/** Conservative toxic / harassment phrases — drop before public problem list. */
export const TOXIC_PHRASE_DENYLIST: readonly string[] = [
  "kill yourself",
  "kys ",
  "you should die",
  "rape",
  "nigger",
  "nigga",
  "faggot",
  "retarded fucking",
  "go gas yourself",
];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE =
  /(?<!\d)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\d)/;
const SSN_RE = /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/;
const SECRET_ASSIGN_RE =
  /\b(password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*\S+/i;
const LONG_TOKEN_RE =
  /\b(?:sk|pk|ghp|gho|xox[baprs])-[A-Za-z0-9_-]{16,}\b/;

export type ModeratablePost = {
  Title?: string;
  Body?: string;
  Author?: string;
};

export function containsToxicContent(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return TOXIC_PHRASE_DENYLIST.some((phrase) =>
    lower.includes(phrase.toLowerCase())
  );
}

export function containsHeavyPii(text: string): boolean {
  if (!text) return false;
  if (EMAIL_RE.test(text)) return true;
  if (SSN_RE.test(text)) return true;
  if (SECRET_ASSIGN_RE.test(text)) return true;
  if (LONG_TOKEN_RE.test(text)) return true;
  // Require phone-like digit runs only when enough digits present to avoid issue IDs.
  const digitRuns = text.match(/\d[\d\s().-]{8,}\d/g) || [];
  if (digitRuns.some((run) => PHONE_RE.test(run))) return true;
  return false;
}

export function classifyModeration(text: string): ModerationAction {
  if (containsToxicContent(text)) return "drop_toxic";
  if (containsHeavyPii(text)) return "drop_pii";
  return "keep";
}

/**
 * Filter raw posts before insert/AI. Toxic and PII-heavy items are dropped
 * (quarantine = omit from public pipeline; not persisted to problem list).
 */
export function moderateRawPosts<T extends ModeratablePost>(
  posts: T[]
): { kept: T[]; stats: ModerationStats } {
  let droppedToxic = 0;
  let droppedPii = 0;
  const kept: T[] = [];

  for (const post of posts) {
    const text = `${post.Title || ""} ${post.Body || ""} ${post.Author || ""}`;
    const action = classifyModeration(text);
    if (action === "drop_toxic") {
      droppedToxic += 1;
      continue;
    }
    if (action === "drop_pii") {
      droppedPii += 1;
      continue;
    }
    kept.push(post);
  }

  return {
    kept,
    stats: {
      inCount: posts.length,
      outCount: kept.length,
      droppedToxic,
      droppedPii,
    },
  };
}
