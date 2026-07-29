import { NextRequest, NextResponse } from "next/server";
import { extractSessionToken, unauthorizedJson } from "@/lib/user-auth";
import { isNonEmptyId } from "@/lib/user-accounts";
import {
  getActivationForUserDb,
  listSavedIdeasDb,
  resolveSessionUser,
  saveIdeaDb,
  unsaveIdeaDb,
} from "@/lib/user-db";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();

    const data = await listSavedIdeasDb(user.userId);
    const activation = await getActivationForUserDb(user.userId);
    return NextResponse.json({ data, total: data.length, activation });
  } catch (error) {
    console.error("List saved ideas failed:", error);
    return NextResponse.json(
      { error: "Could not list saved ideas" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();

    const body = (await request.json()) as { productIdeaId?: string };
    if (!isNonEmptyId(body.productIdeaId)) {
      return NextResponse.json(
        { error: "productIdeaId is required" },
        { status: 400 }
      );
    }

    const { record, created } = await saveIdeaDb(
      user.userId,
      body.productIdeaId.trim()
    );
    const activation = await getActivationForUserDb(user.userId);
    return NextResponse.json(
      { ok: true, created, saved: record, activation },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error("Save idea failed:", error);
    return NextResponse.json(
      { error: "Could not save idea" },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await resolveSessionUser(extractSessionToken(request));
    if (!user) return unauthorizedJson();

    const productIdeaId =
      request.nextUrl.searchParams.get("productIdeaId")?.trim() || "";
    if (!isNonEmptyId(productIdeaId)) {
      return NextResponse.json(
        { error: "productIdeaId is required" },
        { status: 400 }
      );
    }

    const removed = await unsaveIdeaDb(user.userId, productIdeaId);
    const activation = await getActivationForUserDb(user.userId);
    return NextResponse.json({ ok: true, removed, activation });
  } catch (error) {
    console.error("Unsave idea failed:", error);
    return NextResponse.json(
      { error: "Could not unsave idea" },
      { status: 503 }
    );
  }
}
