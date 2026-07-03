"use client";

import { useState, useMemo } from "react";
import { SourceIcon } from "@/components/ui/SourceIcon";

interface DataSource {
  SourceId: string;
  SourceType: "reddit" | "github" | "forum" | "review" | "social";
  SourceName: string;
  SourceUrl: string;
  IsActive: boolean;
  CreatedAt: string;
  LastScraped: string | null;
  PostsCollected: number;
  PainPointsFound: number;
  Status: "active" | "paused" | "error" | "pending";
  Config: Record<string, string>;
}

const initialSources: DataSource[] = [
  {
    SourceId: "src-001",
    SourceType: "reddit",
    SourceName: "r/sysadmin",
    SourceUrl: "https://reddit.com/r/sysadmin",
    IsActive: true,
    CreatedAt: "2026-01-15T08:00:00Z",
    LastScraped: "2026-07-03T14:22:00Z",
    PostsCollected: 2847,
    PainPointsFound: 156,
    Status: "active",
    Config: { subreddit: "sysadmin", sort: "hot", limit: "100" },
  },
  {
    SourceId: "src-002",
    SourceType: "reddit",
    SourceName: "r/azure",
    SourceUrl: "https://reddit.com/r/azure",
    IsActive: true,
    CreatedAt: "2026-01-20T10:30:00Z",
    LastScraped: "2026-07-03T13:15:00Z",
    PostsCollected: 1523,
    PainPointsFound: 89,
    Status: "active",
    Config: { subreddit: "azure", sort: "new", limit: "50" },
  },
  {
    SourceId: "src-003",
    SourceType: "reddit",
    SourceName: "r/YOURCOMPANY",
    SourceUrl: "https://reddit.com/r/YOURCOMPANY",
    IsActive: true,
    CreatedAt: "2026-02-01T09:00:00Z",
    LastScraped: "2026-07-03T12:00:00Z",
    PostsCollected: 892,
    PainPointsFound: 45,
    Status: "active",
    Config: { subreddit: "YOURCOMPANY", sort: "top", limit: "50" },
  },
  {
    SourceId: "src-004",
    SourceType: "reddit",
    SourceName: "r/smallbusiness",
    SourceUrl: "https://reddit.com/r/smallbusiness",
    IsActive: true,
    CreatedAt: "2026-02-10T14:00:00Z",
    LastScraped: "2026-07-03T11:45:00Z",
    PostsCollected: 1205,
    PainPointsFound: 72,
    Status: "active",
    Config: { subreddit: "smallbusiness", sort: "hot", limit: "75" },
  },
  {
    SourceId: "src-005",
    SourceType: "github",
    SourceName: "azure/azure-cli Issues",
    SourceUrl: "https://github.com/azure/azure-cli/issues",
    IsActive: true,
    CreatedAt: "2026-03-01T11:00:00Z",
    LastScraped: "2026-07-02T22:30:00Z",
    PostsCollected: 634,
    PainPointsFound: 34,
    Status: "active",
    Config: { owner: "azure", repo: "azure-cli", label: "bug", state: "open" },
  },
  {
    SourceId: "src-006",
    SourceType: "github",
    SourceName: "MicrosoftDocs/azure-docs Issues",
    SourceUrl: "https://github.com/MicrosoftDocs/azure-docs/issues",
    IsActive: false,
    CreatedAt: "2026-03-05T16:00:00Z",
    LastScraped: "2026-06-28T10:00:00Z",
    PostsCollected: 421,
    PainPointsFound: 28,
    Status: "paused",
    Config: { owner: "MicrosoftDocs", repo: "azure-docs", label: "", state: "all" },
  },
  {
    SourceId: "src-007",
    SourceType: "forum",
    SourceName: "Spiceworks Community",
    SourceUrl: "https://community.spiceworks.com",
    IsActive: true,
    CreatedAt: "2026-03-10T09:30:00Z",
    LastScraped: "2026-07-02T23:00:00Z",
    PostsCollected: 1876,
    PainPointsFound: 98,
    Status: "active",
    Config: { forum_url: "https://community.spiceworks.com", depth: "3", keyword: "problem,issue,bug" },
  },
  {
    SourceId: "src-008",
    SourceType: "forum",
    SourceName: "TechCommunity Forums",
    SourceUrl: "https://techcommunity.microsoft.com",
    IsActive: true,
    CreatedAt: "2026-03-15T13:00:00Z",
    LastScraped: "2026-07-02T21:00:00Z",
    PostsCollected: 956,
    PainPointsFound: 67,
    Status: "active",
    Config: { forum_url: "https://techcommunity.microsoft.com", depth: "2", keyword: "pain,frustration,broken" },
  },
  {
    SourceId: "src-009",
    SourceType: "review",
    SourceName: "G2 Reviews",
    SourceUrl: "https://www.g2.com",
    IsActive: false,
    CreatedAt: "2026-04-01T08:00:00Z",
    LastScraped: null,
    PostsCollected: 0,
    PainPointsFound: 0,
    Status: "pending",
    Config: { site: "G2", product: "Azure", min_rating: "1" },
  },
  {
    SourceId: "src-010",
    SourceType: "social",
    SourceName: "Twitter/X #AzurePain",
    SourceUrl: "https://x.com/search?q=%23AzurePain",
    IsActive: false,
    CreatedAt: "2026-04-10T15:00:00Z",
    LastScraped: "2026-07-01T06:00:00Z",
    PostsCollected: 234,
    PainPointsFound: 12,
    Status: "error",
    Config: { platform: "twitter", keywords: "#AzurePain,#AzureDown", language: "en" },
  },
];

const activityLog = [
  { time: "2026-07-03 14:22", message: "Scraped r/sysadmin — 12 new posts, 3 pain points extracted" },
  { time: "2026-07-03 13:15", message: "Scraped r/azure — 8 new posts, 2 pain points extracted" },
  { time: "2026-07-03 12:00", message: "Error scraping Twitter/X: Rate limit exceeded" },
  { time: "2026-07-02 23:00", message: "Scraped Spiceworks Community — 15 new posts, 5 pain points extracted" },
  { time: "2026-07-02 22:30", message: "Scraped azure-cli Issues — 4 new issues, 1 pain point extracted" },
];

type SourceType = DataSource["SourceType"];
type StatusFilter = DataSource["Status"] | "all";
type TypeFilter = SourceType | "all";

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  reddit: "Reddit",
  github: "GitHub",
  forum: "Forum",
  review: "Review",
  social: "Social",
};

const STATUS_COLORS: Record<DataSource["Status"], string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  error: "bg-red-500",
  pending: "bg-gray-400",
};

const STATUS_LABELS: Record<DataSource["Status"], string> = {
  active: "Active",
  paused: "Paused",
  error: "Error",
  pending: "Pending",
};

interface FormState {
  SourceType: SourceType;
  SourceName: string;
  SourceUrl: string;
  IsActive: boolean;
  Config: Record<string, string>;
}

const emptyForm: FormState = {
  SourceType: "reddit",
  SourceName: "",
  SourceUrl: "",
  IsActive: true,
  Config: {},
};

function getDefaultConfig(type: SourceType): Record<string, string> {
  switch (type) {
    case "reddit":
      return { subreddit: "", sort: "hot", limit: "50" };
    case "github":
      return { owner: "", repo: "", label: "", state: "open" };
    case "forum":
      return { forum_url: "", depth: "2", keyword: "" };
    case "review":
      return { site: "", product: "", min_rating: "1" };
    case "social":
      return { platform: "", keywords: "", language: "en" };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function truncateUrl(url: string, max = 40): string {
  const clean = url.replace(/^https?:\/\//, "");
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

export default function AdminDataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>(initialSources);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm, Config: getDefaultConfig("reddit") });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const stats = useMemo(() => {
    const total = sources.length;
    const active = sources.filter((s) => s.Status === "active").length;
    const posts = sources.reduce((sum, s) => sum + s.PostsCollected, 0);
    const painPoints = sources.reduce((sum, s) => sum + s.PainPointsFound, 0);
    return { total, active, posts, painPoints };
  }, [sources]);

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (typeFilter !== "all" && s.SourceType !== typeFilter) return false;
      if (statusFilter !== "all" && s.Status !== statusFilter) return false;
      return true;
    });
  }, [sources, typeFilter, statusFilter]);

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm, Config: getDefaultConfig("reddit") });
    setShowForm(true);
  }

  function openEditForm(source: DataSource) {
    setEditingId(source.SourceId);
    setForm({
      SourceType: source.SourceType,
      SourceName: source.SourceName,
      SourceUrl: source.SourceUrl,
      IsActive: source.IsActive,
      Config: { ...source.Config },
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function handleTypeChange(newType: SourceType) {
    setForm((f) => ({ ...f, SourceType: newType, Config: getDefaultConfig(newType) }));
  }

  function handleConfigChange(key: string, value: string) {
    setForm((f) => ({ ...f, Config: { ...f.Config, [key]: value } }));
  }

  function handleSave() {
    if (!form.SourceName.trim() || !form.SourceUrl.trim()) {
      alert("Source Name and Source URL are required.");
      return;
    }

    if (editingId) {
      setSources((prev) =>
        prev.map((s) =>
          s.SourceId === editingId
            ? {
                ...s,
                SourceType: form.SourceType,
                SourceName: form.SourceName,
                SourceUrl: form.SourceUrl,
                IsActive: form.IsActive,
                Status: form.IsActive ? "active" : "paused",
                Config: { ...form.Config },
              }
            : s,
        ),
      );
    } else {
      const newSource: DataSource = {
        SourceId: `src-${Date.now()}`,
        SourceType: form.SourceType,
        SourceName: form.SourceName,
        SourceUrl: form.SourceUrl,
        IsActive: false,
        CreatedAt: new Date().toISOString(),
        LastScraped: null,
        PostsCollected: 0,
        PainPointsFound: 0,
        Status: "pending",
        Config: { ...form.Config },
      };
      setSources((prev) => [...prev, newSource]);
    }
    closeForm();
  }

  function toggleSource(id: string) {
    setSources((prev) =>
      prev.map((s) => {
        if (s.SourceId !== id) return s;
        const nowActive = !s.IsActive;
        return { ...s, IsActive: nowActive, Status: nowActive ? "active" : "paused" };
      }),
    );
  }

  function deleteSource(id: string) {
    const source = sources.find((s) => s.SourceId === id);
    if (!source) return;
    if (!window.confirm(`Delete "${source.SourceName}"? This action cannot be undone.`)) return;
    setSources((prev) => prev.filter((s) => s.SourceId !== id));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Data Sources</h1>
          <p className="mt-1 text-text-secondary">Configure and manage data collection sources</p>
        </div>
        <button onClick={openAddForm} className="btn-primary gap-2">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Source
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm font-medium text-text-secondary">Total Sources</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-text-secondary">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-text-secondary">Posts Collected</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{stats.posts.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-text-secondary">Pain Points Found</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{stats.painPoints.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-text-secondary">Type:</label>
          <select
            className="select py-1.5 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="all">All Types</option>
            {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => (
              <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-text-secondary">Status:</label>
          <select
            className="select py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        {(typeFilter !== "all" || statusFilter !== "all") && (
          <button
            className="text-sm text-brand-600 hover:text-brand-700"
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-text-muted">
          {filteredSources.length} of {sources.length} sources
        </span>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card border-brand-500/40">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            {editingId ? "Edit Source" : "Add New Source"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Source Type</label>
              <select
                className="select"
                value={form.SourceType}
                onChange={(e) => handleTypeChange(e.target.value as SourceType)}
              >
                {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => (
                  <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Source Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="e.g. r/sysadmin"
                value={form.SourceName}
                onChange={(e) => setForm((f) => ({ ...f, SourceName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Source URL <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="https://..."
                value={form.SourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, SourceUrl: e.target.value }))}
              />
            </div>

            {/* Dynamic config fields */}
            {form.SourceType === "reddit" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Subreddit Name</label>
                  <input className="input" placeholder="sysadmin" value={form.Config.subreddit ?? ""} onChange={(e) => handleConfigChange("subreddit", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Sort Order</label>
                  <select className="select" value={form.Config.sort ?? "hot"} onChange={(e) => handleConfigChange("sort", e.target.value)}>
                    <option value="hot">Hot</option>
                    <option value="new">New</option>
                    <option value="top">Top</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Post Limit</label>
                  <input className="input" type="number" placeholder="50" value={form.Config.limit ?? ""} onChange={(e) => handleConfigChange("limit", e.target.value)} />
                </div>
              </>
            )}
            {form.SourceType === "github" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Owner / Repo</label>
                  <div className="flex gap-2">
                    <input className="input" placeholder="Owner" value={form.Config.owner ?? ""} onChange={(e) => handleConfigChange("owner", e.target.value)} />
                    <input className="input" placeholder="Repo" value={form.Config.repo ?? ""} onChange={(e) => handleConfigChange("repo", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Label Filter</label>
                  <input className="input" placeholder="bug" value={form.Config.label ?? ""} onChange={(e) => handleConfigChange("label", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">State</label>
                  <select className="select" value={form.Config.state ?? "open"} onChange={(e) => handleConfigChange("state", e.target.value)}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </>
            )}
            {form.SourceType === "forum" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Forum URL</label>
                  <input className="input" placeholder="https://community.example.com" value={form.Config.forum_url ?? ""} onChange={(e) => handleConfigChange("forum_url", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Scrape Depth</label>
                  <input className="input" type="number" placeholder="2" value={form.Config.depth ?? ""} onChange={(e) => handleConfigChange("depth", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Keyword Filter</label>
                  <input className="input" placeholder="problem,issue,bug" value={form.Config.keyword ?? ""} onChange={(e) => handleConfigChange("keyword", e.target.value)} />
                </div>
              </>
            )}
            {form.SourceType === "review" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Site Name</label>
                  <input className="input" placeholder="G2" value={form.Config.site ?? ""} onChange={(e) => handleConfigChange("site", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Product Search</label>
                  <input className="input" placeholder="Azure" value={form.Config.product ?? ""} onChange={(e) => handleConfigChange("product", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Min Rating Filter</label>
                  <input className="input" type="number" min="1" max="5" placeholder="1" value={form.Config.min_rating ?? ""} onChange={(e) => handleConfigChange("min_rating", e.target.value)} />
                </div>
              </>
            )}
            {form.SourceType === "social" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Platform</label>
                  <input className="input" placeholder="twitter" value={form.Config.platform ?? ""} onChange={(e) => handleConfigChange("platform", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Keywords (comma separated)</label>
                  <input className="input" placeholder="#AzurePain, #AzureDown" value={form.Config.keywords ?? ""} onChange={(e) => handleConfigChange("keywords", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Language</label>
                  <input className="input" placeholder="en" value={form.Config.language ?? ""} onChange={(e) => handleConfigChange("language", e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                checked={form.IsActive}
                onChange={(e) => setForm((f) => ({ ...f, IsActive: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={handleSave} className="btn-primary">
              {editingId ? "Update Source" : "Add Source"}
            </button>
            <button onClick={closeForm} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Source List */}
      <div className="space-y-3">
        {filteredSources.length === 0 && (
          <div className="card py-12 text-center">
            <p className="text-text-muted">No sources match the current filters.</p>
          </div>
        )}
        {filteredSources.map((source) => (
          <div key={source.SourceId} className="card-hover">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Icon + Name + Type */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-secondary">
                  <SourceIcon type={source.SourceType} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-text-primary">{source.SourceName}</h3>
                    <span className="badge bg-surface-alt text-text-secondary">
                      {SOURCE_TYPE_LABELS[source.SourceType]}
                    </span>
                  </div>
                  <a
                    href={source.SourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 hover:underline"
                  >
                    {truncateUrl(source.SourceUrl)}
                  </a>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 sm:w-24">
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[source.Status]}`} />
                <span className="text-sm font-medium text-text-secondary">
                  {STATUS_LABELS[source.Status]}
                </span>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm sm:w-52">
                <div>
                  <span className="text-text-muted">Posts</span>
                  <p className="font-semibold text-text-primary">{source.PostsCollected.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-text-muted">Pain Points</span>
                  <p className="font-semibold text-text-primary">{source.PainPointsFound.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-text-muted">Scraped</span>
                  <p className="font-medium text-text-secondary">{formatDate(source.LastScraped)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  title={source.IsActive ? "Pause" : "Activate"}
                  onClick={() => toggleSource(source.SourceId)}
                  className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-surface-hover"
                >
                  {source.IsActive ? (
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>
                <button
                  title="Edit"
                  onClick={() => openEditForm(source)}
                  className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-surface-hover"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  title="Delete"
                  onClick={() => deleteSource(source.SourceId)}
                  className="rounded-lg border border-border p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Log */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Activity Log</h2>
        <div className="space-y-2">
          {activityLog.map((entry, i) => {
            const isError = entry.message.toLowerCase().includes("error");
            return (
              <div
                key={i}
                className={`flex gap-3 rounded-lg px-3 py-2 text-sm ${isError ? "bg-red-50 dark:bg-red-900/10" : "bg-surface-alt"}`}
              >
                <span className="shrink-0 font-mono text-text-muted">[{entry.time}]</span>
                <span className={isError ? "text-red-600 dark:text-red-400" : "text-text-secondary"}>
                  {entry.message}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
