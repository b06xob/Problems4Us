"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { TrendIndicator } from "@/components/ui/TrendIndicator";

const CATEGORY_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

interface DashboardData {
  totalProblems: number;
  newThisWeek: number;
  topTrending: string;
  highestWTP: number;
  clusterCount: number;
  emergingAlerts: number;
  trendData: { month: string; problems: number; mentions: number }[];
  categoryBreakdown: { name: string; count: number }[];
  severityDistribution: { range: string; count: number }[];
  topOpportunities: {
    id: string;
    title: string;
    score: number;
    trend: "up" | "down" | "stable";
    category: string;
  }[];
}

function getSeverityColor(range: string) {
  switch (range) {
    case "0-20":
      return "#22c55e";
    case "21-40":
      return "#84cc16";
    case "41-60":
      return "#f59e0b";
    case "61-80":
      return "#f97316";
    case "81-100":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-text-secondary">Loading dashboard data…</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const categoryData = data.categoryBreakdown.map((c) => ({
    name: c.name,
    value: c.count,
  }));

  const trendingShort = data.topTrending.length > 24
    ? data.topTrending.slice(0, 22) + "…"
    : data.topTrending;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-text-secondary">
          Real-time overview of discovered pain points and opportunities
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Problems"
          value={data.totalProblems.toLocaleString()}
          subtitle="From database"
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          }
        />
        <StatCard
          title="New This Week"
          value={data.newThisWeek}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <StatCard
          title="Top Trending"
          value={trendingShort}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
        <StatCard
          title="Highest WTP"
          value={data.highestWTP}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <StatCard
          title="Clusters"
          value={data.clusterCount}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="5" r="2" />
              <circle cx="19" cy="19" r="2" />
              <circle cx="5" cy="19" r="2" />
              <path d="M14.5 10l3-3.5M9.5 10l-3-3.5M14.5 14l3 3.5M9.5 14l-3 3.5" />
            </svg>
          }
        />
        <StatCard
          title="Emerging Alerts"
          value={data.emergingAlerts}
          subtitle="Needs attention"
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          }
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Line Chart */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Pain Points Over Time
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="var(--color-text-secondary, #6b7280)"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="var(--color-text-secondary, #6b7280)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface, #fff)",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="problems"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="Problems"
              />
              <Line
                type="monotone"
                dataKey="mentions"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Mentions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Problems by Category
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface, #fff)",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconSize={10}
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Bar Chart */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Severity Distribution
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.severityDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 12 }}
                stroke="var(--color-text-secondary, #6b7280)"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="var(--color-text-secondary, #6b7280)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface, #fff)",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.severityDistribution.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={getSeverityColor(entry.range)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Opportunity Leaderboard */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Opportunity Leaderboard
            </h2>
            <Link href="/problems" className="btn-secondary text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-1">
            {data.topOpportunities.map((item, index) => (
              <Link
                key={item.id}
                href={`/problems/${item.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-alt"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-secondary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {item.title}
                  </p>
                  <span className="text-xs text-text-secondary">
                    {item.category}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ScoreBadge score={item.score} size="sm" />
                  <TrendIndicator direction={item.trend} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
