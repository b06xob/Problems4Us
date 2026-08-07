"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function VerifySubmissionForm() {
  const router = useRouter();
  const search = useSearchParams();
  const tokenFromQuery = search.get("token") || "";
  const [token, setToken] = useState(tokenFromQuery);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [published, setPublished] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  useEffect(() => {
    if (!tokenFromQuery) return;
    void submitToken(tokenFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromQuery]);

  async function submitToken(value: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        submission?: { status?: string; published?: boolean };
      };
      if (!res.ok) {
        setError(json.error || "Could not verify email.");
        return;
      }
      setDone(true);
      setPublished(Boolean(json.submission?.published));
      setStatus(json.submission?.status ?? null);
      router.refresh();
    } catch {
      setError("Could not verify email. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submitToken(token.trim());
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-text-primary">
        Confirm your email
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Verify ownership of the address you used when submitting a problem. We
        confirm the address before publishing.
      </p>
      {done ? (
        <div className="mt-8 space-y-3 rounded-lg border border-border bg-surface-alt px-4 py-5 text-sm text-text-secondary">
          <p>
            {published
              ? "Email verified. Your problem is live (or finishing scoring now)."
              : status === "reviewing"
                ? "Email verified. Your submission is still in human review."
                : "Email verified. Thank you."}
          </p>
          <Link href="/submissions" className="text-brand-600 hover:underline">
            Browse community problems
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {!tokenFromQuery && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text-secondary">
                Verification token
              </span>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary"
              />
            </label>
          )}
          {tokenFromQuery && busy && (
            <p className="text-sm text-text-secondary">Verifying…</p>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {!tokenFromQuery && (
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Verifying…" : "Confirm email"}
            </button>
          )}
        </form>
      )}
    </div>
  );
}

export default function VerifySubmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 text-sm text-text-secondary">
          Loading…
        </div>
      }
    >
      <VerifySubmissionForm />
    </Suspense>
  );
}
