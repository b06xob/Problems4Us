"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Could not submit request.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not submit request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-text-primary">
        Resend verification
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Enter your account email. If an unverified account exists, we send a
        new link (rate-limited).
      </p>
      {done ? (
        <div className="mt-8 space-y-3 rounded-lg border border-border bg-surface-alt px-4 py-5 text-sm text-text-secondary">
          <p>
            If an unverified account exists for that email, a verification link
            was sent.
          </p>
          <Link href="/login" className="text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-secondary">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary"
            />
          </label>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Submitting…" : "Send verification link"}
          </button>
        </form>
      )}
    </div>
  );
}
