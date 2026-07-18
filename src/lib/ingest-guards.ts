/**
 * Validation and safety clamps for admin Reddit ingest requests (M1.3).
 * Keeps owner APIs fail-closed on bad input and bounds cost/latency.
 */

export const INGEST_MODES = ["fetch", "search", "all"] as const;
export type IngestMode = (typeof INGEST_MODES)[number];

export const INGEST_SORTS = ["hot", "new", "top", "rising"] as const;
export type IngestSort = (typeof INGEST_SORTS)[number];

export const INGEST_TIMEFRAMES = [
  "hour",
  "day",
  "week",
  "month",
  "year",
  "all",
] as const;
export type IngestTimeframe = (typeof INGEST_TIMEFRAMES)[number];

export const INGEST_LIMITS = {
  minPostLimit: 1,
  maxPostLimit: 100,
  defaultPostLimit: 50,
  maxSubreddits: 20,
  maxSearchKeywords: 10,
} as const;

export interface NormalizedIngestRequest {
  mode: IngestMode;
  subreddits?: string[];
  sort: IngestSort;
  timeframe: IngestTimeframe;
  postLimit: number;
  includeComments: boolean;
  searchKeywords?: string[];
  dryRun: boolean;
}

export type IngestGuardResult =
  | { ok: true; value: NormalizedIngestRequest }
  | { ok: false; error: string; status: 400 };

function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  return items;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * Normalize and validate a POST /api/ingest/reddit body.
 */
export function normalizeIngestRequest(body: unknown): IngestGuardResult {
  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const modeRaw = typeof raw.mode === "string" ? raw.mode : "fetch";
  if (!(INGEST_MODES as readonly string[]).includes(modeRaw)) {
    return {
      ok: false,
      error: `Invalid mode. Must be one of: ${INGEST_MODES.join(", ")}`,
      status: 400,
    };
  }
  const mode = modeRaw as IngestMode;

  const sortRaw = typeof raw.sort === "string" ? raw.sort : "new";
  if (!(INGEST_SORTS as readonly string[]).includes(sortRaw)) {
    return {
      ok: false,
      error: `Invalid sort. Must be one of: ${INGEST_SORTS.join(", ")}`,
      status: 400,
    };
  }

  const timeframeRaw = typeof raw.timeframe === "string" ? raw.timeframe : "week";
  if (!(INGEST_TIMEFRAMES as readonly string[]).includes(timeframeRaw)) {
    return {
      ok: false,
      error: `Invalid timeframe. Must be one of: ${INGEST_TIMEFRAMES.join(", ")}`,
      status: 400,
    };
  }

  const subreddits = asStringArray(raw.subreddits);
  if (raw.subreddits !== undefined && subreddits === undefined) {
    return { ok: false, error: '"subreddits" must be an array of strings', status: 400 };
  }
  if (subreddits && subreddits.length > INGEST_LIMITS.maxSubreddits) {
    return {
      ok: false,
      error: `Too many subreddits (max ${INGEST_LIMITS.maxSubreddits})`,
      status: 400,
    };
  }

  if (mode === "fetch" && (!subreddits || subreddits.length === 0)) {
    return {
      ok: false,
      error: 'Provide "subreddits" array or use mode "all"',
      status: 400,
    };
  }

  const searchKeywords = asStringArray(raw.searchKeywords);
  if (raw.searchKeywords !== undefined && searchKeywords === undefined) {
    return {
      ok: false,
      error: '"searchKeywords" must be an array of strings',
      status: 400,
    };
  }
  if (searchKeywords && searchKeywords.length > INGEST_LIMITS.maxSearchKeywords) {
    return {
      ok: false,
      error: `Too many searchKeywords (max ${INGEST_LIMITS.maxSearchKeywords})`,
      status: 400,
    };
  }

  if (mode === "search" && searchKeywords && searchKeywords.length === 0) {
    return {
      ok: false,
      error: '"searchKeywords" cannot be an empty array',
      status: 400,
    };
  }

  return {
    ok: true,
    value: {
      mode,
      subreddits,
      sort: sortRaw as IngestSort,
      timeframe: timeframeRaw as IngestTimeframe,
      postLimit: clampInt(
        raw.postLimit,
        INGEST_LIMITS.minPostLimit,
        INGEST_LIMITS.maxPostLimit,
        INGEST_LIMITS.defaultPostLimit
      ),
      includeComments: raw.includeComments !== false,
      searchKeywords,
      dryRun: Boolean(raw.dryRun),
    },
  };
}

export function summarizeIngestResults(
  results: Array<{
    postsCollected: number;
    painPointsExtracted: number;
    errors: string[];
  }>
): {
  subredditsProcessed: number;
  totalPostsCollected: number;
  totalPainPointsExtracted: number;
  errorCount: number;
  ok: boolean;
} {
  const totalPosts = results.reduce((s, r) => s + r.postsCollected, 0);
  const totalPainPoints = results.reduce((s, r) => s + r.painPointsExtracted, 0);
  const errorCount = results.reduce((s, r) => s + r.errors.length, 0);
  return {
    subredditsProcessed: results.length,
    totalPostsCollected: totalPosts,
    totalPainPointsExtracted: totalPainPoints,
    errorCount,
    ok: results.length > 0 && errorCount === 0,
  };
}
