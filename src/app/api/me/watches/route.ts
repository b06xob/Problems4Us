import { NextRequest, NextResponse } from "next/server";
import { extractSessionToken, unauthorizedJson } from "@/lib/user-auth";
import { isNonEmptyId } from "@/lib/user-accounts";
import { resolveSessionUser } from "@/lib/user-db";
import {
  listWatchedProblemsDb,
  unwatchProblemDb,
  watchProblemDb,
} from "@/lib/alerts-db";
import { getPainPointDetail } from "@/lib/db-service";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();
    const data = await listWatchedProblemsDb(user.userId);
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("List watches failed:", error);
    return NextResponse.json(
      { error: "Could not list watched problems" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();

    const body = (await request.json()) as { painPointId?: string };
    if (!isNonEmptyId(body.painPointId)) {
      return NextResponse.json(
        { error: "painPointId is required" },
        { status: 400 }
      );
    }
    const painPointId = body.painPointId.trim();
    const detail = await getPainPointDetail(painPointId);
    const scores = detail?.painPoint
      ? {
          opportunityScore: detail.painPoint.OpportunityScore,
          trendScore: detail.painPoint.TrendScore,
        }
      : undefined;

    const { record, created } = await watchProblemDb(
      user.userId,
      painPointId,
      scores
    );
    return NextResponse.json(
      { ok: true, created, watch: record },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error("Watch problem failed:", error);
    return NextResponse.json(
      { error: "Could not watch problem" },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();
    const painPointId =
      request.nextUrl.searchParams.get("painPointId")?.trim() || "";
    if (!isNonEmptyId(painPointId)) {
      return NextResponse.json(
        { error: "painPointId is required" },
        { status: 400 }
      );
    }
    const removed = await unwatchProblemDb(user.userId, painPointId);
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    console.error("Unwatch failed:", error);
    return NextResponse.json(
      { error: "Could not unwatch problem" },
      { status: 503 }
    );
  }
}
