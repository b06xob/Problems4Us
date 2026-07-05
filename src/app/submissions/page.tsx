"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SUBMISSION_CATEGORIES } from "@/lib/user-submissions";
import type { UserProblemSubmission, SubmissionUrgency } from "@/lib/types";

function urgencyBadgeClass(urgency: SubmissionUrgency) {
  switch (urgency) {
    case "critical":
      return "badge-critical";
    case "high":
      return "badge-high";
    case "medium":
      return "badge-medium";
    default:
      return "badge-low";
  }
}

function urgencyLabel(urgency: SubmissionUrgency) {
  return urgency.charAt(0).toUpperCase() + urgency.slice(1);
}

function statusBadgeClass(status: UserProblemSubmission["Status"]) {
  switch (status) {
    case "accepted":
      return "badge-low";
    case "reviewing":
      return "badge-medium";
    case "declined":
      return "badge-critical";
    default:
      return "bg-surface-alt text-text-muted";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<UserProblemSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (urgency) params.set("urgency", urgency);
        if (search) params.set("search", search);

        const res = await fetch(`/api/submissions?${params.toString()}`);
        const json = await res.json();
        setSubmissions(json.data ?? []);
      } catch {
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, category, urgency]);

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      critical: submissions.filter((s) => s.Urgency === "critical").length,
      categories: new Set(submissions.map((s) => s.Category)).size,
    };
  }, [submissions]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
            Community
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Problems needing solutions
          </h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Real problems submitted by people looking for better tools, workflows,
            and products. Browse for inspiration or submit your own.
          </p>
        </div>
        <Link href="/submit" className="btn-primary shrink-0">
          Submit a Problem
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-brand-600">{stats.total}</p>
          <p className="text-xs text-text-muted">Total submissions</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-score-critical">{stats.critical}</p>
          <p className="text-xs text-text-muted">Critical urgency</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{stats.categories}</p>
          <p className="text-xs text-text-muted">Categories represented</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search problems..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input sm:flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select sm:w-52"
        >
          <option value="">All categories</option>
          {SUBMISSION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="select sm:w-44"
        >
          <option value="">All urgency</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 w-1/3 rounded bg-surface-hover" />
                <div className="mt-3 h-3 w-full rounded bg-surface-hover" />
                <div className="mt-2 h-3 w-2/3 rounded bg-surface-hover" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            title="No problems found"
            description={
              search || category || urgency
                ? "Try adjusting your filters to see more submissions."
                : "Be the first to share a problem that needs solving."
            }
            action={
              <Link href="/submit" className="btn-primary">
                Submit a Problem
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <article key={sub.SubmissionId} className="card-hover">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
                      {sub.Category}
                    </span>
                    <span className={urgencyBadgeClass(sub.Urgency)}>
                      {urgencyLabel(sub.Urgency)}
                    </span>
                    <span className={`badge ${statusBadgeClass(sub.Status)}`}>
                      {sub.Status}
                    </span>
                  </div>
                  <time className="text-xs text-text-muted" dateTime={sub.CreatedAt}>
                    {formatDate(sub.CreatedAt)}
                  </time>
                </div>

                <h2 className="mt-3 text-lg font-semibold leading-snug">
                  {sub.Title}
                </h2>

                <p className="mt-2 text-sm text-text-secondary leading-relaxed line-clamp-3">
                  {sub.Description}
                </p>

                {sub.SubmitterName && (
                  <p className="mt-3 text-xs text-text-muted">
                    Submitted by {sub.SubmitterName}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
