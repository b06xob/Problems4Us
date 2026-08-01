import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  ingestGitHubRepo,
  getCollectedRawPosts,
  getExtractedPainPoints,
} from "@/lib/data-ingestion";
import { TARGET_GITHUB_REPOS } from "@/lib/github-client";
import {
  resolveGitHubRepoTargets,
  resolveIngestDryRun,
} from "@/lib/ingest-guards";

/**
 * Admin GitHub Issues ingest (problems4us-11b).
 * POST body: { repo: "owner/repo", dryRun?: boolean, perPage?: number, state?: "open"|"closed"|"all" }
 * Also accepts ?dryRun=1|true query and owner+repo / repos[] / targets[] shapes.
 */
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      repo?: string;
      repos?: string[];
      owner?: string;
      targets?: Array<{ owner?: string; repo?: string }>;
      dryRun?: boolean;
      perPage?: number;
      maxPages?: number;
      state?: "open" | "closed" | "all";
      sourceId?: string;
    };

    const resolved = resolveGitHubRepoTargets(body);
    const targets =
      resolved.length > 0
        ? resolved
        : TARGET_GITHUB_REPOS.map((r) => `${r.owner}/${r.repo}`);

    if (targets.length > 10) {
      return NextResponse.json(
        { error: "Max 10 GitHub repo targets per request" },
        { status: 400 }
      );
    }

    const dryRun = resolveIngestDryRun(body.dryRun, request.nextUrl.searchParams);

    const results = [];
    for (const repo of targets) {
      results.push(
        await ingestGitHubRepo({
          repo,
          dryRun,
          perPage: body.perPage,
          maxPages: body.maxPages,
          state: body.state,
          sourceId: body.sourceId,
        })
      );
      await new Promise((r) => setTimeout(r, 500));
    }

    const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
    const totalPosts = results.reduce((n, r) => n + r.postsCollected, 0);
    const totalPainPoints = results.reduce((n, r) => n + r.painPointsExtracted, 0);

    const { TELEMETRY_EVENTS, trackAppEventFireAndForget } = await import(
      "@/lib/app-insights"
    );
    trackAppEventFireAndForget(TELEMETRY_EVENTS.ingestComplete, {
      source: "github",
      ok: errorCount === 0,
      posts: totalPosts,
      painPoints: totalPainPoints,
      dryRun,
    });

    return NextResponse.json({
      success: errorCount === 0,
      summary: {
        ok: errorCount === 0,
        repoCount: results.length,
        totalPostsCollected: totalPosts,
        totalPainPoints,
        errorCount,
        dryRun,
        totalRawPostsStored: getCollectedRawPosts().length,
        totalPainPointsStored: getExtractedPainPoints().length,
      },
      results,
    });
  } catch (error) {
    console.error("GitHub ingestion error:", error);
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
    sourceType: "github",
    defaultRepos: TARGET_GITHUB_REPOS.map((r) => ({
      owner: r.owner,
      repo: r.repo,
      url: `https://github.com/${r.owner}/${r.repo}/issues`,
    })),
    auth: "Optional GITHUB_TOKEN on App Service",
    usage: {
      POST: {
        body: {
          repo: '"owner/repo" or github.com URL (optional if repos[] or defaults)',
          repos: 'string[] of "owner/repo"',
          owner: "string — with bare repo name forms owner/repo",
          targets: '[{ owner, repo }] — ops probe shape',
          dryRun:
            "boolean — fetch only, no DB/AI writes (default false); also ?dryRun=1",
          perPage: "1-100",
          maxPages: "1-5",
          state: '"open"|"closed"|"all"',
        },
      },
    },
  });
}
