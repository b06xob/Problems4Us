import { NextRequest, NextResponse } from "next/server";
import { getMockPainPoints } from "@/lib/mock-data";
import type { PainPoint, TrendDirection } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10))
    );
    const search = searchParams.get("search")?.toLowerCase();
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const minScore = searchParams.get("minScore")
      ? parseFloat(searchParams.get("minScore")!)
      : undefined;
    const maxScore = searchParams.get("maxScore")
      ? parseFloat(searchParams.get("maxScore")!)
      : undefined;
    const trend = searchParams.get("trend") as TrendDirection | null;
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") ?? "OpportunityScore";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    let results: PainPoint[] = getMockPainPoints();

    if (search) {
      results = results.filter(
        (pp) =>
          pp.Title.toLowerCase().includes(search) ||
          pp.Summary.toLowerCase().includes(search) ||
          pp.Category.toLowerCase().includes(search)
      );
    }

    if (category) {
      results = results.filter((pp) => pp.Category === category);
    }

    if (source) {
      results = results.filter((pp) =>
        pp.PainPointId.toLowerCase().includes(source.toLowerCase())
      );
    }

    if (minScore !== undefined) {
      results = results.filter((pp) => pp.OpportunityScore >= minScore);
    }
    if (maxScore !== undefined) {
      results = results.filter((pp) => pp.OpportunityScore <= maxScore);
    }

    if (trend) {
      results = results.filter((pp) => {
        if (trend === "up") return pp.TrendScore >= 65;
        if (trend === "down") return pp.TrendScore <= 45;
        return pp.TrendScore > 45 && pp.TrendScore < 65;
      });
    }

    if (status) {
      results = results.filter((pp) => pp.Status === status);
    }

    const validSortFields: (keyof PainPoint)[] = [
      "OpportunityScore",
      "SeverityScore",
      "FrequencyScore",
      "WillingnessToPayScore",
      "TrendScore",
      "MarketSizeScore",
      "Title",
      "LastSeenAt",
      "FirstSeenAt",
    ];
    const sortField = validSortFields.includes(sortBy as keyof PainPoint)
      ? (sortBy as keyof PainPoint)
      : "OpportunityScore";

    results.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    });

    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = results.slice(start, start + limit);

    return NextResponse.json({ data, total, page, totalPages });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch problems" },
      { status: 500 }
    );
  }
}
