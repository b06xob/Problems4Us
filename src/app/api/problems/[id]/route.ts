import { NextRequest, NextResponse } from "next/server";
import {
  getMockPainPointDetail,
  getMockTrendSnapshots,
} from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = getMockPainPointDetail(id);

    if (!detail) {
      return NextResponse.json(
        { error: `Pain point "${id}" not found` },
        { status: 404 }
      );
    }

    const trendHistory = getMockTrendSnapshots().filter(
      (ts) => ts.PainPointId === id
    );

    return NextResponse.json({
      painPoint: detail.painPoint,
      aiExplanation: detail.aiExplanation,
      sourceExamples: detail.sourceExamples,
      similarComplaints: detail.similarComplaints,
      productIdeas: detail.suggestedProductIdeas,
      targetCustomers: detail.targetCustomers,
      monetizationIdeas: detail.monetizationIdeas,
      competitiveNotes: detail.competitiveNotes,
      trendHistory,
      nextSteps: detail.recommendedNextSteps,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch pain point detail" },
      { status: 500 }
    );
  }
}
