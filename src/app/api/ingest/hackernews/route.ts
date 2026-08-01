import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  ingestHackerNews,
  getCollectedRawPosts,
  getExtractedPainPoints,
} from "@/lib/data-ingestion";
import { HN_DEFAULT_QUERIES } from "@/lib/hackernews-client";
import { resolveIngestDryRun } from "@/lib/ingest-guards";

/**
 * Admin Hacker News (forums) ingest — problems4us-11c.
 * POST { queries?: string[], hitsPerPage?: number, dryRun?: boolean }
 * Also accepts ?dryRun=1|true so ops probes cannot accidentally write live.
 */
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      queries?: string[];
      hitsPerPage?: number;
      dryRun?: boolean;
    };

    const dryRun = resolveIngestDryRun(body.dryRun, request.nextUrl.searchParams);

    const result = await ingestHackerNews({
      queries: body.queries,
      hitsPerPage: body.hitsPerPage,
      dryRun,
    });

    const { TELEMETRY_EVENTS, trackAppEventFireAndForget } = await import(
      "@/lib/app-insights"
    );
    trackAppEventFireAndForget(TELEMETRY_EVENTS.ingestComplete, {
      source: "hackernews",
      ok: result.errors.length === 0,
      posts: result.postsCollected,
      painPoints: result.painPointsExtracted,
      dryRun,
    });

    return NextResponse.json({
      success: result.errors.length === 0,
      summary: {
        ok: result.errors.length === 0,
        totalPostsCollected: result.postsCollected,
        totalPainPoints: result.painPointsExtracted,
        errorCount: result.errors.length,
        dryRun,
        totalRawPostsStored: getCollectedRawPosts().length,
        totalPainPointsStored: getExtractedPainPoints().length,
      },
      results: [result],
    });
  } catch (error) {
    console.error("HN ingestion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    status: "ready",
    sourceType: "forum",
    provider: "Hacker News Algolia search API",
    defaultQueries: HN_DEFAULT_QUERIES,
    auth: "None required (public API)",
    tosNotes:
      "Respect HN/Algolia fair use; keep low QPS; do not scrape HTML. Escalate on repeated 429s.",
    usage: {
      POST: {
        body: {
          queries: "string[] max 5 (optional)",
          hitsPerPage: "1-50 (default 15)",
          dryRun: "boolean — fetch only (default false); also ?dryRun=1",
        },
      },
    },
  });
}
