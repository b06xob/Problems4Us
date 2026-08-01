"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/use-session";

type Props = {
  painPointId: string;
};

export function ProblemEngagementControls({ painPointId }: Props) {
  const session = useSession();
  const [saved, setSaved] = useState(false);
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState<"save" | "watch" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    if (!session.authenticated) {
      setSaved(false);
      setWatching(false);
      return;
    }
    try {
      const [savedRes, watchRes] = await Promise.all([
        fetch("/api/me/saved/problems", { credentials: "include" }),
        fetch("/api/me/watches", { credentials: "include" }),
      ]);
      if (savedRes.ok) {
        const json = (await savedRes.json()) as {
          data?: { PainPointId: string }[];
        };
        setSaved(
          (json.data || []).some((r) => r.PainPointId === painPointId)
        );
      }
      if (watchRes.ok) {
        const json = (await watchRes.json()) as {
          data?: { PainPointId: string }[];
        };
        setWatching(
          (json.data || []).some((r) => r.PainPointId === painPointId)
        );
      }
    } catch {
      /* ignore — controls stay default */
    }
  }, [painPointId, session.authenticated]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function toggleSave() {
    if (!session.authenticated) return;
    setBusy("save");
    setMessage(null);
    try {
      const res = saved
        ? await fetch(
            `/api/me/saved/problems?painPointId=${encodeURIComponent(painPointId)}`,
            { method: "DELETE", credentials: "include" }
          )
        : await fetch("/api/me/saved/problems", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ painPointId }),
          });
      if (!res.ok) {
        setMessage("Could not update saved state.");
        return;
      }
      setSaved(!saved);
    } catch {
      setMessage("Could not update saved state.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleWatch() {
    if (!session.authenticated) return;
    setBusy("watch");
    setMessage(null);
    try {
      const res = watching
        ? await fetch(
            `/api/me/watches?painPointId=${encodeURIComponent(painPointId)}`,
            { method: "DELETE", credentials: "include" }
          )
        : await fetch("/api/me/watches", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ painPointId }),
          });
      if (!res.ok) {
        setMessage("Could not update watch state.");
        return;
      }
      setWatching(!watching);
    } catch {
      setMessage("Could not update watch state.");
    } finally {
      setBusy(null);
    }
  }

  if (session.loading) {
    return (
      <div className="mt-4 h-10 w-48 animate-pulse rounded-lg bg-surface-hover" />
    );
  }

  if (!session.authenticated) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-alt px-4 py-3 text-sm text-text-secondary">
        <span>Sign in to save and watch this problem.</span>
        <Link href={`/login?next=/problems/${encodeURIComponent(painPointId)}`} className="btn-primary text-sm">
          Sign in
        </Link>
        <Link
          href={`/register?next=/problems/${encodeURIComponent(painPointId)}`}
          className="btn-secondary text-sm"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={saved ? "btn-secondary" : "btn-primary"}
        disabled={busy !== null}
        onClick={() => void toggleSave()}
      >
        {busy === "save" ? "Saving…" : saved ? "Saved" : "Save problem"}
      </button>
      <button
        type="button"
        className={watching ? "btn-secondary" : "btn-primary"}
        disabled={busy !== null}
        onClick={() => void toggleWatch()}
      >
        {busy === "watch" ? "Updating…" : watching ? "Watching" : "Watch for alerts"}
      </button>
      <Link href="/alerts" className="text-sm text-brand-600 hover:underline">
        Alerts inbox
      </Link>
      {message && <span className="text-sm text-red-600">{message}</span>}
    </div>
  );
}
