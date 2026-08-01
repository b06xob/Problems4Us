"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/use-session";

type AlertEvent = {
  AlertId: string;
  PainPointId: string;
  AlertType: string;
  Message?: string;
  CreatedAt: string;
  DeliveredAt?: string;
};

type WatchRow = {
  PainPointId: string;
  Muted?: boolean;
  AlertFrequency?: string;
};

export default function AlertsPage() {
  const session = useSession();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [watches, setWatches] = useState<WatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.loading) return;
    if (!session.authenticated) {
      setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [aRes, wRes] = await Promise.all([
          fetch("/api/me/alerts?limit=50", { credentials: "include" }),
          fetch("/api/me/watches", { credentials: "include" }),
        ]);
        if (!aRes.ok || !wRes.ok) {
          setError("Could not load alerts.");
          return;
        }
        const aJson = (await aRes.json()) as { data?: AlertEvent[] };
        const wJson = (await wRes.json()) as { data?: WatchRow[] };
        setAlerts(aJson.data || []);
        setWatches(wJson.data || []);
      } catch {
        setError("Could not load alerts.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [session.loading, session.authenticated]);

  if (session.loading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-hover" />
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-surface-hover" />
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Alerts inbox</h1>
        <p className="text-text-secondary">
          Sign in to see score and trend alerts for watched problems.
        </p>
        <div className="flex gap-3">
          <Link href="/login?next=/alerts" className="btn-primary">
            Sign in
          </Link>
          <Link href="/register?next=/alerts" className="btn-secondary">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Alerts inbox</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Signed in as {session.email}. In-app alerts for watched problems.
        </p>
      </header>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Recent alerts ({alerts.length})
        </h2>
        {alerts.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface-alt px-4 py-6 text-sm text-text-secondary">
            No alerts yet. Watch a problem from its detail page to get score-change
            notices here.
          </p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li
                key={a.AlertId}
                className="rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/problems/${encodeURIComponent(a.PainPointId)}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {a.PainPointId}
                  </Link>
                  <span className="text-xs text-text-muted">
                    {new Date(a.CreatedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {a.AlertType}
                  {a.Message ? ` — ${a.Message}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Watches ({watches.length})
        </h2>
        {watches.length === 0 ? (
          <p className="text-sm text-text-secondary">No watched problems.</p>
        ) : (
          <ul className="space-y-2">
            {watches.map((w) => (
              <li
                key={w.PainPointId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-2 text-sm"
              >
                <Link
                  href={`/problems/${encodeURIComponent(w.PainPointId)}`}
                  className="text-brand-600 hover:underline"
                >
                  {w.PainPointId}
                </Link>
                <span className="text-text-muted">
                  {w.Muted ? "muted" : w.AlertFrequency || "immediate"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
