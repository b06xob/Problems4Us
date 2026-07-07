import { NextRequest, NextResponse } from "next/server";
import {
  listSources,
  createSource,
} from "@/lib/db-service";
import type { SourceType } from "@/lib/types";

export async function GET() {
  try {
    const data = await listSources();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch sources:", error);
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
      "community",
    ];
    if (!validTypes.includes(sourceType)) {
      return NextResponse.json(
        { error: `Invalid SourceType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const newSource = await createSource({
      SourceType: sourceType,
      SourceName,
      SourceUrl,
    });

    return NextResponse.json(newSource, { status: 201 });
  } catch (error) {
    console.error("Failed to create source:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}
