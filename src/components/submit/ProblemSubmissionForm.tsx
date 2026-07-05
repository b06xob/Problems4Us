"use client";

import { useState } from "react";
import Link from "next/link";
import { SUBMISSION_CATEGORIES } from "@/lib/user-submissions";
import type { SubmissionUrgency } from "@/lib/types";

const URGENCY_OPTIONS: { value: SubmissionUrgency; label: string; desc: string }[] = [
  { value: "low", label: "Low", desc: "Nice to have, not blocking work" },
  { value: "medium", label: "Medium", desc: "Slowing us down but we have workarounds" },
  { value: "high", label: "High", desc: "Costing time or money every week" },
  { value: "critical", label: "Critical", desc: "Blocking operations or revenue" },
];

interface ProblemSubmissionFormProps {
  onSuccess?: (submissionId: string) => void;
}

export function ProblemSubmissionForm({ onSuccess }: ProblemSubmissionFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState<SubmissionUrgency>("medium");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          urgency,
          submitterName: submitterName || undefined,
          submitterEmail: submitterEmail || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      const id = json.data.SubmissionId as string;
      setSubmittedId(id);
      onSuccess?.(id);
    } catch {
      setError("Unable to submit right now. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-brand-600"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold">Problem submitted!</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Thank you for sharing. Your problem has been added to the community board
          where builders and entrepreneurs can discover opportunities to solve it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/submissions" className="btn-primary">
            View Community Problems
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSubmittedId(null);
              setTitle("");
              setDescription("");
              setCategory("");
              setUrgency("medium");
              setSubmitterName("");
              setSubmitterEmail("");
            }}
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-text-primary">
          Problem title <span className="text-red-500">*</span>
        </label>
        <p className="mt-0.5 text-xs text-text-muted">
          Summarize the problem in one clear sentence.
        </p>
        <input
          id="title"
          type="text"
          required
          minLength={10}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. No way to track software license renewals across vendors"
          className="input mt-2"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-text-primary">
          Describe the problem <span className="text-red-500">*</span>
        </label>
        <p className="mt-0.5 text-xs text-text-muted">
          What&apos;s broken? Who is affected? What have you tried? The more detail, the better.
        </p>
        <textarea
          id="description"
          required
          minLength={30}
          maxLength={5000}
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about the problem you're facing, how often it happens, and why existing solutions don't work..."
          className="input mt-2 resize-y min-h-[140px]"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-text-primary">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select mt-2"
          >
            <option value="">Select a category</option>
            {SUBMISSION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="urgency" className="block text-sm font-medium text-text-primary">
            How urgent is this? <span className="text-red-500">*</span>
          </label>
          <select
            id="urgency"
            required
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as SubmissionUrgency)}
            className="select mt-2"
          >
            {URGENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-alt p-4">
        <h3 className="text-sm font-semibold text-text-primary">Contact info (optional)</h3>
        <p className="mt-1 text-xs text-text-muted">
          Leave your details if you&apos;d like builders to reach out when they have a solution.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-text-secondary">
              Your name
            </label>
            <input
              id="name"
              type="text"
              maxLength={100}
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Jane D."
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-text-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="you@company.com"
              className="input mt-1"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <p className="text-xs text-text-muted">
          Submissions are public on the community board. Do not include confidential data.
        </p>
        <button type="submit" disabled={submitting} className="btn-primary min-w-[140px]">
          {submitting ? "Submitting…" : "Submit Problem"}
        </button>
      </div>
    </form>
  );
}
