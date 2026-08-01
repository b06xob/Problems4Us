"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [deliverySent, setDeliverySent] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        deliverySent?: boolean;
      };
      if (!res.ok) {
        setError(json.error || "Could not submit request.");
        return;
      }
      setDeliverySent(
        typeof json.deliverySent === "boolean" ? json.deliverySent : null
      );
      setDone(true);
    } catch {
      setError("Could not submit request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-text-primary">Forgot password</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Enter your account email. If it matches an account, we send a reset link
        (when email delivery is configured).
      </p>
      {done ? (
        <div className="mt-8 space-y-3 rounded-lg border border-border bg-surface-alt px-4 py-5 text-sm text-text-secondary">
          <p>
            If an account exists for that email, password reset instructions were
            sent.
          </p>
          {deliverySent === false && (
            <p className="text-amber-700 dark:text-amber-400">
              Email delivery is not configured on this environment yet. Contact
              support or wait for the mailer to be wired.
            </p>
          )}
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
            {busy ? "Submitting…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-text-secondary">
        <Link href="/login" className="text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
