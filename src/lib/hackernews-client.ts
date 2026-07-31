/**
 * Hacker News Algolia search ingest (problems4us-11c reviews/forums source).
 * Public API — no auth token required. Rate-limit politely.
 */

export interface HnHit {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  comment_text?: string | null;
  story_text?: string | null;
  author?: string | null;
  url?: string | null;
  created_at_i?: number;
  points?: number | null;
  num_comments?: number | null;
}

export interface HnSearchResult {
  query: string;
  hits: HnHit[];
  fetchedAt: string;
}

const USER_AGENT = "Problems4Us/1.0 (Data Collection Bot)";
const HN_SEARCH = "https://hn.algolia.com/api/v1/search";

export const HN_DEFAULT_QUERIES = [
  "azure billing pain",
  "saas pricing frustration",
] as const;

export function isIngestibleHnHit(hit: HnHit): boolean {
  const title = (hit.title || hit.story_title || "").trim();
  const body = (hit.comment_text || hit.story_text || "").trim();
  if (title.length < 12 && body.length < 40) return false;
  if ((hit.points ?? 0) < 1 && body.length < 80) return false;
  return true;
}

export async function searchHackerNews(
  query: string,
  options: { hitsPerPage?: number; tags?: string } = {}
): Promise<HnSearchResult> {
  const hitsPerPage = Math.min(50, Math.max(1, options.hitsPerPage ?? 20));
  const tags = options.tags ?? "(story,comment)";
  const url =
    `${HN_SEARCH}?query=${encodeURIComponent(query)}` +
    `&hitsPerPage=${hitsPerPage}&tags=${encodeURIComponent(tags)}`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HN search failed: ${response.status} - ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { hits?: HnHit[] };
  const hits = Array.isArray(data.hits)
    ? data.hits.filter(isIngestibleHnHit)
    : [];
  return { query, hits, fetchedAt: new Date().toISOString() };
}
