/**
 * Shared ingest quality helpers (dedupe + filter stats).
 * Used by GitHub Issues and Hacker News ingest paths.
 */

export interface QualityFilterStats {
  postsIn: number;
  postsOut: number;
  commentsIn: number;
  commentsOut: number;
  droppedLowEngagement: number;
  droppedDenylist: number;
  droppedDedupe: number;
}

/** Drop duplicate ExternalIds within a batch (first occurrence wins). */
export function dedupeByExternalId<T extends { ExternalId: string }>(
  posts: T[]
): { unique: T[]; dropped: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let dropped = 0;
  for (const post of posts) {
    const id = post.ExternalId?.trim() ?? "";
    if (!id || seen.has(id)) {
      dropped += 1;
      continue;
    }
    seen.add(id);
    unique.push(post);
  }
  return { unique, dropped };
}
