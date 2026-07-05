import { NextRequest, NextResponse } from "next/server";
import { listProductIdeas } from "@/lib/db-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const search = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const sortBy = searchParams.get("sortBy") ?? "RevenuePotentialScore";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const results = await listProductIdeas({
      search,
      category,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ data: results, total: results.length });
  } catch (error) {
    console.error("Failed to fetch product ideas:", error);
    return NextResponse.json(
      { error: "Failed to fetch product ideas" },
      { status: 500 }
    );
  }
}
