import { NextRequest, NextResponse } from "next/server";
import { getMockSources } from "@/lib/mock-data";
import type { Source, SourceType } from "@/lib/types";

const mutableSources: Source[] = [...getMockSources()];

export async function GET() {
  try {
    return NextResponse.json({ data: mutableSources });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { SourceType: sourceType, SourceName, SourceUrl } = body as {
      SourceType?: SourceType;
      SourceName?: string;
      SourceUrl?: string;
    };

    if (!sourceType || !SourceName || !SourceUrl) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: SourceType, SourceName, SourceUrl",
        },
        { status: 400 }
      );
    }

    const validTypes: SourceType[] = [
      "reddit",
      "github",
      "forum",
      "review",
      "social",
    ];
    if (!validTypes.includes(sourceType)) {
      return NextResponse.json(
        { error: `Invalid SourceType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const newSource: Source = {
      SourceId: `src-${sourceType}-${Date.now()}`,
      SourceType: sourceType,
      SourceName,
      SourceUrl,
      IsActive: true,
      CreatedAt: new Date().toISOString(),
    };

    mutableSources.push(newSource);

    return NextResponse.json(newSource, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}
