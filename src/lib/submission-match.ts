/**
 * Catalog match for community submissions (founder: merge corroborating evidence).
 * Deterministic token Jaccard — no invented similarity.
 */

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "for",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "this",
  "that",
  "these",
  "those",
  "as",
  "into",
  "about",
  "over",
  "under",
  "not",
  "no",
  "can",
  "could",
  "should",
  "would",
  "will",
  "just",
  "very",
  "more",
  "most",
  "than",
  "then",
  "when",
  "where",
  "who",
  "what",
  "how",
  "why",
  "our",
  "your",
  "their",
  "my",
  "we",
  "you",
  "they",
  "i",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "get",
  "got",
  "make",
  "made",
  "use",
  "using",
  "used",
]);

export function tokenizeForMatch(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return new Set(tokens);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type CatalogCandidate = {
  PainPointId: string;
  Title: string;
  Summary: string;
  Category: string;
  OpportunityScore: number;
};

export type CatalogMatch = {
  painPointId: string;
  title: string;
  score: number;
  opportunityScore: number;
};

/** Default threshold tuned for short titles; require meaningful overlap. */
export const DEFAULT_MATCH_THRESHOLD = 0.28;

export function findBestCatalogMatch(
  title: string,
  description: string,
  category: string,
  candidates: CatalogCandidate[],
  threshold: number = DEFAULT_MATCH_THRESHOLD
): CatalogMatch | null {
  const queryTokens = tokenizeForMatch(`${title} ${description}`);
  if (queryTokens.size < 2) return null;

  let best: CatalogMatch | null = null;

  const sameCategory = candidates.filter(
    (c) => c.Category.toLowerCase() === category.toLowerCase()
  );
  const pool = sameCategory.length > 0 ? sameCategory : candidates;

  for (const c of pool) {
    const candTokens = tokenizeForMatch(`${c.Title} ${c.Summary}`);
    const score = jaccardSimilarity(queryTokens, candTokens);
    if (score < threshold) continue;
    if (!best || score > best.score) {
      best = {
        painPointId: c.PainPointId,
        title: c.Title,
        score,
        opportunityScore: c.OpportunityScore,
      };
    }
  }

  return best;
}

/**
 * Percentile rank among scored catalog (higher opportunity = better).
 * Returns null if catalog empty. "top 15%" ⇒ percentileRank >= 85.
 */
export function opportunityPercentileRank(
  opportunityScore: number,
  allScores: number[]
): number | null {
  if (!allScores.length) return null;
  const higher = allScores.filter((s) => s > opportunityScore).length;
  const rank = ((allScores.length - higher) / allScores.length) * 100;
  return Math.round(rank);
}
