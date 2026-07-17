import { NextRequest, NextResponse } from "next/server";
import { insertConversionEventDb } from "@/lib/db-service";
import { isConversionEventName } from "@/lib/conversion-events";

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
