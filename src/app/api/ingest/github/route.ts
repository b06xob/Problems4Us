import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  ingestGitHubRepo,
  getCollectedRawPosts,
  getExtractedPainPoints,
} from "@/lib/data-ingestion";
import { TARGET_GITHUB_REPOS } from "@/lib/github-client";

/**
 * Admin GitHub Issues ingest (problems4us-11b).
 * POST body: { repo: "owner/repo", dryRun?: boolean, perPage?: number, state?: "open"|"closed"|"all" }
 */
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      repo?: string;
      repos?: string[];
      dryRun?: boolean;
      perPage?: number;
      maxPages?: number;
      state?: "open" | "closed" | "all";
      sourceId?: string;
    };

    const targets =
      Array.isArray(body.repos) && body.repos.length > 0
        ? body.repos
        : body.repo
          ? [body.repo]
          : TARGET_GITHUB_REPOS.map((r) => `${r.owner}/${r.repo}`);

    if (targets.length > 10) {
      return NextResponse.json(
        { error: "Max 10 GitHub repo targets per request" },
        { status: 400 }
      );
    }

    const results = [];
    for (const repo of targets) {
      results.push(
        await ingestGitHubRepo({
          repo,
          dryRun: Boolean(body.dryRun),
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

    return NextResponse.json({
      success: errorCount === 0,
      summary: {
        ok: errorCount === 0,
        repoCount: results.length,
        totalPostsCollected: totalPosts,
        totalPainPoints: results.reduce((n, r) => n + r.painPointsExtracted, 0),
        errorCount,
        dryRun: Boolean(body.dryRun),
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
    defaultRepos: TARGET_GITHUB_REPOS.map((r) => ({
      owner: r.owner,
      repo: r.repo,
      sourceId: r.sourceId,
      url: `https://github.com/${r.owner}/${r.repo}/issues`,
    })),
    auth: "Optional GITHUB_TOKEN on App Service for higher rate limits; unauthenticated still works with lower quota.",
    usage: {
      POST: {
        description: "Trigger GitHub Issues ingestion (ADMIN_API_KEY required)",
        body: {
          repo: '"owner/repo" or github.com URL (optional if repos[] or defaults)',
          repos: 'string[] max 10',
          dryRun: "boolean — fetch only, no DB/AI writes (default false)",
          perPage: "1-100 (default 30)",
          maxPages: "1-5 (default 1)",
          state: '"open" | "closed" | "all" (default open)',
        },
      },
    },
    tosNotes:
      "GitHub REST API Terms apply. Prefer GITHUB_TOKEN. Honor rate-limit headers; do not scrape HTML.",
  });
}
