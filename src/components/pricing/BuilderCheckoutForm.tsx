"use client";

import { useState } from "react";
import { trackConversion } from "@/lib/conversion-events";

/**
 * Starts Stripe Checkout Session for Builder Early Access when G7 secrets are set.
 */
export function BuilderCheckoutForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || pending) return;

    setPending(true);
    setError(null);
    trackConversion("pricing_cta_click", {
      tier: "builder",
      label: "Start Builder checkout",
      mode: "stripe",
    });

    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier: "builder" }),
      });
      const payload = (await res.json()) as {
        error?: string;
        url?: string;
        configured?: boolean;
      };

      if (!res.ok || !payload.url) {
        setError(
          payload.error ??
            "Could not start checkout. Try again or join the waitlist."
        );
        return;
      }

      trackConversion("early_access_interest", {
        tier: "builder",
        mode: "stripe_redirect",
      });
      window.location.assign(payload.url);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
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
        {pending ? "Starting…" : "Start Builder checkout"}
      </button>
      {error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400 sm:basis-full">{error}</p>
      ) : null}
    </form>
  );
}
