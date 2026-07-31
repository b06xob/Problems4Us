import { NextRequest, NextResponse } from "next/server";
import { extractSessionToken, unauthorizedJson } from "@/lib/user-auth";
import { isNonEmptyId } from "@/lib/user-accounts";
import { resolveSessionUser } from "@/lib/user-db";
import {
  listWatchedProblemsDb,
  normalizeAlertFrequency,
  unwatchProblemDb,
  updateWatchPreferencesDb,
  watchProblemDb,
  type AlertFrequency,
} from "@/lib/alerts-db";
import { listPainPoints } from "@/lib/db-service";

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
    let scores: { opportunityScore?: number; trendScore?: number } | undefined;
    try {
      const { data } = await listPainPoints({ page: 1, limit: 100 });
      const match = data.find((p) => p.PainPointId === painPointId);
      if (match) {
        scores = {
          opportunityScore: match.OpportunityScore,
          trendScore: match.TrendScore,
        };
      }
    } catch (lookupErr) {
      console.error("Watch: optional score lookup failed:", lookupErr);
    }

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

/**
 * PATCH { painPointId, muted?, frequency?, mutedUntil? }
 * Update mute / alert frequency preferences (problems4us-10c).
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();

    const body = (await request.json()) as {
      painPointId?: string;
      muted?: boolean;
      frequency?: string;
      mutedUntil?: string | null;
    };
    if (!isNonEmptyId(body.painPointId)) {
      return NextResponse.json(
        { error: "painPointId is required" },
        { status: 400 }
      );
    }

    let frequency: AlertFrequency | undefined;
    if (body.frequency !== undefined) {
      const parsed = normalizeAlertFrequency(body.frequency);
      if (!parsed) {
        return NextResponse.json(
          {
            error:
              "frequency must be one of: immediate, daily, weekly, muted",
          },
          { status: 400 }
        );
      }
      frequency = parsed;
    }

    if (
      body.mutedUntil !== undefined &&
      body.mutedUntil !== null &&
      Number.isNaN(Date.parse(body.mutedUntil))
    ) {
      return NextResponse.json(
        { error: "mutedUntil must be an ISO timestamp or null" },
        { status: 400 }
      );
    }

    const watch = await updateWatchPreferencesDb({
      userId: user.userId,
      painPointId: body.painPointId.trim(),
      muted: body.muted,
      frequency: frequency || undefined,
      mutedUntil: body.mutedUntil,
    });
    if (!watch) {
      return NextResponse.json({ error: "Watch not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, watch });
  } catch (error) {
    console.error("Update watch preferences failed:", error);
    return NextResponse.json(
      { error: "Could not update watch preferences" },
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
