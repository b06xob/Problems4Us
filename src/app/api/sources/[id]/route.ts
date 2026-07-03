import { NextRequest, NextResponse } from "next/server";
import { getMockSources } from "@/lib/mock-data";
import type { Source } from "@/lib/types";

const mutableSources: Source[] = [...getMockSources()];

function findSource(id: string): Source | undefined {
  return mutableSources.find((s) => s.SourceId === id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const source = findSource(id);

    if (!source) {
      return NextResponse.json(
        { error: `Source "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(source);
  } catch {
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
    const index = mutableSources.findIndex((s) => s.SourceId === id);

    if (index === -1) {
      return NextResponse.json(
        { error: `Source "${id}" not found` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedFields: (keyof Source)[] = [
      "SourceName",
      "SourceUrl",
      "IsActive",
    ];

    for (const key of Object.keys(body)) {
      if (allowedFields.includes(key as keyof Source)) {
        (mutableSources[index] as unknown as Record<string, unknown>)[key] = body[key];
      }
    }

    return NextResponse.json(mutableSources[index]);
  } catch {
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
    const index = mutableSources.findIndex((s) => s.SourceId === id);

    if (index === -1) {
      return NextResponse.json(
        { error: `Source "${id}" not found` },
        { status: 404 }
      );
    }

    const [deleted] = mutableSources.splice(index, 1);

    return NextResponse.json({
      message: `Source "${deleted.SourceName}" deleted`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    );
  }
}
