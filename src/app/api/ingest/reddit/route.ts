import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  ingestSubreddit,
  ingestAllSubreddits,
  searchAndIngest,
  getCollectedRawPosts,
  getExtractedPainPoints,
  type IngestionOptions,
} from "@/lib/data-ingestion";
import { TARGET_SUBREDDITS } from "@/lib/reddit-client";
import {
  INGEST_LIMITS,
  normalizeIngestRequest,
  summarizeIngestResults,
} from "@/lib/ingest-guards";

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = normalizeIngestRequest(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const {
      mode,
      subreddits,
      sort,
      timeframe,
      postLimit,
      includeComments,
      searchKeywords,
      dryRun,
    } = parsed.value;

    const options: IngestionOptions = {
      sort,
      timeframe,
      postLimit,
      includeComments,
      dryRun,
      subreddits,
    };

    let results;

    switch (mode) {
      case "all":
        results = await ingestAllSubreddits(options);
        break;

      case "search":
        results = await searchAndIngest(
          subreddits ?? TARGET_SUBREDDITS.map((s) => s.name),
          searchKeywords,
          { limit: postLimit, timeframe, dryRun }
        );
        break;

      case "fetch":
      default:
        results = [];
        for (const sub of subreddits ?? []) {
          results.push(await ingestSubreddit(sub, options));
        }
        break;
    }

    const summaryCore = summarizeIngestResults(results);
    const allErrors = results.flatMap((r) => r.errors);

    return NextResponse.json({
      success: summaryCore.ok,
      summary: {
        ...summaryCore,
        totalRawPostsStored: getCollectedRawPosts().length,
        totalPainPointsStored: getExtractedPainPoints().length,
        errors: summaryCore.errorCount,
        dryRun,
        mode,
        postLimit,
      },
      results,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error("Reddit ingestion error:", error);
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
    limits: INGEST_LIMITS,
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
        description: "Trigger Reddit data ingestion (ADMIN_API_KEY required)",
        body: {
          mode: '"fetch" (specific subs) | "search" (keyword search) | "all" (all configured subs)',
          subreddits: '["sysadmin", "azure"] (required for mode "fetch"; optional for "all"/"search")',
          sort: '"hot" | "new" | "top" | "rising" (default: "new")',
          timeframe: '"hour" | "day" | "week" | "month" | "year" | "all" (default: "week")',
          postLimit: `number ${INGEST_LIMITS.minPostLimit}-${INGEST_LIMITS.maxPostLimit} (default: ${INGEST_LIMITS.defaultPostLimit})`,
          includeComments: "boolean (default: true)",
          searchKeywords: "string[] (for mode \"search\"; max 10)",
          dryRun:
            "boolean - collect posts without AI extraction / pain-point writes (default: false)",
        },
      },
    },
  });
}
