"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";

interface ProductIdea {
  ProductIdeaId: string;
  PainPointId: string;
  PainPointTitle: string;
  Name: string;
  Description: string;
  TargetCustomer: string;
  MVPFeatures: string;
  DifficultyScore: number;
  RevenuePotentialScore: number;
  ExistingAlternatives: string;
  RecommendedFirstFeature: string;
  CreatedAt: string;
  Category: string;
}

type SortOption = "revenue" | "difficulty-asc" | "difficulty-desc" | "newest";
type ViewMode = "grid" | "list";

function getDifficultyColor(score: number): string {
  if (score <= 30) return "text-green-600";
  if (score <= 50) return "text-yellow-600";
  if (score <= 70) return "text-orange-500";
  return "text-red-500";
}

function getDifficultyBarColor(score: number): string {
  if (score <= 30) return "bg-green-500";
  if (score <= 50) return "bg-yellow-500";
  if (score <= 70) return "bg-orange-500";
  return "bg-red-500";
}

function getRevenueBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-green-500";
  if (score >= 40) return "bg-lime-500";
  return "bg-gray-400";
}

function isQuickWin(idea: ProductIdea): boolean {
  return idea.DifficultyScore < 40 && idea.RevenuePotentialScore > 70;
}

export default function ProductIdeasPage() {
  const [productIdeas, setProductIdeas] = useState<ProductIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("revenue");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ideas");
        const json = await res.json();
        setProductIdeas(json.data ?? []);
      } catch {
        setProductIdeas([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(productIdeas.map((idea) => idea.Category)))],
    [productIdeas]
  );

  const filteredAndSorted = useMemo(() => {
    const results = productIdeas.filter((idea) => {
      const matchesSearch =
        searchQuery === "" ||
        idea.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.TargetCustomer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || idea.Category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    results.sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.RevenuePotentialScore - a.RevenuePotentialScore;
        case "difficulty-asc":
          return a.DifficultyScore - b.DifficultyScore;
        case "difficulty-desc":
          return b.DifficultyScore - a.DifficultyScore;
        case "newest":
          return (
            new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
          );
        default:
          return 0;
      }
    });

    return results;
  }, [productIdeas, searchQuery, selectedCategory, sortBy]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">Product Ideas</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Product Ideas</h1>
        <p className="mt-1 text-text-secondary">
          AI-generated product and service ideas derived from discovered pain
          points
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {filteredAndSorted.length} ideas generated
        </p>
      </div>

      {/* Filter/Sort Bar */}
      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="select"
            >
              <option value="revenue">Revenue Potential</option>
              <option value="difficulty-asc">Difficulty (Low to High)</option>
              <option value="difficulty-desc">Difficulty (High to Low)</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-brand-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-brand-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((idea) => (
            <div
              key={idea.ProductIdeaId}
              className={`card card-hover cursor-pointer transition-all duration-300 ${
                expandedId === idea.ProductIdeaId
                  ? "md:col-span-2 lg:col-span-3"
                  : ""
              }`}
              onClick={() =>
                setExpandedId(
                  expandedId === idea.ProductIdeaId
                    ? null
                    : idea.ProductIdeaId
                )
              }
            >
              {/* Card Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-bold text-text-primary">
                      {idea.Name}
                    </h3>
                    {isQuickWin(idea) && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Quick Win
                      </span>
                    )}
                  </div>
                  <span className="mt-1 inline-block rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {idea.Category}
                  </span>
                </div>
                <svg
                  className={`h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${
                    expandedId === idea.ProductIdeaId ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Description */}
              <p
                className={`text-sm text-text-secondary ${
                  expandedId === idea.ProductIdeaId
                    ? ""
                    : "line-clamp-2"
                }`}
              >
                {idea.Description}
              </p>

              {/* Pain Point Link */}
              <div className="mt-2">
                <Link
                  href={`/problems/${idea.PainPointId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-brand-primary hover:underline"
                >
                  Pain Point: {idea.PainPointTitle}
                </Link>
              </div>

              {/* Score Bars */}
              <div className="mt-4 space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      Revenue Potential
                    </span>
                    <span className="text-xs font-medium text-text-primary">
                      {idea.RevenuePotentialScore}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getRevenueBarColor(idea.RevenuePotentialScore)}`}
                      style={{ width: `${idea.RevenuePotentialScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      Difficulty
                    </span>
                    <span
                      className={`text-xs font-medium ${getDifficultyColor(idea.DifficultyScore)}`}
                    >
                      {idea.DifficultyScore}
                    </span>
                  </div>
                  <div className="score-bar">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getDifficultyBarColor(idea.DifficultyScore)}`}
                      style={{ width: `${idea.DifficultyScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Target Customer */}
              <p className="mt-3 text-xs text-text-muted">
                <span className="font-medium">Target:</span>{" "}
                {expandedId === idea.ProductIdeaId
                  ? idea.TargetCustomer
                  : idea.TargetCustomer.slice(0, 80) + "..."}
              </p>

              {/* Expanded Content */}
              {expandedId === idea.ProductIdeaId && (
                <div className="mt-5 space-y-4 border-t border-border pt-5">
                  {/* MVP Features */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-text-primary">
                      MVP Features
                    </h4>
                    <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
                      {idea.MVPFeatures.split(". ")
                        .filter((f) => f.trim())
                        .map((feature, i) => (
                          <li key={i}>{feature.replace(/\.$/, "")}</li>
                        ))}
                    </ul>
                  </div>

                  {/* Existing Alternatives */}
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-text-primary">
                      Existing Alternatives
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {idea.ExistingAlternatives}
                    </p>
                  </div>

                  {/* Recommended First Feature */}
                  <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
                    <h4 className="mb-1 text-sm font-semibold text-brand-primary">
                      Recommended First Feature
                    </h4>
                    <p className="text-sm text-text-primary">
                      {idea.RecommendedFirstFeature}
                    </p>
                  </div>

                  {/* Link to Pain Point */}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/problems/${idea.PainPointId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-primary inline-flex items-center gap-1.5 text-sm"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      View Source Pain Point
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(null);
                      }}
                      className="btn-secondary text-sm"
                    >
                      Collapse
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Name
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Category
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Problem Solved
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Revenue
                  </th>
                  <th className="px-4 py-3 font-semibold text-text-primary">
                    Target Customer
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((idea) => (
                  <tr
                    key={idea.ProductIdeaId}
                    className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-alt"
                    onClick={() =>
                      setExpandedId(
                        expandedId === idea.ProductIdeaId
                          ? null
                          : idea.ProductIdeaId
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {idea.Name}
                        </span>
                        {isQuickWin(idea) && (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Quick Win
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-secondary">
                        {idea.Category}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <Link
                        href={`/problems/${idea.PainPointId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-xs text-brand-primary hover:underline"
                      >
                        {idea.PainPointTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${getDifficultyColor(idea.DifficultyScore)}`}
                      >
                        {idea.DifficultyScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge
                        score={idea.RevenuePotentialScore}
                        size="sm"
                        showLabel={false}
                      />
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <span className="truncate text-xs text-text-muted">
                        {idea.TargetCustomer.slice(0, 60)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded Detail in List View */}
          {expandedId && (
            <div className="border-t border-border bg-surface p-6">
              {(() => {
                const idea = productIdeas.find(
                  (i) => i.ProductIdeaId === expandedId
                );
                if (!idea) return null;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-text-primary">
                        {idea.Name}
                      </h3>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="btn-secondary text-sm"
                      >
                        Close
                      </button>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {idea.Description}
                    </p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-text-primary">
                          MVP Features
                        </h4>
                        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
                          {idea.MVPFeatures.split(". ")
                            .filter((f) => f.trim())
                            .map((feature, i) => (
                              <li key={i}>{feature.replace(/\.$/, "")}</li>
                            ))}
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h4 className="mb-1 text-sm font-semibold text-text-primary">
                            Existing Alternatives
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {idea.ExistingAlternatives}
                          </p>
                        </div>
                        <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
                          <h4 className="mb-1 text-sm font-semibold text-brand-primary">
                            Recommended First Feature
                          </h4>
                          <p className="text-sm text-text-primary">
                            {idea.RecommendedFirstFeature}
                          </p>
                        </div>
                        <ScoreBar
                          score={idea.RevenuePotentialScore}
                          label="Revenue Potential"
                        />
                        <ScoreBar
                          score={idea.DifficultyScore}
                          label="Difficulty"
                        />
                      </div>
                    </div>

                    <Link
                      href={`/problems/${idea.PainPointId}`}
                      className="btn-primary inline-flex items-center gap-1.5 text-sm"
                    >
                      View Source Pain Point
                    </Link>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredAndSorted.length === 0 && (
        <div className="card py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-text-primary">
            No ideas found
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
