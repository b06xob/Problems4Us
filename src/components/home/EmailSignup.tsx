"use client";

import { useEffect, useState } from "react";
import type { WaitlistSource } from "@/lib/waitlist";
import { trackConversion } from "@/lib/conversion-events";

interface EmailSignupProps {
  source?: WaitlistSource;
  ctaLabel?: string;
  onSuccess?: () => void;
}

export function EmailSignup({
  source = "landing",
  ctaLabel = "Get Early Access",
  onSuccess,
}: EmailSignupProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    trackConversion("waitlist_view", { source });
  }, [source]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || pending) return;

    setPending(true);
    setError(null);
    trackConversion("waitlist_submit", { source });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const payload = (await res.json()) as {
        error?: string;
        created?: boolean;
        message?: string;
      };

      if (!res.ok) {
        setError(payload.error ?? "Could not join waitlist. Try again.");
        return;
      }

      setAlreadyJoined(payload.created === false);
      setSubmitted(true);
      trackConversion("waitlist_success", {
        source,
        created: payload.created !== false,
      });
      onSuccess?.();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-50 px-6 py-4 dark:bg-brand-900/20">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-brand-600 shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
          {alreadyJoined
            ? "You were already on the list — we will email you at launch."
            : "You're on the list! We'll notify you when early access opens."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="input sm:min-w-[320px]"
        disabled={pending}
        autoComplete="email"
      />
      <button type="submit" className="btn-primary whitespace-nowrap" disabled={pending}>
        {pending ? "Joining…" : ctaLabel}
      </button>
      {error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400 sm:basis-full">{error}</p>
      ) : null}
    </form>
  );
}
