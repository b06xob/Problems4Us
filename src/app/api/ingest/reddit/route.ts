import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import {
  ingestSubreddit,
  ingestAllSubreddits,
  searchAndIngest,
  getCollectedRawPosts,
  getExtractedPainPoints,
  type IngestionOptions,
} from '@/lib/data-ingestion';
import { TARGET_SUBREDDITS } from '@/lib/reddit-client';

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));

    const {
      mode = 'fetch',
      subreddits,
      sort = 'new',
      timeframe = 'week',
      postLimit = 50,
      includeComments = true,
      searchKeywords,
      dryRun = false,
    } = body as {
      mode?: 'fetch' | 'search' | 'all';
      subreddits?: string[];
      sort?: 'hot' | 'new' | 'top' | 'rising';
      timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
      postLimit?: number;
      includeComments?: boolean;
      searchKeywords?: string[];
      dryRun?: boolean;
    };

    const options: IngestionOptions = {
      sort,
      timeframe,
      postLimit,
      includeComments,
      dryRun,
    };

    let results;

    switch (mode) {
      case 'all':
        results = await ingestAllSubreddits({ ...options, subreddits });
        break;

      case 'search':
        results = await searchAndIngest(
          subreddits ?? TARGET_SUBREDDITS.map((s) => s.name),
          searchKeywords,
          { limit: postLimit, timeframe }
        );
        break;

      case 'fetch':
      default:
        if (!subreddits || subreddits.length === 0) {
          return NextResponse.json(
            { error: 'Provide "subreddits" array or use mode "all"' },
            { status: 400 }
          );
        }
        results = [];
        for (const sub of subreddits) {
          results.push(await ingestSubreddit(sub, options));
        }
        break;
    }

    const totalPosts = results.reduce((s, r) => s + r.postsCollected, 0);
    const totalPainPoints = results.reduce((s, r) => s + r.painPointsExtracted, 0);
    const allErrors = results.flatMap((r) => r.errors);

    return NextResponse.json({
      success: true,
      summary: {
        subredditsProcessed: results.length,
        totalPostsCollected: totalPosts,
        totalRawPostsStored: getCollectedRawPosts().length,
        totalPainPointsExtracted: totalPainPoints,
        totalPainPointsStored: getExtractedPainPoints().length,
        errors: allErrors.length,
      },
      results,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error('Reddit ingestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    status: 'ready',
    availableSubreddits: TARGET_SUBREDDITS.map((s) => ({
      name: s.name,
      sourceId: s.sourceId,
      url: `https://reddit.com/r/${s.name}`,
    })),
    storedData: {
      rawPosts: getCollectedRawPosts().length,
      painPoints: getExtractedPainPoints().length,
    },
    usage: {
      POST: {
        description: 'Trigger Reddit data ingestion',
        body: {
          mode: '"fetch" (specific subs) | "search" (keyword search) | "all" (all configured subs)',
          subreddits: '["sysadmin", "azure"] (optional for mode "all")',
          sort: '"hot" | "new" | "top" | "rising" (default: "new")',
          timeframe: '"hour" | "day" | "week" | "month" | "year" | "all" (default: "week")',
          postLimit: 'number (default: 50)',
          includeComments: 'boolean (default: true)',
          searchKeywords: 'string[] (for mode "search")',
          dryRun: 'boolean - collect posts without AI extraction (default: false)',
        },
      },
    },
  });
}
