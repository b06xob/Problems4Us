import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  createWaitlistEntryDb,
  countWaitlistEntriesDb,
  listWaitlistEntriesDb,
  insertConversionEventDb,
} from "@/lib/db-service";
import {
  isValidEmail,
  normalizeEmail,
  parseWaitlistSource,
} from "@/lib/waitlist";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = request.nextUrl;
    if (searchParams.get("countOnly") === "1") {
      const total = await countWaitlistEntriesDb();
      return NextResponse.json({ total });
    }

    const data = await listWaitlistEntriesDb();
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("Failed to list waitlist:", error);
    return NextResponse.json(
      { error: "Failed to list waitlist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      source?: string;
    };

    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const source = parseWaitlistSource(body.source);
    const { entry, created } = await createWaitlistEntryDb(email, source);

    try {
      await insertConversionEventDb(
        created ? "waitlist_success" : "waitlist_submit",
        "/api/waitlist",
        { source, created, emailDomain: email.split("@")[1] ?? "" }
      );
    } catch (trackErr) {
      console.error("Waitlist conversion track failed:", trackErr);
    }

    return NextResponse.json(
      {
        ok: true,
        created,
        message: created
          ? "You are on the early-access waitlist."
          : "You were already on the waitlist.",
        emailDomain: email.split("@")[1] ?? "",
        waitlistId: entry.WaitlistId,
      },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error("Failed to join waitlist:", error);
    return NextResponse.json(
      {
        error:
          "Could not save waitlist signup. Database may be unavailable — try again shortly.",
      },
      { status: 503 }
    );
  }
}
