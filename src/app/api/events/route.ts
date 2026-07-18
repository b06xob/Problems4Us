import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  insertConversionEventDb,
  summarizeConversionEventsDb,
} from "@/lib/db-service";
import { isConversionEventName } from "@/lib/conversion-events";

/** Public write path for client funnel instrumentation (no PII). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      eventName?: string;
      path?: string;
      props?: Record<string, unknown>;
    };

    if (!isConversionEventName(body.eventName)) {
      return NextResponse.json(
        { error: "Invalid eventName" },
        { status: 400 }
      );
    }

    const path =
      typeof body.path === "string" && body.path.length > 0
        ? body.path.slice(0, 500)
        : "/";
    const props =
      body.props && typeof body.props === "object" && !Array.isArray(body.props)
        ? body.props
        : {};

    // Strip any accidental PII keys from client props.
    const safeProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (/email|password|token|secret|key/i.test(key)) continue;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        safeProps[key] = typeof value === "string" ? value.slice(0, 200) : value;
      }
    }

    await insertConversionEventDb(body.eventName, path, safeProps);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record conversion event:", error);
    // Analytics must not break UX — acknowledge soft failure.
    return NextResponse.json({ ok: false, deferred: true }, { status: 202 });
  }
}

/**
 * Owner funnel summary (M1.4 / M1.5).
 * GET /api/events?summary=1&hours=24  — requires ADMIN_API_KEY
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const hoursParam = request.nextUrl.searchParams.get("hours");
    const sinceHours = hoursParam ? Number(hoursParam) : 24;
    const summary = await summarizeConversionEventsDb(sinceHours);
    return NextResponse.json({
      ok: true,
      sinceHours: summary.sinceHours,
      counts: summary.counts,
    });
  } catch (error) {
    console.error("Failed to summarize conversion events:", error);
    return NextResponse.json(
      { error: "Failed to summarize conversion events" },
      { status: 500 }
    );
  }
}
