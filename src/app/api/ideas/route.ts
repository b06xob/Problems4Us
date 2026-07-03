import { NextRequest, NextResponse } from "next/server";
import { getMockProductIdeas } from "@/lib/mock-data";
import type { ProductIdea } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const search = searchParams.get("search")?.toLowerCase();
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") ?? "RevenuePotentialScore";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    let results: ProductIdea[] = getMockProductIdeas();

    if (search) {
      results = results.filter(
        (idea) =>
          idea.Name.toLowerCase().includes(search) ||
          idea.Description.toLowerCase().includes(search) ||
          idea.TargetCustomer.toLowerCase().includes(search)
      );
    }

    if (category) {
      const painPointsByCategory = new Set(
        results
          .filter((idea) =>
            idea.Name.toLowerCase().includes(category.toLowerCase()) ||
            idea.Description.toLowerCase().includes(category.toLowerCase())
          )
          .map((idea) => idea.ProductIdeaId)
      );
      if (painPointsByCategory.size > 0) {
        results = results.filter((idea) =>
          painPointsByCategory.has(idea.ProductIdeaId)
        );
      }
    }

    const validSortFields: (keyof ProductIdea)[] = [
      "RevenuePotentialScore",
      "DifficultyScore",
      "Name",
      "CreatedAt",
    ];
    const sortField = validSortFields.includes(sortBy as keyof ProductIdea)
      ? (sortBy as keyof ProductIdea)
      : "RevenuePotentialScore";

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

    return NextResponse.json({ data: results, total: results.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch product ideas" },
      { status: 500 }
    );
  }
}
