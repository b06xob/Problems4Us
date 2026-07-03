"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { EmptyState } from "@/components/ui/EmptyState";

interface PainPoint {
  PainPointId: string;
  Title: string;
  Summary: string;
  Category: string;
  SeverityScore: number;
  FrequencyScore: number;
  WillingnessToPayScore: number;
  MarketSizeScore: number;
  TrendScore: number;
  OpportunityScore: number;
  FirstSeenAt: string;
  LastSeenAt: string;
  Status: "active" | "resolved" | "monitoring";
  SourceType: string;
  TrendDirection: "up" | "down" | "stable";
}

const PAIN_POINTS: PainPoint[] = [
  {
    PainPointId: "pp-1",
    Title: "Unexpected Azure spend spikes from idle resources",
    Summary:
      "Teams frequently leave VMs, storage accounts, and App Service plans running over weekends and holidays, causing 30-60% budget overruns.",
    Category: "Cloud Infrastructure",
    SeverityScore: 88,
    FrequencyScore: 92,
    WillingnessToPayScore: 75,
    MarketSizeScore: 90,
    TrendScore: 85,
    OpportunityScore: 86,
    FirstSeenAt: "2025-03-10",
    LastSeenAt: "2026-06-28",
    Status: "active",
    SourceType: "reddit",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-2",
    Title: "No unified Azure cost dashboard across subscriptions",
    Summary:
      "Enterprises with 10+ subscriptions struggle to get a single-pane cost view. Azure Cost Management lacks cross-tenant aggregation.",
    Category: "Cloud Infrastructure",
    SeverityScore: 72,
    FrequencyScore: 68,
    WillingnessToPayScore: 80,
    MarketSizeScore: 85,
    TrendScore: 60,
    OpportunityScore: 73,
    FirstSeenAt: "2025-06-15",
    LastSeenAt: "2026-06-20",
    Status: "active",
    SourceType: "github",
    TrendDirection: "stable",
  },
  {
    PainPointId: "pp-3",
    Title: "Azure Reserved Instance recommendations are unreliable",
    Summary:
      "Cost-saving recommendations often suggest reservations for workloads with unpredictable demand, leading to wasted commitments.",
    Category: "Cloud Infrastructure",
    SeverityScore: 65,
    FrequencyScore: 55,
    WillingnessToPayScore: 70,
    MarketSizeScore: 78,
    TrendScore: 45,
    OpportunityScore: 63,
    FirstSeenAt: "2025-09-01",
    LastSeenAt: "2026-05-14",
    Status: "monitoring",
    SourceType: "forum",
    TrendDirection: "down",
  },
  {
    PainPointId: "pp-4",
    Title: "SQL Server index maintenance causes production downtime",
    Summary:
      "Rebuilding fragmented indexes on large tables locks rows for hours. DBAs need zero-downtime reindexing that works with Standard Edition.",
    Category: "Database Admin",
    SeverityScore: 91,
    FrequencyScore: 78,
    WillingnessToPayScore: 85,
    MarketSizeScore: 72,
    TrendScore: 70,
    OpportunityScore: 79,
    FirstSeenAt: "2025-01-20",
    LastSeenAt: "2026-07-01",
    Status: "active",
    SourceType: "reddit",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-5",
    Title: "No simple way to track SQL Server query performance regressions",
    Summary:
      "After patching or schema changes, teams lack automated regression detection. Query Store is too complex for small shops.",
    Category: "Database Admin",
    SeverityScore: 67,
    FrequencyScore: 74,
    WillingnessToPayScore: 60,
    MarketSizeScore: 65,
    TrendScore: 55,
    OpportunityScore: 64,
    FirstSeenAt: "2025-05-12",
    LastSeenAt: "2026-06-10",
    Status: "active",
    SourceType: "forum",
    TrendDirection: "stable",
  },
  {
    PainPointId: "pp-6",
    Title: "SQL Server backup verification is manual and error-prone",
    Summary:
      "Most teams only discover corrupted backups during disaster recovery. Automated restore-and-verify solutions are expensive or complex.",
    Category: "Database Admin",
    SeverityScore: 82,
    FrequencyScore: 45,
    WillingnessToPayScore: 90,
    MarketSizeScore: 68,
    TrendScore: 40,
    OpportunityScore: 65,
    FirstSeenAt: "2025-04-08",
    LastSeenAt: "2026-04-22",
    Status: "monitoring",
    SourceType: "review",
    TrendDirection: "stable",
  },
  {
    PainPointId: "pp-7",
    Title: "M365 license utilization reports are inaccurate",
    Summary:
      "Built-in reports undercount actual usage by ignoring mobile and Teams activity. Companies overpay for licenses they could reclaim.",
    Category: "Business Software",
    SeverityScore: 70,
    FrequencyScore: 82,
    WillingnessToPayScore: 78,
    MarketSizeScore: 92,
    TrendScore: 72,
    OpportunityScore: 79,
    FirstSeenAt: "2025-02-18",
    LastSeenAt: "2026-06-30",
    Status: "active",
    SourceType: "reddit",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-8",
    Title: "SharePoint storage consumption hard to attribute to departments",
    Summary:
      "Large organizations cannot easily see which department or team consumes the most SharePoint storage, making chargeback impossible.",
    Category: "Business Software",
    SeverityScore: 55,
    FrequencyScore: 63,
    WillingnessToPayScore: 50,
    MarketSizeScore: 80,
    TrendScore: 48,
    OpportunityScore: 59,
    FirstSeenAt: "2025-08-22",
    LastSeenAt: "2026-05-05",
    Status: "active",
    SourceType: "forum",
    TrendDirection: "stable",
  },
  {
    PainPointId: "pp-9",
    Title: "Teams meeting analytics missing for compliance audits",
    Summary:
      "Regulated industries need detailed meeting attendance and recording logs. Microsoft provides limited data via admin center and Graph API.",
    Category: "Business Software",
    SeverityScore: 76,
    FrequencyScore: 58,
    WillingnessToPayScore: 82,
    MarketSizeScore: 70,
    TrendScore: 68,
    OpportunityScore: 71,
    FirstSeenAt: "2025-07-03",
    LastSeenAt: "2026-06-25",
    Status: "active",
    SourceType: "github",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-10",
    Title: "Stale Active Directory accounts create security risks",
    Summary:
      "Organizations accumulate hundreds of disabled or unused AD accounts from departed employees. No built-in automated cleanup exists.",
    Category: "Identity & Access",
    SeverityScore: 85,
    FrequencyScore: 90,
    WillingnessToPayScore: 65,
    MarketSizeScore: 88,
    TrendScore: 78,
    OpportunityScore: 81,
    FirstSeenAt: "2025-01-05",
    LastSeenAt: "2026-07-02",
    Status: "active",
    SourceType: "reddit",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-11",
    Title: "AD group membership sprawl is unmanageable",
    Summary:
      "Users accumulate group memberships over years. Reviewing and pruning nested groups across a large forest is nearly impossible manually.",
    Category: "Identity & Access",
    SeverityScore: 73,
    FrequencyScore: 80,
    WillingnessToPayScore: 55,
    MarketSizeScore: 82,
    TrendScore: 62,
    OpportunityScore: 70,
    FirstSeenAt: "2025-03-28",
    LastSeenAt: "2026-06-18",
    Status: "active",
    SourceType: "social",
    TrendDirection: "stable",
  },
  {
    PainPointId: "pp-12",
    Title: "Hybrid AD sync conflicts cause login failures",
    Summary:
      "Azure AD Connect sync errors for on-prem/cloud attribute mismatches are cryptic. IT spends hours resolving UPN and proxy address conflicts.",
    Category: "Identity & Access",
    SeverityScore: 78,
    FrequencyScore: 60,
    WillingnessToPayScore: 72,
    MarketSizeScore: 75,
    TrendScore: 50,
    OpportunityScore: 67,
    FirstSeenAt: "2025-06-10",
    LastSeenAt: "2026-03-30",
    Status: "resolved",
    SourceType: "github",
    TrendDirection: "down",
  },
  {
    PainPointId: "pp-13",
    Title: "Intune compliance policies don't cover BYOD edge cases",
    Summary:
      "Personal devices with work profiles trigger false non-compliance flags. Admin overrides are all-or-nothing with no granular exceptions.",
    Category: "Endpoint Management",
    SeverityScore: 69,
    FrequencyScore: 75,
    WillingnessToPayScore: 62,
    MarketSizeScore: 78,
    TrendScore: 70,
    OpportunityScore: 71,
    FirstSeenAt: "2025-04-15",
    LastSeenAt: "2026-06-22",
    Status: "active",
    SourceType: "reddit",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-14",
    Title: "Bulk device enrollment in Intune is fragile and slow",
    Summary:
      "Provisioning packages fail silently on certain hardware. Autopilot timeouts force manual re-enrollment of 10-20% of devices per batch.",
    Category: "Endpoint Management",
    SeverityScore: 74,
    FrequencyScore: 52,
    WillingnessToPayScore: 68,
    MarketSizeScore: 70,
    TrendScore: 55,
    OpportunityScore: 64,
    FirstSeenAt: "2025-08-01",
    LastSeenAt: "2026-05-28",
    Status: "monitoring",
    SourceType: "review",
    TrendDirection: "down",
  },
  {
    PainPointId: "pp-15",
    Title: "PowerShell scripts break after module updates",
    Summary:
      "Az module and Microsoft.Graph module breaking changes ship frequently. Scripts that worked last month fail without clear migration paths.",
    Category: "Automation",
    SeverityScore: 80,
    FrequencyScore: 88,
    WillingnessToPayScore: 58,
    MarketSizeScore: 85,
    TrendScore: 82,
    OpportunityScore: 79,
    FirstSeenAt: "2025-02-01",
    LastSeenAt: "2026-07-03",
    Status: "active",
    SourceType: "github",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-16",
    Title: "No good way to schedule and monitor PowerShell runbooks",
    Summary:
      "Azure Automation runbooks lack decent logging and alerting. Teams resort to Task Scheduler on VMs, losing cloud-native benefits.",
    Category: "Automation",
    SeverityScore: 62,
    FrequencyScore: 70,
    WillingnessToPayScore: 55,
    MarketSizeScore: 72,
    TrendScore: 50,
    OpportunityScore: 62,
    FirstSeenAt: "2025-05-20",
    LastSeenAt: "2026-04-15",
    Status: "active",
    SourceType: "forum",
    TrendDirection: "stable",
  },
  {
    PainPointId: "pp-17",
    Title: "Small businesses lack affordable inventory + invoicing combo",
    Summary:
      "QuickBooks + separate inventory tools cost $100+/mo. Owner-operators want a single app under $30/mo that handles both.",
    Category: "Business Software",
    SeverityScore: 60,
    FrequencyScore: 85,
    WillingnessToPayScore: 92,
    MarketSizeScore: 95,
    TrendScore: 78,
    OpportunityScore: 82,
    FirstSeenAt: "2025-01-12",
    LastSeenAt: "2026-06-27",
    Status: "active",
    SourceType: "social",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-18",
    Title: "Employee scheduling tools ignore labor law constraints",
    Summary:
      "Most scheduling apps don't enforce overtime rules, mandatory breaks, or minor-age restrictions. Managers risk compliance violations.",
    Category: "Business Software",
    SeverityScore: 71,
    FrequencyScore: 66,
    WillingnessToPayScore: 74,
    MarketSizeScore: 88,
    TrendScore: 65,
    OpportunityScore: 73,
    FirstSeenAt: "2025-03-05",
    LastSeenAt: "2026-06-12",
    Status: "active",
    SourceType: "review",
    TrendDirection: "stable",
  },
  {
    PainPointId: "pp-19",
    Title: "Customer support ticket routing is mostly random",
    Summary:
      "Small support teams manually triage tickets. Auto-routing by keyword misclassifies 40%+ of tickets, increasing resolution time.",
    Category: "Support Operations",
    SeverityScore: 77,
    FrequencyScore: 83,
    WillingnessToPayScore: 70,
    MarketSizeScore: 90,
    TrendScore: 75,
    OpportunityScore: 79,
    FirstSeenAt: "2025-02-25",
    LastSeenAt: "2026-07-01",
    Status: "active",
    SourceType: "reddit",
    TrendDirection: "up",
  },
  {
    PainPointId: "pp-20",
    Title: "No way to measure support agent empathy or tone",
    Summary:
      "CSAT surveys are unreliable. Managers want real-time sentiment analysis on live chats and calls to coach agents proactively.",
    Category: "Support Operations",
    SeverityScore: 58,
    FrequencyScore: 50,
    WillingnessToPayScore: 65,
    MarketSizeScore: 82,
    TrendScore: 72,
    OpportunityScore: 65,
    FirstSeenAt: "2025-07-15",
    LastSeenAt: "2026-06-08",
    Status: "monitoring",
    SourceType: "social",
    TrendDirection: "stable",
  },
];

const ITEMS_PER_PAGE = 10;

type SortKey =
  | "Title"
  | "SourceType"
  | "OpportunityScore"
  | "SeverityScore"
  | "FrequencyScore"
  | "WillingnessToPayScore"
  | "TrendDirection"
  | "LastSeenAt";

function relativeTime(dateStr: string): string {
  const now = new Date("2026-07-03");
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function statusBadgeClass(status: PainPoint["Status"]): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "monitoring":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "resolved":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400";
  }
}

export default function ProblemsPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [trendFilter, setTrendFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("OpportunityScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return PAIN_POINTS.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.Title.toLowerCase().includes(q) &&
          !p.Summary.toLowerCase().includes(q)
        )
          return false;
      }
      if (sourceFilter && p.SourceType !== sourceFilter) return false;
      if (categoryFilter && p.Category !== categoryFilter) return false;
      if (p.OpportunityScore < minScore) return false;
      if (trendFilter) {
        if (trendFilter === "up" && p.TrendDirection !== "up") return false;
        if (trendFilter === "down" && p.TrendDirection !== "down") return false;
        if (trendFilter === "stable" && p.TrendDirection !== "stable")
          return false;
      }
      if (statusFilter && p.Status !== statusFilter) return false;
      return true;
    });
  }, [search, sourceFilter, categoryFilter, minScore, trendFilter, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "Title":
          cmp = a.Title.localeCompare(b.Title);
          break;
        case "SourceType":
          cmp = a.SourceType.localeCompare(b.SourceType);
          break;
        case "OpportunityScore":
          cmp = a.OpportunityScore - b.OpportunityScore;
          break;
        case "SeverityScore":
          cmp = a.SeverityScore - b.SeverityScore;
          break;
        case "FrequencyScore":
          cmp = a.FrequencyScore - b.FrequencyScore;
          break;
        case "WillingnessToPayScore":
          cmp = a.WillingnessToPayScore - b.WillingnessToPayScore;
          break;
        case "TrendDirection": {
          const order = { up: 3, stable: 2, down: 1 };
          cmp = order[a.TrendDirection] - order[b.TrendDirection];
          break;
        }
        case "LastSeenAt":
          cmp =
            new Date(a.LastSeenAt).getTime() -
            new Date(b.LastSeenAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function clearFilters() {
    setSearch("");
    setSourceFilter("");
    setCategoryFilter("");
    setMinScore(0);
    setTrendFilter("");
    setStatusFilter("");
    setPage(1);
  }

  const hasActiveFilters =
    search ||
    sourceFilter ||
    categoryFilter ||
    minScore > 0 ||
    trendFilter ||
    statusFilter;

  const SortArrow = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="ml-1 text-text-muted opacity-0 group-hover:opacity-50">↕</span>;
    return (
      <span className="ml-1 text-brand-600">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Problem Explorer
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Search and filter discovered customer pain points across all sources
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium text-text-muted">
          Showing{" "}
          <span className="text-text-primary">{sorted.length}</span> of{" "}
          <span className="text-text-primary">{PAIN_POINTS.length}</span>{" "}
          problems
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card sticky top-0 z-20 mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or summary…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-9"
            />
          </div>

          {/* Source */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="select"
          >
            <option value="">All Sources</option>
            <option value="reddit">Reddit</option>
            <option value="github">GitHub</option>
            <option value="forum">Forum</option>
            <option value="review">Review</option>
            <option value="social">Social</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="select"
          >
            <option value="">All Categories</option>
            <option value="Cloud Infrastructure">Cloud Infrastructure</option>
            <option value="Database Admin">Database Admin</option>
            <option value="Identity & Access">Identity &amp; Access</option>
            <option value="Dev Tooling">Dev Tooling</option>
            <option value="Business Software">Business Software</option>
            <option value="Support Operations">Support Operations</option>
            <option value="Endpoint Management">Endpoint Management</option>
            <option value="Automation">Automation</option>
          </select>

          {/* Min Opportunity Score */}
          <div className="flex items-center gap-3">
            <label className="shrink-0 text-xs font-medium text-text-secondary">
              Min Score
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => {
                setMinScore(Number(e.target.value));
                setPage(1);
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-alt accent-brand-600"
            />
            <span className="w-8 text-center text-xs font-semibold text-text-primary">
              {minScore}
            </span>
          </div>

          {/* Trend */}
          <select
            value={trendFilter}
            onChange={(e) => {
              setTrendFilter(e.target.value);
              setPage(1);
            }}
            className="select"
          >
            <option value="">All Trends</option>
            <option value="up">Rising</option>
            <option value="down">Declining</option>
            <option value="stable">Stable</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="select"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Clear */}
          <div className="flex items-center">
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="btn-secondary w-full gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {paginated.length === 0 ? (
        <EmptyState
          title="No problems found"
          description="Try adjusting your search or filter criteria to find what you're looking for."
          action={
            <button onClick={clearFilters} className="btn-secondary">
              Clear all filters
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-xs font-semibold uppercase tracking-wider text-text-muted">
                  <th
                    className="group cursor-pointer px-4 py-3 select-none"
                    onClick={() => handleSort("Title")}
                  >
                    Problem <SortArrow column="Title" />
                  </th>
                  <th
                    className="group cursor-pointer px-4 py-3 select-none"
                    onClick={() => handleSort("SourceType")}
                  >
                    Source <SortArrow column="SourceType" />
                  </th>
                  <th
                    className="group cursor-pointer px-4 py-3 text-center select-none"
                    onClick={() => handleSort("OpportunityScore")}
                  >
                    Opportunity <SortArrow column="OpportunityScore" />
                  </th>
                  <th
                    className="group cursor-pointer px-4 py-3 text-center select-none"
                    onClick={() => handleSort("SeverityScore")}
                  >
                    Severity <SortArrow column="SeverityScore" />
                  </th>
                  <th
                    className="group cursor-pointer px-4 py-3 text-center select-none"
                    onClick={() => handleSort("FrequencyScore")}
                  >
                    Frequency <SortArrow column="FrequencyScore" />
                  </th>
                  <th
                    className="group cursor-pointer px-4 py-3 text-center select-none"
                    onClick={() => handleSort("WillingnessToPayScore")}
                  >
                    WTP <SortArrow column="WillingnessToPayScore" />
                  </th>
                  <th
                    className="group cursor-pointer px-4 py-3 select-none"
                    onClick={() => handleSort("TrendDirection")}
                  >
                    Trend <SortArrow column="TrendDirection" />
                  </th>
                  <th
                    className="group cursor-pointer px-4 py-3 select-none"
                    onClick={() => handleSort("LastSeenAt")}
                  >
                    Last Seen <SortArrow column="LastSeenAt" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((p) => (
                  <Link
                    key={p.PainPointId}
                    href={`/problems/${p.PainPointId}`}
                    className="contents"
                  >
                    <tr className="cursor-pointer bg-surface transition-colors hover:bg-surface-hover">
                      <td className="max-w-xs px-4 py-3">
                        <span className="font-medium text-text-primary line-clamp-1">
                          {p.Title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-text-muted">
                            {p.Category}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusBadgeClass(p.Status)}`}
                          >
                            {p.Status}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-text-secondary">
                          <SourceIcon type={p.SourceType} className="h-4 w-4" />
                          <span className="text-xs capitalize">
                            {p.SourceType}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={p.OpportunityScore} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-text-secondary">
                        {p.SeverityScore}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-text-secondary">
                        {p.FrequencyScore}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-text-secondary">
                        {p.WillingnessToPayScore}
                      </td>
                      <td className="px-4 py-3">
                        <TrendIndicator
                          direction={p.TrendDirection}
                          size="sm"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                        {relativeTime(p.LastSeenAt)}
                      </td>
                    </tr>
                  </Link>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {paginated.map((p) => (
              <Link
                key={p.PainPointId}
                href={`/problems/${p.PainPointId}`}
                className="card-hover block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-text-primary line-clamp-2 text-sm">
                      {p.Title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {p.Category}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusBadgeClass(p.Status)}`}
                      >
                        {p.Status}
                      </span>
                    </div>
                  </div>
                  <ScoreBadge score={p.OpportunityScore} size="sm" />
                </div>

                <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                  {p.Summary}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <SourceIcon type={p.SourceType} className="h-3.5 w-3.5" />
                    <span className="capitalize">{p.SourceType}</span>
                  </span>
                  <span>Sev {p.SeverityScore}</span>
                  <span>Freq {p.FrequencyScore}</span>
                  <span>WTP {p.WillingnessToPayScore}</span>
                  <TrendIndicator direction={p.TrendDirection} size="sm" />
                  <span className="ml-auto">{relativeTime(p.LastSeenAt)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm text-text-secondary">
                Page{" "}
                <span className="font-semibold text-text-primary">
                  {safePage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-text-primary">
                  {totalPages}
                </span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
