import { NextRequest, NextResponse } from "next/server";
import {
  getPainPointById,
  getProductIdeasForPainPoint,
} from "@/lib/db-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { painPointId } = body as { painPointId?: string };

    if (!painPointId || typeof painPointId !== "string") {
      return NextResponse.json(
        { error: "Request body must include a 'painPointId' string" },
        { status: 400 }
      );
    }

    const painPoint = await getPainPointById(painPointId);
    if (!painPoint) {
      return NextResponse.json(
        { error: `Pain point "${painPointId}" not found` },
        { status: 404 }
      );
    }

    const existingIdeas = await getProductIdeasForPainPoint(painPointId);

    if (existingIdeas.length > 0) {
      return NextResponse.json({
        painPointId,
        painPointTitle: painPoint.Title,
        ideas: existingIdeas,
        generatedAt: new Date().toISOString(),
      });
    }

    const fallbackIdeas = [
      {
        ProductIdeaId: `idea-gen-${painPointId}-1`,
        PainPointId: painPointId,
        Name: `${painPoint.Category} Automation Platform`,
        Description: `An automated solution that addresses "${painPoint.Title}" by providing real-time monitoring, alerting, and remediation workflows tailored to ${painPoint.Category.toLowerCase()} use cases.`,
        TargetCustomer: `IT teams and administrators dealing with ${painPoint.Category.toLowerCase()} challenges in mid-size organizations.`,
        MVPFeatures:
          "Real-time monitoring dashboard; Alert rules engine; One-click remediation actions; Integration with Teams/Slack; Weekly summary reports",
        DifficultyScore: 55,
        RevenuePotentialScore: 75,
        ExistingAlternatives:
          "Manual processes, enterprise tools (overpriced for mid-market), custom scripting",
        RecommendedFirstFeature:
          "Monitoring dashboard with configurable alert thresholds",
        CreatedAt: new Date().toISOString(),
      },
      {
        ProductIdeaId: `idea-gen-${painPointId}-2`,
        PainPointId: painPointId,
        Name: `${painPoint.Category} Insights & Reporting Tool`,
        Description: `A reporting and analytics tool that provides visibility into the root causes of "${painPoint.Title}", helping teams make data-driven decisions to prevent recurrence.`,
        TargetCustomer: `Managers and team leads responsible for ${painPoint.Category.toLowerCase()} operations who need clear reporting for stakeholders.`,
        MVPFeatures:
          "Automated data collection; Trend analysis dashboard; Root cause correlation; Exportable reports; Scheduled email digests",
        DifficultyScore: 42,
        RevenuePotentialScore: 65,
        ExistingAlternatives:
          "Spreadsheet-based tracking, vendor-native reporting (limited), BI tools (complex setup)",
        RecommendedFirstFeature:
          "Automated weekly report with trend visualization",
        CreatedAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      painPointId,
      painPointTitle: painPoint.Title,
      ideas: fallbackIdeas,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate product ideas" },
      { status: 500 }
    );
  }
}
