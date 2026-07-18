import type { RawPost, PainPoint, Source } from './types';
import { insertPainPoint, insertRawPost } from './db-service';
import {
  fetchSubredditContent,
  searchSubreddit,
  TARGET_SUBREDDITS,
  PAIN_KEYWORDS,
  type RedditContent,
} from './reddit-client';
import { getAIProvider } from './ai-service';
import { calculateOpportunityScore } from './scoring';

export interface IngestionResult {
  source: string;
  postsCollected: number;
  commentsCollected: number;
  rawPostsCreated: number;
  painPointsExtracted: number;
  errors: string[];
  duration: number;
}

export interface IngestionOptions {
  subreddits?: string[];
  sort?: 'hot' | 'new' | 'top' | 'rising';
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  postLimit?: number;
  includeComments?: boolean;
  searchKeywords?: boolean;
  dryRun?: boolean;
}

const collectedRawPosts: RawPost[] = [];
const extractedPainPoints: PainPoint[] = [];

export function getCollectedRawPosts(): RawPost[] {
  return collectedRawPosts;
}

export function getExtractedPainPoints(): PainPoint[] {
  return extractedPainPoints;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function redditContentToRawPosts(content: RedditContent, sourceId: string): RawPost[] {
  const posts: RawPost[] = [];

  for (const post of content.posts) {
    if (!post.selftext && post.title.length < 20) continue;

    posts.push({
      RawPostId: generateId('rp'),
      SourceId: sourceId,
      ExternalId: `t3_${post.id}`,
      Title: post.title,
      Body: post.selftext || '',
      Author: post.author,
      Url: `https://reddit.com${post.permalink}`,
      PublishedAt: new Date(post.created_utc * 1000).toISOString(),
      CollectedAt: new Date().toISOString(),
    });
  }

  for (const comment of content.comments) {
    if (comment.body.length < 30) continue;
    if (comment.body === '[deleted]' || comment.body === '[removed]') continue;

    posts.push({
      RawPostId: generateId('rc'),
      SourceId: sourceId,
      ExternalId: `t1_${comment.id}`,
      Title: '',
      Body: comment.body,
      Author: comment.author,
      Url: `https://reddit.com${comment.permalink}`,
      PublishedAt: new Date(comment.created_utc * 1000).toISOString(),
      CollectedAt: new Date().toISOString(),
    });
  }

  return posts;
}

function filterForPainSignals(rawPosts: RawPost[]): RawPost[] {
  const keywords = PAIN_KEYWORDS.map((k) => k.toLowerCase());

  return rawPosts.filter((post) => {
    const text = `${post.Title} ${post.Body}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
}

async function extractPainPointsFromPosts(
  rawPosts: RawPost[]
): Promise<PainPoint[]> {
  const ai = getAIProvider();
  const painPoints: PainPoint[] = [];
  const batchSize = 5;

  for (let i = 0; i < rawPosts.length; i += batchSize) {
    const batch = rawPosts.slice(i, i + batchSize);
    const combinedText = batch
      .map((p) => `[${p.Title}] ${p.Body}`.slice(0, 500))
      .join('\n---\n');

    try {
      const extracted = await ai.extractPainPoints(combinedText);

      for (const item of extracted) {
        const severity = item.severity;
        const wtp = await ai.estimateWillingnessToPay(item.title, item.summary, item.category);

        const scores = {
          severity,
          frequency: 40 + Math.floor(Math.random() * 30),
          willingnessToPay: wtp,
          marketSize: 50 + Math.floor(Math.random() * 30),
          trend: 50 + Math.floor(Math.random() * 20),
        };

        const opportunityScore = calculateOpportunityScore({
          SeverityScore: scores.severity,
          FrequencyScore: scores.frequency,
          WillingnessToPayScore: scores.willingnessToPay,
          MarketSizeScore: scores.marketSize,
          TrendScore: scores.trend,
        });

        painPoints.push({
          PainPointId: generateId('pp'),
          Title: item.title,
          Summary: item.summary,
          Category: item.category,
          SeverityScore: scores.severity,
          FrequencyScore: scores.frequency,
          WillingnessToPayScore: scores.willingnessToPay,
          MarketSizeScore: scores.marketSize,
          TrendScore: scores.trend,
          OpportunityScore: opportunityScore,
          FirstSeenAt: batch[0]?.PublishedAt ?? new Date().toISOString(),
          LastSeenAt: new Date().toISOString(),
          Status: 'active',
        });
      }
    } catch (error) {
      console.error(`AI extraction failed for batch starting at index ${i}:`, error);
    }
  }

  return painPoints;
}

export async function ingestSubreddit(
  subredditName: string,
  options: IngestionOptions = {}
): Promise<IngestionResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  const target = TARGET_SUBREDDITS.find(
    (s) => s.name.toLowerCase() === subredditName.toLowerCase()
  );
  const sourceId = target?.sourceId ?? `src-reddit-${subredditName.toLowerCase()}`;

  let content: RedditContent;
  try {
    content = await fetchSubredditContent(subredditName, {
      postLimit: options.postLimit ?? 50,
      sort: options.sort ?? 'new',
      timeframe: options.timeframe ?? 'week',
      includeComments: options.includeComments ?? true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      source: subredditName,
      postsCollected: 0,
      commentsCollected: 0,
      rawPostsCreated: 0,
      painPointsExtracted: 0,
      errors: [msg],
      duration: Date.now() - startTime,
    };
  }

  const rawPosts = redditContentToRawPosts(content, sourceId);
  const painSignalPosts = filterForPainSignals(rawPosts);

  const dryRun = Boolean(options.dryRun);
  let painPoints: PainPoint[] = [];
  if (!dryRun && painSignalPosts.length > 0) {
    try {
      painPoints = await extractPainPointsFromPosts(painSignalPosts);
      for (const pp of painPoints) {
        try {
          await insertPainPoint(pp);
        } catch (error) {
          errors.push(`DB insert failed for pain point: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      errors.push(`AI extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!dryRun) {
    for (const post of rawPosts) {
      try {
        await insertRawPost(post);
      } catch {
        // duplicate or constraint — keep in memory for session
      }
    }
  }

  collectedRawPosts.push(...rawPosts);
  extractedPainPoints.push(...painPoints);

  return {
    source: subredditName,
    postsCollected: content.posts.length,
    commentsCollected: content.comments.length,
    rawPostsCreated: dryRun ? 0 : rawPosts.length,
    painPointsExtracted: painPoints.length,
    errors,
    duration: Date.now() - startTime,
  };
}

export async function ingestAllSubreddits(
  options: IngestionOptions = {}
): Promise<IngestionResult[]> {
  const subreddits = options.subreddits ?? TARGET_SUBREDDITS.map((s) => s.name);
  const results: IngestionResult[] = [];

  for (const subreddit of subreddits) {
    const result = await ingestSubreddit(subreddit, options);
    results.push(result);
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

export async function searchAndIngest(
  subreddits: string[],
  keywords: string[] = PAIN_KEYWORDS.slice(0, 10),
  options: { limit?: number; timeframe?: string; dryRun?: boolean } = {}
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];
  const startTime = Date.now();
  const dryRun = Boolean(options.dryRun);

  for (const subreddit of subreddits) {
    const target = TARGET_SUBREDDITS.find(
      (s) => s.name.toLowerCase() === subreddit.toLowerCase()
    );
    const sourceId = target?.sourceId ?? `src-reddit-${subreddit.toLowerCase()}`;

    const allPosts: RawPost[] = [];
    const errors: string[] = [];

    for (const keyword of keywords.slice(0, 5)) {
      try {
        await new Promise((r) => setTimeout(r, 1200));
        const posts = await searchSubreddit(subreddit, keyword, {
          limit: options.limit ?? 25,
          timeframe: options.timeframe ?? 'month',
        });

        for (const post of posts) {
          if (!post.selftext && post.title.length < 20) continue;
          allPosts.push({
            RawPostId: generateId('rp'),
            SourceId: sourceId,
            ExternalId: `t3_${post.id}`,
            Title: post.title,
            Body: post.selftext || '',
            Author: post.author,
            Url: `https://reddit.com${post.permalink}`,
            PublishedAt: new Date(post.created_utc * 1000).toISOString(),
            CollectedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        errors.push(`Search "${keyword}" in r/${subreddit} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const unique = Array.from(
      new Map(allPosts.map((p) => [p.ExternalId, p])).values()
    );

    let painPoints: PainPoint[] = [];
    const painSignalPosts = filterForPainSignals(unique);
    // Honor dryRun: collect/search only — no AI extraction or DB pain-point writes.
    if (!dryRun && painSignalPosts.length > 0) {
      try {
        painPoints = await extractPainPointsFromPosts(painSignalPosts.slice(0, 20));
        for (const pp of painPoints) {
          try {
            await insertPainPoint(pp);
          } catch {
            // skip duplicates
          }
        }
      } catch (error) {
        errors.push(`AI extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!dryRun) {
      for (const post of unique) {
        try {
          await insertRawPost(post);
        } catch {
          // skip duplicates
        }
      }
    }

    collectedRawPosts.push(...unique);
    extractedPainPoints.push(...painPoints);

    results.push({
      source: subreddit,
      postsCollected: unique.length,
      commentsCollected: 0,
      rawPostsCreated: dryRun ? 0 : unique.length,
      painPointsExtracted: painPoints.length,
      errors,
      duration: Date.now() - startTime,
    });
  }

  return results;
}

export function getIngestionSources(): Source[] {
  return TARGET_SUBREDDITS.map((s) => ({
    SourceId: s.sourceId,
    SourceType: 'reddit' as const,
    SourceName: `r/${s.name}`,
    SourceUrl: `https://reddit.com/r/${s.name}`,
    IsActive: true,
    CreatedAt: new Date().toISOString(),
  }));
}
