import { NextRequest, NextResponse } from "next/server";
import { loadSharedBrief } from "@/lib/load-shared-brief";

/**
 * GET /api/share/briefs?token=
 * Public JSON read of a Builder opportunity brief via signed share link (M3.1).
 * Human recipients should use /share/briefs?token= (HTML page).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const result = await loadSharedBrief(token, {
    viewPath: "/api/share/briefs",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, gate: result.gate },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    gate: "M3.1",
    format: "markdown",
    problemId: result.problemId,
    title: result.title,
    markdown: result.markdown,
    ideaCount: result.ideaCount,
    shareExpiresAt: result.shareExpiresAt,
  });
}
