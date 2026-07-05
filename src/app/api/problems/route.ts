import { NextRequest, NextResponse } from "next/server";
import { listPainPoints } from "@/lib/db-service";
import type { TrendDirection } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10))
    );
    const search = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const minScore = searchParams.get("minScore")
      ? parseFloat(searchParams.get("minScore")!)
      : undefined;
    const maxScore = searchParams.get("maxScore")
      ? parseFloat(searchParams.get("maxScore")!)
      : undefined;
    const trend = searchParams.get("trend") as TrendDirection | null;
    const status = searchParams.get("status") ?? undefined;
    const sortBy = searchParams.get("sortBy") ?? "OpportunityScore";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const { data, total } = await listPainPoints({
      search,
      category,
      sourceType: source || undefined,
      minScore,
      maxScore,
      trend: trend || undefined,
      status,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ data, total, page, totalPages });
  } catch (error) {
    console.error("Failed to fetch problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch problems" },
      { status: 500 }
    );
  }
}
