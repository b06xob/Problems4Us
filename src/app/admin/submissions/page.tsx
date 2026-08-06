"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { UserProblemSubmission, SubmissionStatus } from "@/lib/types";

const ADMIN_KEY_STORAGE = "p4u_admin_api_key";

function adminHeaders(key: string): HeadersInit {
  return { "x-admin-api-key": key, "Content-Type": "application/json" };
}

export default function AdminSubmissionsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [rows, setRows] = useState<UserProblemSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (stored) setAdminKey(stored);
  }, []);

  const load = useCallback(
    async (key: string, status?: string) => {
      setLoading(true);
      setActionError(null);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        const res = await fetch(`/api/submissions?${params.toString()}`, {
          headers: adminHeaders(key),
        });
        const json = await res.json();
        if (!res.ok) {
          setActionError(json.error ?? "Failed to load submissions");
          setRows([]);
          return;
        }
        setRows(json.data ?? []);
      } catch {
        setActionError("Network error loading submissions");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (adminKey) void load(adminKey, statusFilter || undefined);
  }, [adminKey, statusFilter, load]);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    const key = unlockInput.trim();
    if (!key) {
      setUnlockError("Enter the owner ADMIN_API_KEY.");
      return;
    }
    window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
    setAdminKey(key);
    setUnlockError(null);
  }

  async function patchStatus(id: string, status: SubmissionStatus) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: adminHeaders(adminKey),
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionError(json.error ?? "Update failed");
        return;
      }
      await load(adminKey, statusFilter || undefined);
    } catch {
      setActionError("Network error updating submission");
    } finally {
      setBusyId(null);
    }
  }

  if (!adminKey) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold">Submission moderation</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Enter <code className="text-xs">ADMIN_API_KEY</code> to review the
          borderline queue and approve/reject submissions.
        </p>
        <form onSubmit={unlock} className="mt-6 space-y-3">
          {unlockError && (
            <p className="text-sm text-red-600">{unlockError}</p>
          )}
          <input
            type="password"
            className="input w-full"
            placeholder="Paste ADMIN_API_KEY"
            value={unlockInput}
            onChange={(e) => setUnlockInput(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Unlock
          </button>
        </form>
        <p className="mt-6 text-xs text-text-muted">
          <Link href="/admin">← Data sources</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Submission moderation</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Approve, reject, or takedown. Accepting runs score/merge/notify.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="reviewing">Reviewing (queue)</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
          <Link href="/admin" className="text-sm text-brand-600">
            Sources
          </Link>
        </div>
      </div>

      {actionError && (
        <p className="mt-4 text-sm text-red-600">{actionError}</p>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-muted">No submissions for this filter.</p>
        ) : (
          rows.map((row) => (
            <article key={row.SubmissionId} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="badge bg-surface-alt">{row.Status}</span>
                  <span className="badge bg-brand-100 text-brand-800">
                    {row.Category}
                  </span>
                  <span className="badge bg-surface-alt">{row.Urgency}</span>
                  {row.PipelineOutcome && (
                    <span className="badge bg-surface-alt">
                      outcome: {row.PipelineOutcome}
                    </span>
                  )}
                </div>
                <code className="text-xs text-text-muted">
                  {row.SubmissionId}
                </code>
              </div>
              <h2 className="text-lg font-semibold">{row.Title}</h2>
              <p className="text-sm text-text-secondary line-clamp-4">
                {row.Description}
              </p>
              {row.ModerationReason && (
                <p className="text-xs text-text-muted">
                  Moderation: {row.ModerationReason}
                </p>
              )}
              {row.LinkedPainPointId && (
                <p className="text-xs">
                  Linked:{" "}
                  <Link
                    className="text-brand-600"
                    href={`/problems/${row.LinkedPainPointId}`}
                  >
                    {row.LinkedPainPointId}
                  </Link>
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {row.Status !== "accepted" && (
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    disabled={busyId === row.SubmissionId}
                    onClick={() => patchStatus(row.SubmissionId, "accepted")}
                  >
                    Approve + score
                  </button>
                )}
                {row.Status !== "declined" && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={busyId === row.SubmissionId}
                    onClick={() => patchStatus(row.SubmissionId, "declined")}
                  >
                    Decline / takedown
                  </button>
                )}
                {row.Status !== "reviewing" && row.Status !== "accepted" && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={busyId === row.SubmissionId}
                    onClick={() => patchStatus(row.SubmissionId, "reviewing")}
                  >
                    Move to queue
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
