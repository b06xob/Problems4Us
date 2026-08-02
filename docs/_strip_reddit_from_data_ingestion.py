"""One-shot: strip Reddit ingest from data-ingestion.ts (cos-remove-reddit-20260802)."""
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src" / "lib" / "data-ingestion.ts"
text = p.read_text(encoding="utf-8")
marker = "function githubIssuesToRawPosts("
idx = text.index(marker)
tail = text[idx:]

header = r'''import type { RawPost, PainPoint } from './types';
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

'''

p.write_text(header + tail, encoding="utf-8")
print(f"rewrote {p}")
