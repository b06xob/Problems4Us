"use client";

import Link from "next/link";
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

const trendData = [
  { month: "Jul '25", problems: 620, mentions: 1850 },
  { month: "Aug '25", problems: 680, mentions: 2100 },
  { month: "Sep '25", problems: 710, mentions: 2280 },
  { month: "Oct '25", problems: 760, mentions: 2450 },
  { month: "Nov '25", problems: 805, mentions: 2680 },
  { month: "Dec '25", problems: 830, mentions: 2790 },
  { month: "Jan '26", problems: 890, mentions: 3050 },
  { month: "Feb '26", problems: 940, mentions: 3320 },
  { month: "Mar '26", problems: 1010, mentions: 3580 },
  { month: "Apr '26", problems: 1080, mentions: 3890 },
  { month: "May '26", problems: 1160, mentions: 4200 },
  { month: "Jun '26", problems: 1247, mentions: 4580 },
];

const categoryData = [
  { name: "Cloud Infrastructure", value: 320 },
  { name: "Identity & Access", value: 215 },
  { name: "Database Admin", value: 198 },
  { name: "Dev Tooling", value: 187 },
  { name: "Business Software", value: 165 },
  { name: "Support Operations", value: 162 },
];

const CATEGORY_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const severityDistribution = [
  { range: "0-20", count: 185 },
  { range: "21-40", count: 290 },
  { range: "41-60", count: 345 },
  { range: "61-80", count: 265 },
  { range: "81-100", count: 162 },
];

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

const topOpportunities = [
  { id: "prob-001", title: "Azure Reserved Instance Cost Surprises", score: 92, trend: "up" as const, category: "Cloud Infrastructure", change: "+5" },
  { id: "prob-002", title: "SSO Integration Timeout Failures", score: 88, trend: "up" as const, category: "Identity & Access", change: "+3" },
  { id: "prob-003", title: "Postgres Connection Pool Exhaustion", score: 85, trend: "stable" as const, category: "Database Admin", change: "0" },
  { id: "prob-004", title: "CI/CD Pipeline Flaky Test Loops", score: 82, trend: "up" as const, category: "Dev Tooling", change: "+7" },
  { id: "prob-005", title: "Salesforce API Rate Limiting", score: 79, trend: "down" as const, category: "Business Software", change: "-2" },
  { id: "prob-006", title: "Kubernetes Node Auto-scaling Lag", score: 76, trend: "up" as const, category: "Cloud Infrastructure", change: "+4" },
  { id: "prob-007", title: "Zendesk Ticket Routing Misclassification", score: 74, trend: "stable" as const, category: "Support Operations", change: "0" },
  { id: "prob-008", title: "MongoDB Sharding Hotspot Imbalance", score: 71, trend: "down" as const, category: "Database Admin", change: "-1" },
];

export default function DashboardPage() {
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
          value="1,247"
          subtitle="Across 6 sources"
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          }
        />
        <StatCard
          title="New This Week"
          value={38}
          trend={{ value: "+12%", positive: true }}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <StatCard
          title="Top Trending"
          value="Azure RI Costs"
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
        <StatCard
          title="Highest WTP"
          value={92}
          icon={
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <StatCard
          title="Clusters"
          value={43}
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
          value={7}
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
            <LineChart data={trendData}>
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
            <BarChart data={severityDistribution}>
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
                {severityDistribution.map((entry, index) => (
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
            {topOpportunities.map((item, index) => (
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
