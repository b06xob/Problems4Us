import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/db-service";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json({
      totalProblems: data.TotalProblems,
      newThisWeek: data.NewThisWeek,
      topTrending: data.TopTrending,
      highestWTP: data.HighestWTP,
      clusterCount: data.ClusterCount,
      emergingAlerts: data.EmergingAlerts,
      trendData: data.trendData,
      categoryBreakdown: data.categoryBreakdown,
      severityDistribution: data.severityDistribution,
      topOpportunities: data.topOpportunities,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
