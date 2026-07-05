"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { SourceIcon } from "@/components/ui/SourceIcon";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

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
  Status: "active" | "monitoring" | "resolved";
  TrendDirection: "up" | "down" | "stable";
}

interface SourceExample {
  source: string;
  sourceType: string;
  text: string;
  author: string;
  date: string;
  url: string;
}

interface ProblemDetail {
  painPoint: PainPoint;
  aiExplanation: string;
  sourceExamples: SourceExample[];
  similarComplaints: { id: string; title: string; score: number }[];
  productIdeas: { name: string; description: string; difficulty: number; revenue: number }[];
  targetCustomers: string[];
  monetizationIdeas: string[];
  competitiveNotes: string[];
  trendHistory: { month: string; mentions: number; severity: number }[];
  nextSteps: string[];
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    monitoring: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.active}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ProblemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/problems/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        setDetail(json);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-surface-hover" />
          <div className="h-4 w-2/3 rounded bg-surface-hover" />
          <div className="card h-48" />
        </div>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold text-text-primary">Problem not found</h1>
        <p className="text-text-secondary">
          The problem with ID &ldquo;{id}&rdquo; does not exist.
        </p>
        <Link href="/problems" className="btn-primary mt-4">
          ← Back to Problems
        </Link>
      </div>
    );
  }

  const {
    painPoint,
    aiExplanation,
    sourceExamples,
    similarComplaints,
    productIdeas,
    targetCustomers,
    monetizationIdeas,
    competitiveNotes,
    trendHistory,
    nextSteps,
  } = detail;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-text-muted">
        <Link href="/problems" className="hover:text-text-primary transition-colors">
          Problems
        </Link>
        <span className="mx-2">›</span>
        <span className="text-text-secondary">{painPoint.Title}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            {painPoint.Title}
          </h1>
          <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {painPoint.Category}
          </span>
          {getStatusBadge(painPoint.Status)}
          <TrendIndicator direction={painPoint.TrendDirection} />
        </div>
        <p className="text-text-secondary max-w-3xl mb-4">{painPoint.Summary}</p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Opportunity Score:</span>
            <ScoreBadge score={painPoint.OpportunityScore} size="lg" />
          </div>
          <div className="text-sm text-text-muted">
            First seen:{" "}
            <span className="text-text-secondary font-medium">
              {new Date(painPoint.FirstSeenAt).toLocaleDateString()}
            </span>
          </div>
          <div className="text-sm text-text-muted">
            Last seen:{" "}
            <span className="text-text-secondary font-medium">
              {new Date(painPoint.LastSeenAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Score Breakdown</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ScoreBar score={painPoint.FrequencyScore} label="Frequency Score" />
              <ScoreBar score={painPoint.SeverityScore} label="Severity Score" />
              <ScoreBar score={painPoint.WillingnessToPayScore} label="Willingness to Pay" />
              <ScoreBar score={painPoint.MarketSizeScore} label="Market Size" />
              <ScoreBar score={painPoint.TrendScore} label="Trend Score" />
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">AI-Generated Analysis</h2>
            <div className="space-y-4">
              {aiExplanation.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed text-text-secondary">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {sourceExamples.length > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Source Examples</h2>
              <div className="space-y-4">
                {sourceExamples.map((example, i) => (
                  <div key={i} className="rounded-lg border border-border bg-surface-alt p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <SourceIcon type={example.sourceType} className="w-4 h-4 text-text-muted" />
                      <span className="text-xs font-medium text-text-secondary">{example.source}</span>
                      {example.date && (
                        <>
                          <span className="text-xs text-text-muted">·</span>
                          <span className="text-xs text-text-muted">{example.date}</span>
                        </>
                      )}
                    </div>
                    <blockquote className="text-sm text-text-secondary italic border-l-2 border-border pl-3 mb-2">
                      &ldquo;{example.text}&rdquo;
                    </blockquote>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">— {example.author}</span>
                      {example.url && example.url !== "#" && (
                        <a
                          href={example.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-text-primary transition-colors"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {productIdeas.length > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Suggested Product Ideas</h2>
              <div className="space-y-4">
                {productIdeas.map((idea, i) => (
                  <div key={i} className="rounded-lg border border-border bg-surface-alt p-4">
                    <h3 className="font-semibold text-text-primary mb-1">{idea.name}</h3>
                    <p className="text-sm text-text-secondary mb-3">{idea.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreBar score={idea.difficulty} label="Difficulty" />
                      <ScoreBar score={idea.revenue} label="Revenue Potential" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Competitive Landscape</h2>
            <ul className="space-y-2">
              {competitiveNotes.map((note, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-secondary">
                  <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-text-muted" />
                  {note}
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recommended Next Steps</h2>
            <ol className="space-y-3">
              {nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                    ✓
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-8">
          {trendHistory.length > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Trend History</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendHistory} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="mentionsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="mentions" stroke="#6366f1" strokeWidth={2} fill="url(#mentionsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {similarComplaints.length > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Related Pain Points</h2>
              <ul className="space-y-3">
                {similarComplaints.map((complaint) => (
                  <li key={complaint.id}>
                    <Link
                      href={`/problems/${complaint.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg p-2 -mx-2 hover:bg-surface-alt transition-colors"
                    >
                      <span className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                        {complaint.title}
                      </span>
                      <ScoreBadge score={complaint.score} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Target Customers</h2>
            <ul className="space-y-2">
              {targetCustomers.map((customer, i) => (
                <li key={i} className="text-sm text-text-secondary">
                  {customer}
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Monetization Ideas</h2>
            <ol className="space-y-2">
              {monetizationIdeas.map((idea, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {idea}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
