import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { listPainPoints } from "@/lib/db-service";
import {
  ensureAlertTables,
  listWatchedProblemsDb,
  recordScoreMoveAlertDb,
  type AlertEventRecord,
} from "@/lib/alerts-db";
import { query } from "@/lib/db";

/**
 * Admin: evaluate all watches (or one user) and emit in-app score-change alerts.
 * POST { userId?: string, painPointId?: string, forceDelta?: number }
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    await ensureAlertTables();
    const body = (await request.json().catch(() => ({}))) as {
      userId?: string;
      painPointId?: string;
      forceDelta?: number;
    };

    let watches;
    if (body.userId) {
      watches = await listWatchedProblemsDb(body.userId);
      if (body.painPointId) {
        watches = watches.filter((w) => w.PainPointId === body.painPointId);
      }
    } else {
      const rows = await query<{
        WatchId: string;
        UserId: string;
        PainPointId: string;
        LastOpportunityScore: number | null;
        LastTrendScore: number | null;
        CreatedAt: Date | string;
        UpdatedAt: Date | string;
      }>(
        body.painPointId
          ? `SELECT WatchId, UserId, PainPointId, LastOpportunityScore, LastTrendScore, CreatedAt, UpdatedAt
             FROM WatchedProblems WHERE PainPointId = @painPointId`
          : `SELECT WatchId, UserId, PainPointId, LastOpportunityScore, LastTrendScore, CreatedAt, UpdatedAt
             FROM WatchedProblems`,
        body.painPointId ? { painPointId: body.painPointId } : undefined
      );
      watches = rows.map((r) => ({
        WatchId: r.WatchId,
        UserId: r.UserId,
        PainPointId: r.PainPointId,
        LastOpportunityScore: r.LastOpportunityScore,
        LastTrendScore: r.LastTrendScore,
        CreatedAt:
          typeof r.CreatedAt === "string"
            ? r.CreatedAt
            : r.CreatedAt.toISOString(),
        UpdatedAt:
          typeof r.UpdatedAt === "string"
            ? r.UpdatedAt
            : r.UpdatedAt.toISOString(),
      }));
    }

    const { data: painPoints } = await listPainPoints({
      page: 1,
      limit: 100,
      sortBy: "OpportunityScore",
      sortOrder: "desc",
    });
    const scoreById = new Map(
      painPoints.map((p) => [
        p.PainPointId,
        {
          opportunityScore: p.OpportunityScore,
          trendScore: p.TrendScore,
        },
      ])
    );

    const emitted: AlertEventRecord[] = [];
    let checked = 0;

    for (const watch of watches) {
      checked += 1;
      const scores = scoreById.get(watch.PainPointId);
      if (!scores) continue;

      const prior = watch.LastOpportunityScore;
      let next = scores.opportunityScore;
      if (
        typeof body.forceDelta === "number" &&
        Number.isFinite(body.forceDelta) &&
        prior !== null
      ) {
        next = prior + body.forceDelta;
      }

      const alert = await recordScoreMoveAlertDb({
        userId: watch.UserId,
        painPointId: watch.PainPointId,
        priorScore: prior,
        newScore: next,
        trendScore: scores.trendScore,
      });
      if (alert) emitted.push(alert);
    }

    return NextResponse.json({
      ok: true,
      checked,
      emitted: emitted.length,
      alerts: emitted,
    });
  } catch (error) {
    console.error("Evaluate alerts failed:", error);
    return NextResponse.json(
      { error: "Could not evaluate alerts" },
      { status: 503 }
    );
  }
}
