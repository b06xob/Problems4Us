import type { RawPost, PainPoint } from './types';
import { insertPainPoint, insertRawPost } from './db-service';
import {
  dedupeByExternalId,
  type QualityFilterStats,
} from './ingest-quality';
import {
  moderateRawPosts,
  type ModerationStats,
} from './ingest-moderation';
import {
  fetchRepoIssues,
  parseRepoTarget,
  TARGET_GITHUB_REPOS,
  type GitHubIssue,
} from './github-client';
import {
  searchHackerNews,
  HN_DEFAULT_QUERIES,
  type HnHit,
} from './hackernews-client';
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
  qualityFilter?: QualityFilterStats;
  moderation?: ModerationStats;
}

const PAIN_KEYWORDS = [
  'frustrated', 'broken', 'terrible', 'nightmare', 'waste of time',
  'hate', 'worst', 'complaint', 'issue', 'problem', 'bug', 'annoying',
  'unreliable', 'overpriced', 'confusing', 'painful', 'struggling',
  'anyone else', 'am I the only one', "can't believe", 'fed up',
  'looking for alternative', 'switching from', 'wish there was',
  'why is it so', 'impossible to', 'finally gave up', 'workaround',
];

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

function githubIssuesToRawPosts(
  issues: GitHubIssue[],
  sourceId: string
): RawPost[] {
  return issues.map((issue) => ({
    RawPostId: generateId('gh'),
    SourceId: sourceId,
    ExternalId: `github-issue-${issue.id}`,
    Title: issue.title || '',
    Body: issue.body || '',
    Author: issue.user?.login || 'unknown',
    Url: issue.html_url,
    PublishedAt: issue.created_at,
    CollectedAt: new Date().toISOString(),
  }));
}

export type GitHubIngestOptions = {
  /** owner/repo or full github.com URL */
  repo: string;
  sourceId?: string;
  perPage?: number;
  maxPages?: number;
  state?: 'open' | 'closed' | 'all';
  dryRun?: boolean;
};

/**
 * Ingest GitHub Issues for a repo/org target (problems4us-11b).
 */
export async function ingestGitHubRepo(
  options: GitHubIngestOptions
): Promise<IngestionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const parsed = parseRepoTarget(options.repo);
  if (!parsed) {
    return {
      source: options.repo,
      postsCollected: 0,
      commentsCollected: 0,
      rawPostsCreated: 0,
      painPointsExtracted: 0,
      errors: [`Invalid GitHub repo target: ${options.repo}`],
      duration: Date.now() - startTime,
    };
  }

  const known = TARGET_GITHUB_REPOS.find(
    (r) =>
      r.owner.toLowerCase() === parsed.owner.toLowerCase() &&
      r.repo.toLowerCase() === parsed.repo.toLowerCase()
  );
  const sourceId =
    options.sourceId ??
    known?.sourceId ??
    `src-github-${parsed.owner.toLowerCase()}-${parsed.repo.toLowerCase()}`;

  let issues: GitHubIssue[] = [];
  try {
    const fetched = await fetchRepoIssues(parsed.owner, parsed.repo, {
      state: options.state ?? 'open',
      perPage: options.perPage ?? 30,
      maxPages: options.maxPages ?? 1,
    });
    issues = fetched.issues;
  } catch (error) {
    return {
      source: `${parsed.owner}/${parsed.repo}`,
      postsCollected: 0,
      commentsCollected: 0,
      rawPostsCreated: 0,
      painPointsExtracted: 0,
      errors: [
        error instanceof Error ? error.message : String(error),
      ],
      duration: Date.now() - startTime,
    };
  }

  const rawPosts = githubIssuesToRawPosts(issues, sourceId);
  const { unique, dropped } = dedupeByExternalId(rawPosts);
  const moderated = moderateRawPosts(unique);
  const dryRun = Boolean(options.dryRun);
  let painPoints: PainPoint[] = [];
  const painSignalPosts = filterForPainSignals(moderated.kept);

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
      errors.push(
        `AI extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (!dryRun) {
    for (const post of moderated.kept) {
      try {
        await insertRawPost(post);
      } catch {
        // skip duplicates
      }
    }
  }

  collectedRawPosts.push(...moderated.kept);
  extractedPainPoints.push(...painPoints);

  return {
    source: `${parsed.owner}/${parsed.repo}`,
    postsCollected: moderated.kept.length,
    commentsCollected: 0,
    rawPostsCreated: dryRun ? 0 : moderated.kept.length,
    painPointsExtracted: painPoints.length,
    errors,
    duration: Date.now() - startTime,
    qualityFilter: {
      postsIn: issues.length,
      postsOut: moderated.kept.length,
      commentsIn: 0,
      commentsOut: 0,
      droppedLowEngagement: 0,
      droppedDenylist:
        moderated.stats.droppedToxic + moderated.stats.droppedPii,
      droppedDedupe: dropped,
    },
    moderation: moderated.stats,
  };
}

function hnHitsToRawPosts(hits: HnHit[], sourceId: string): RawPost[] {
  return hits.map((hit) => {
    const title = (hit.title || hit.story_title || "").trim();
    const body = (hit.comment_text || hit.story_text || "").trim();
    const created =
      typeof hit.created_at_i === "number"
        ? new Date(hit.created_at_i * 1000).toISOString()
        : new Date().toISOString();
    return {
      RawPostId: generateId("hn"),
      SourceId: sourceId,
      ExternalId: `hn-${hit.objectID}`,
      Title: title,
      Body: body,
      Author: hit.author || "unknown",
      Url:
        hit.url ||
        `https://news.ycombinator.com/item?id=${hit.objectID}`,
      PublishedAt: created,
      CollectedAt: new Date().toISOString(),
    };
  });
}

export type HackerNewsIngestOptions = {
  queries?: string[];
  hitsPerPage?: number;
  dryRun?: boolean;
  sourceId?: string;
};

/**
 * Ingest Hacker News stories/comments via Algolia search (problems4us-11c).
 */
export async function ingestHackerNews(
  options: HackerNewsIngestOptions = {}
): Promise<IngestionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const queries = options.queries?.length
    ? options.queries.slice(0, 5)
    : [...HN_DEFAULT_QUERIES];
  const sourceId = options.sourceId ?? "src-forum-hackernews";
  const allHits: HnHit[] = [];

  for (const query of queries) {
    try {
      const result = await searchHackerNews(query, {
        hitsPerPage: options.hitsPerPage ?? 15,
      });
      allHits.push(...result.hits);
      await new Promise((r) => setTimeout(r, 600));
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  const rawPosts = hnHitsToRawPosts(allHits, sourceId);
  const { unique, dropped } = dedupeByExternalId(rawPosts);
  const moderated = moderateRawPosts(unique);
  const dryRun = Boolean(options.dryRun);
  let painPoints: PainPoint[] = [];
  const painSignalPosts = filterForPainSignals(moderated.kept);

  if (!dryRun && painSignalPosts.length > 0) {
    try {
      painPoints = await extractPainPointsFromPosts(
        painSignalPosts.slice(0, 20)
      );
      for (const pp of painPoints) {
        try {
          await insertPainPoint(pp);
        } catch {
          // skip duplicates
        }
      }
    } catch (error) {
      errors.push(
        `AI extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (!dryRun) {
    for (const post of moderated.kept) {
      try {
        await insertRawPost(post);
      } catch {
        // skip duplicates
      }
    }
  }

  collectedRawPosts.push(...moderated.kept);
  extractedPainPoints.push(...painPoints);

  return {
    source: "hackernews",
    postsCollected: moderated.kept.length,
    commentsCollected: 0,
    rawPostsCreated: dryRun ? 0 : moderated.kept.length,
    painPointsExtracted: painPoints.length,
    errors,
    duration: Date.now() - startTime,
    qualityFilter: {
      postsIn: allHits.length,
      postsOut: moderated.kept.length,
      commentsIn: 0,
      commentsOut: 0,
      droppedLowEngagement: Math.max(
        0,
        allHits.length - unique.length - dropped
      ),
      droppedDenylist:
        moderated.stats.droppedToxic + moderated.stats.droppedPii,
      droppedDedupe: dropped,
    },
    moderation: moderated.stats,
  };
}
