"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmailSignup } from "@/components/home/EmailSignup";
import { BuilderCheckoutForm } from "@/components/pricing/BuilderCheckoutForm";
import { trackConversion } from "@/lib/conversion-events";

const tiers = [
  {
    id: "explorer",
    name: "Explorer",
    price: "$0",
    period: "waitlist",
    blurb: "Browse scored problems and community submissions while we open seats.",
    features: [
      "Public problem explorer",
      "Community submissions",
      "Waitlist for AI scoring seats",
    ],
    cta: "Join free waitlist",
    source: "pricing-explorer" as const,
    highlighted: false,
  },
  {
    id: "builder",
    name: "Builder Early Access",
    price: "$49",
    period: "/mo planned",
    blurb: "Paid early-access pilot for builders who want AI scored opportunities and idea briefs.",
    features: [
      "Priority AI cluster + score runs",
      "Saved problem watchlist (Month 2)",
      "Idea brief drafts for top opportunities",
      "Founding-member pricing locked for 12 months",
    ],
    cta: "Request Builder seat",
    source: "pricing-builder" as const,
    highlighted: true,
  },
];

type CheckoutStatus = {
  checkoutReady: boolean;
  sessionConfigured: boolean;
  webhookConfigured: boolean;
};

export default function PricingPageClient() {
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get("checkout");
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus | null>(
    null
  );

  useEffect(() => {
    trackConversion("pricing_view", { page: "early-access" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/checkout/status");
        if (!res.ok) return;
        const data = (await res.json()) as CheckoutStatus;
        if (!cancelled) setCheckoutStatus(data);
      } catch {
        // Keep waitlist CTA if status probe fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const builderCheckoutReady = checkoutStatus?.checkoutReady === true;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {checkoutResult === "success" ? (
        <p
          className="mb-8 rounded-xl border border-brand-500/30 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
          role="status"
        >
          Checkout completed — thank you. We will email Builder onboarding next.
        </p>
      ) : null}
      {checkoutResult === "cancel" ? (
        <p
          className="mb-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary"
          role="status"
        >
          Checkout canceled. You can retry below or join the waitlist.
        </p>
      ) : null}

      <div className="mb-12 text-center">
        <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
          Early Access
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Pricing that funds real discovery
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
          {builderCheckoutReady
            ? "Builder Early Access checkout is ready. Explorer stays on the free waitlist."
            : "Month-1 monetization surface: join the waitlist now. Builder checkout activates when Stripe keys are set (G7)."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tiers.map((tier) => (
          <section
            key={tier.id}
            className={`rounded-2xl border p-8 ${
              tier.highlighted
                ? "border-brand-500 bg-brand-50/40 shadow-sm dark:bg-brand-900/10"
                : "border-border bg-surface"
            }`}
          >
            <h2 className="text-xl font-semibold text-text-primary">{tier.name}</h2>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
              <span className="text-sm text-text-secondary">{tier.period}</span>
            </p>
            <p className="mt-3 text-sm text-text-secondary">{tier.blurb}</p>
            <ul className="mt-6 space-y-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-text-primary">
                  <span className="text-brand-600" aria-hidden>
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <button
                type="button"
                className="mb-4 text-xs font-medium uppercase tracking-wide text-text-muted"
                onClick={() =>
                  trackConversion("pricing_cta_click", {
                    tier: tier.id,
                    label: tier.cta,
                  })
                }
              >
                {tier.highlighted ? "Recommended for pilots" : "Start here"}
              </button>
              {tier.id === "builder" && builderCheckoutReady ? (
                <BuilderCheckoutForm />
              ) : (
                <EmailSignup
                  source={tier.source}
                  ctaLabel={
                    tier.id === "builder" && checkoutStatus
                      ? "Join Builder waitlist"
                      : tier.cta
                  }
                  onSuccess={() =>
                    trackConversion("early_access_interest", { tier: tier.id })
                  }
                />
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-text-secondary">
        Prefer exploring first?{" "}
        <Link href="/problems" className="font-medium text-brand-600 hover:text-brand-700">
          Open the problem explorer
        </Link>{" "}
        or{" "}
        <Link href="/submit" className="font-medium text-brand-600 hover:text-brand-700">
          submit a pain point
        </Link>
        .
      </p>
    </div>
  );
}
