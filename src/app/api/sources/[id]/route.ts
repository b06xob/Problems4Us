import { NextRequest, NextResponse } from "next/server";
import {
  getSourceById,
  updateSource,
  deleteSource,
} from "@/lib/db-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const source = await getSourceById(id);

    if (!source) {
      return NextResponse.json(
        { error: `Source "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error("Failed to fetch source:", error);
    return NextResponse.json(
      { error: "Failed to fetch source" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Partial<Pick<import("@/lib/types").Source, "SourceName" | "SourceUrl" | "IsActive">> = {};

    if ("SourceName" in body) updates.SourceName = body.SourceName;
    if ("SourceUrl" in body) updates.SourceUrl = body.SourceUrl;
    if ("IsActive" in body) updates.IsActive = body.IsActive;

    const updated = await updateSource(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: `Source "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update source:", error);
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteSource(id);

    if (!deleted) {
      return NextResponse.json(
        { error: `Source "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: `Source "${id}" deleted` });
  } catch (error) {
    console.error("Failed to delete source:", error);
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    );
  }
}
