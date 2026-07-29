import { NextRequest, NextResponse } from "next/server";
import { extractSessionToken, unauthorizedJson } from "@/lib/user-auth";
import { isNonEmptyId } from "@/lib/user-accounts";
import {
  getActivationForUserDb,
  listSavedProblemsDb,
  resolveSessionUser,
  saveProblemDb,
  unsaveProblemDb,
} from "@/lib/user-db";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();

    const data = await listSavedProblemsDb(user.userId);
    const activation = await getActivationForUserDb(user.userId);
    return NextResponse.json({ data, total: data.length, activation });
  } catch (error) {
    console.error("List saved problems failed:", error);
    return NextResponse.json(
      { error: "Could not list saved problems" },
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

    const { record, created } = await saveProblemDb(
      user.userId,
      body.painPointId.trim()
    );
    const activation = await getActivationForUserDb(user.userId);
    return NextResponse.json(
      { ok: true, created, saved: record, activation },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error("Save problem failed:", error);
    return NextResponse.json(
      { error: "Could not save problem" },
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

    const removed = await unsaveProblemDb(user.userId, painPointId);
    const activation = await getActivationForUserDb(user.userId);
    return NextResponse.json({ ok: true, removed, activation });
  } catch (error) {
    console.error("Unsave problem failed:", error);
    return NextResponse.json(
      { error: "Could not unsave problem" },
      { status: 503 }
    );
  }
}
