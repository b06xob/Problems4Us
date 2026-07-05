import { NextRequest, NextResponse } from "next/server";
import { getPainPointDetail } from "@/lib/db-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getPainPointDetail(id);

    if (!detail) {
      return NextResponse.json(
        { error: `Pain point "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      painPoint: detail.painPoint,
      aiExplanation: detail.aiExplanation,
      sourceExamples: detail.sourceExamples,
      similarComplaints: detail.similarComplaints,
      productIdeas: detail.productIdeas,
      targetCustomers: detail.targetCustomers,
      monetizationIdeas: detail.monetizationIdeas,
      competitiveNotes: detail.competitiveNotes,
      trendHistory: detail.trendHistory,
      nextSteps: detail.nextSteps,
    });
  } catch (error) {
    console.error("Failed to fetch pain point detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch pain point detail" },
      { status: 500 }
    );
  }
}
