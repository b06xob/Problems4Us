import { NextResponse } from "next/server";
import {
  getMockDashboardStats,
  getMockPainPoints,
} from "@/lib/mock-data";

export async function GET() {
  try {
    const stats = getMockDashboardStats();
    const painPoints = getMockPainPoints();

    const trendData = [
      { month: "Jul 2025", problems: 820, mentions: 3200 },
      { month: "Aug 2025", problems: 856, mentions: 3450 },
      { month: "Sep 2025", problems: 890, mentions: 3680 },
      { month: "Oct 2025", problems: 924, mentions: 3900 },
      { month: "Nov 2025", problems: 978, mentions: 4150 },
      { month: "Dec 2025", problems: 1015, mentions: 4380 },
      { month: "Jan 2026", problems: 1052, mentions: 4620 },
      { month: "Feb 2026", problems: 1098, mentions: 4900 },
      { month: "Mar 2026", problems: 1130, mentions: 5100 },
      { month: "Apr 2026", problems: 1165, mentions: 5350 },
      { month: "May 2026", problems: 1210, mentions: 5580 },
      { month: "Jun 2026", problems: 1247, mentions: 5820 },
    ];

    const categoryMap = new Map<string, number>();
    for (const pp of painPoints) {
      categoryMap.set(pp.Category, (categoryMap.get(pp.Category) ?? 0) + 1);
    }
    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([name, count]) => ({ name, count })
    );

    const severityDistribution = [
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
    ];
    for (const pp of painPoints) {
      const score = pp.SeverityScore;
      if (score <= 20) severityDistribution[0].count++;
      else if (score <= 40) severityDistribution[1].count++;
      else if (score <= 60) severityDistribution[2].count++;
      else if (score <= 80) severityDistribution[3].count++;
      else severityDistribution[4].count++;
    }

    return NextResponse.json({
      totalProblems: stats.TotalProblems,
      newThisWeek: stats.NewThisWeek,
      topTrending: stats.TopTrending,
      highestWTP: stats.HighestWTP,
      clusterCount: stats.ClusterCount,
      emergingAlerts: stats.EmergingAlerts,
      trendData,
      categoryBreakdown,
      severityDistribution,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
