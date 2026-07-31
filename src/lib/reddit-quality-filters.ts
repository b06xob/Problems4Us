/**
 * Reddit ingest quality filters (problems4us-11a).
 * Enforces min engagement, keyword denylist, and ExternalId dedupe
 * before raw posts are persisted / sent to AI extraction.
 */

export const REDDIT_QUALITY_DEFAULTS = {
  minPostScore: 2,
  minPostComments: 1,
  minCommentScore: 1,
  minCommentBodyLength: 40,
  minPostTitleLength: 20,
  minSelftextForLowComment: 50,
} as const;

/** Phrases that indicate spam, meta-noise, or non-pain content we drop. */
export const REDDIT_KEYWORD_DENYLIST: readonly string[] = [
  'upvote if',
  'upvote this',
  'free giveaway',
  'crypto airdrop',
  'nft drop',
  'click here to',
  'subscribe to my',
  'follow me on',
  'onlyfans',
  'dm me for',
  'telegram.me',
  't.me/',
  'check out my channel',
  'this is a bot',
  '[deleted]',
  '[removed]',
];

export interface RedditPostLike {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  author?: string;
}

export interface RedditCommentLike {
  id: string;
  body: string;
  score: number;
  author?: string;
}

export interface QualityFilterOptions {
  minPostScore?: number;
  minPostComments?: number;
  minCommentScore?: number;
  denylist?: readonly string[];
}

export interface QualityFilterStats {
  postsIn: number;
  postsOut: number;
  commentsIn: number;
  commentsOut: number;
  droppedLowEngagement: number;
  droppedDenylist: number;
  droppedDedupe: number;
}

function containsDenylist(
  text: string,
  denylist: readonly string[] = REDDIT_KEYWORD_DENYLIST
): boolean {
  const lower = text.toLowerCase();
  return denylist.some((phrase) => lower.includes(phrase.toLowerCase()));
}

export function passesPostEngagement(
  post: RedditPostLike,
  options: QualityFilterOptions = {}
): boolean {
  const minScore = options.minPostScore ?? REDDIT_QUALITY_DEFAULTS.minPostScore;
  const minComments =
    options.minPostComments ?? REDDIT_QUALITY_DEFAULTS.minPostComments;

  if (post.score < minScore) return false;

  const hasBody =
    (post.selftext?.length ?? 0) >=
    REDDIT_QUALITY_DEFAULTS.minSelftextForLowComment;
  const hasTitle =
    (post.title?.length ?? 0) >= REDDIT_QUALITY_DEFAULTS.minPostTitleLength;

  if (!hasTitle && !hasBody) return false;

  // Allow strong self-posts even with few comments; otherwise require min comments.
  if (post.num_comments < minComments && !hasBody) return false;

  return true;
}

export function passesCommentEngagement(
  comment: RedditCommentLike,
  options: QualityFilterOptions = {}
): boolean {
  const minScore =
    options.minCommentScore ?? REDDIT_QUALITY_DEFAULTS.minCommentScore;
  if (comment.score < minScore) return false;
  if (
    (comment.body?.length ?? 0) < REDDIT_QUALITY_DEFAULTS.minCommentBodyLength
  ) {
    return false;
  }
  if (comment.body === '[deleted]' || comment.body === '[removed]') return false;
  return true;
}

export function passesDenylist(
  title: string,
  body: string,
  denylist: readonly string[] = REDDIT_KEYWORD_DENYLIST
): boolean {
  return !containsDenylist(`${title} ${body}`, denylist);
}

export function dedupeByExternalId<T extends { ExternalId: string }>(
  items: T[]
): { unique: T[]; dropped: number } {
  const seen = new Map<string, T>();
  let dropped = 0;
  for (const item of items) {
    if (seen.has(item.ExternalId)) {
      dropped += 1;
      continue;
    }
    seen.set(item.ExternalId, item);
  }
  return { unique: Array.from(seen.values()), dropped };
}

/**
 * Filter Reddit content before RawPost conversion.
 */
export function filterRedditContent<
  P extends RedditPostLike,
  C extends RedditCommentLike,
>(
  content: { posts: P[]; comments: C[] },
  options: QualityFilterOptions = {}
): {
  posts: P[];
  comments: C[];
  stats: QualityFilterStats;
} {
  const denylist = options.denylist ?? REDDIT_KEYWORD_DENYLIST;
  let droppedLowEngagement = 0;
  let droppedDenylist = 0;

  const posts: P[] = [];
  for (const post of content.posts) {
    if (!passesPostEngagement(post, options)) {
      droppedLowEngagement += 1;
      continue;
    }
    if (!passesDenylist(post.title, post.selftext || '', denylist)) {
      droppedDenylist += 1;
      continue;
    }
    posts.push(post);
  }

  const comments: C[] = [];
  for (const comment of content.comments) {
    if (!passesCommentEngagement(comment, options)) {
      droppedLowEngagement += 1;
      continue;
    }
    if (!passesDenylist('', comment.body || '', denylist)) {
      droppedDenylist += 1;
      continue;
    }
    comments.push(comment);
  }

  // Dedupe by Reddit id within the batch
  const postIds = new Set<string>();
  const dedupedPosts: P[] = [];
  let droppedDedupe = 0;
  for (const post of posts) {
    if (postIds.has(post.id)) {
      droppedDedupe += 1;
      continue;
    }
    postIds.add(post.id);
    dedupedPosts.push(post);
  }

  const commentIds = new Set<string>();
  const dedupedComments: C[] = [];
  for (const comment of comments) {
    if (commentIds.has(comment.id)) {
      droppedDedupe += 1;
      continue;
    }
    commentIds.add(comment.id);
    dedupedComments.push(comment);
  }

  return {
    posts: dedupedPosts,
    comments: dedupedComments,
    stats: {
      postsIn: content.posts.length,
      postsOut: dedupedPosts.length,
      commentsIn: content.comments.length,
      commentsOut: dedupedComments.length,
      droppedLowEngagement,
      droppedDenylist,
      droppedDedupe,
    },
  };
}
