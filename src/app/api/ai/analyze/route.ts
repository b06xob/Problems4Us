import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body as { text?: string };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'text' field" },
        { status: 400 }
      );
    }

    const lowerText = text.toLowerCase();

    const painPoints = [];

    if (lowerText.includes("cost") || lowerText.includes("bill") || lowerText.includes("expensive")) {
      painPoints.push({
        title: "Unexpected cloud cost overruns",
        severity: 82,
        frequency: 88,
        willingnessToPay: 91,
        category: "Cloud Cost Management",
        snippet: text.slice(0, 200),
      });
    }

    if (lowerText.includes("slow") || lowerText.includes("performance") || lowerText.includes("latency")) {
      painPoints.push({
        title: "Application performance degradation",
        severity: 76,
        frequency: 72,
        willingnessToPay: 78,
        category: "Performance Monitoring",
        snippet: text.slice(0, 200),
      });
    }

    if (lowerText.includes("error") || lowerText.includes("fail") || lowerText.includes("broken")) {
      painPoints.push({
        title: "Recurring system reliability issues",
        severity: 80,
        frequency: 68,
        willingnessToPay: 74,
        category: "System Reliability",
        snippet: text.slice(0, 200),
      });
    }

    if (lowerText.includes("security") || lowerText.includes("breach") || lowerText.includes("vulnerability")) {
      painPoints.push({
        title: "Security vulnerability management gaps",
        severity: 92,
        frequency: 55,
        willingnessToPay: 88,
        category: "Security & Compliance",
        snippet: text.slice(0, 200),
      });
    }

    if (lowerText.includes("support") || lowerText.includes("ticket") || lowerText.includes("help desk")) {
      painPoints.push({
        title: "Inefficient support ticket handling",
        severity: 68,
        frequency: 82,
        willingnessToPay: 76,
        category: "Customer Support",
        snippet: text.slice(0, 200),
      });
    }

    if (painPoints.length === 0) {
      painPoints.push({
        title: "General user frustration with current tooling",
        severity: 60,
        frequency: 65,
        willingnessToPay: 55,
        category: "General",
        snippet: text.slice(0, 200),
      });
    }

    const summary =
      painPoints.length === 1
        ? `Identified 1 pain point from the provided text, categorized under "${painPoints[0].category}".`
        : `Identified ${painPoints.length} pain points from the provided text, spanning ${[...new Set(painPoints.map((p) => p.category))].join(", ")}.`;

    return NextResponse.json({ painPoints, summary });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}
