"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function VerifyEmailForm() {
  const router = useRouter();
  const search = useSearchParams();
  const tokenFromQuery = search.get("token") || "";
  const [token, setToken] = useState(tokenFromQuery);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  useEffect(() => {
    if (!tokenFromQuery) return;
    void submitToken(tokenFromQuery);
    // Auto-consume link token once on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromQuery]);

  async function submitToken(value: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Could not verify email.");
        return;
      }
      setDone(true);
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
      <h1 className="text-2xl font-bold text-text-primary">Verify email</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Confirm ownership of your address to unlock password reset and paid
        features.
      </p>
      {done ? (
        <div className="mt-8 space-y-3 rounded-lg border border-border bg-surface-alt px-4 py-5 text-sm text-text-secondary">
          <p>Email verified. You are all set.</p>
          <Link href="/problems" className="text-brand-600 hover:underline">
            Continue to problems
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
              {busy ? "Verifying…" : "Verify email"}
            </button>
          )}
          {error && (
            <p className="text-sm text-text-secondary">
              Need a new link?{" "}
              <Link
                href="/resend-verification"
                className="text-brand-600 hover:underline"
              >
                Resend verification
              </Link>
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 text-text-secondary">
          Loading…
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
