"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmailSignup } from "@/components/home/EmailSignup";
import { BuilderCheckoutForm } from "@/components/pricing/BuilderCheckoutForm";
import { trackConversion } from "@/lib/conversion-events";
import { FOUNDING_PUBLIC_BLURB } from "@/lib/founding-cohort";

const tiers = [
  {
    id: "explorer",
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Browse problems, open basic detail, and submit pain points.",
    features: [
      "Browse the problem catalog",
      "Basic problem detail",
      "Submit problems",
    ],
    cta: "Join free waitlist",
    source: "pricing-explorer" as const,
    highlighted: false,
  },
  {
    id: "builder",
    name: "Builder (founding)",
    price: "$29",
    period: "/month",
    blurb: FOUNDING_PUBLIC_BLURB,
    features: [
      "Full opportunity scores + explainability",
      "Builder briefs and exports",
      "Saved problems",
      "Alerts",
      "Founding rate locked for life (first 25 customers)",
    ],
    cta: "Join Builder waitlist",
    source: "pricing-builder" as const,
    highlighted: true,
  },
];

type CheckoutStatus = {
  checkoutReady: boolean;
  sessionConfigured: boolean;
  webhookConfigured: boolean;
  billingForwardConfigured?: boolean;
};

type CheckoutReturn = "success" | "cancel" | null;

function readCheckoutReturn(): CheckoutReturn {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("checkout");
  if (value === "success" || value === "cancel") return value;
  return null;
}

export default function PricingPageClient() {
  const [checkoutResult, setCheckoutResult] = useState<CheckoutReturn>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus | null>(
    null
  );

  useEffect(() => {
    trackConversion("pricing_view", { page: "founding-builder" });
    const result = readCheckoutReturn();
    setCheckoutResult(result);
    if (result === "success") {
      trackConversion("checkout_return_success", {
        tier: "builder",
        page: "pricing",
      });
    } else if (result === "cancel") {
      trackConversion("checkout_return_cancel", {
        tier: "builder",
        page: "pricing",
      });
    }
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
        // Keep waitlist CTA if status probe fails — never block the page.
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
          Checkout completed — thank you. Builder founding access activates after
          payment confirmation.
        </p>
      ) : null}
      {checkoutResult === "cancel" ? (
        <p
          className="mb-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary"
          role="status"
        >
          Checkout canceled. You can retry below or stay on the free tier.
        </p>
      ) : null}

      <div className="mb-12 text-center">
        <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
          Founding cohort
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Simple pricing for builders
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
          {builderCheckoutReady
            ? "Builder founding checkout is live at $29/month for the first 25 customers. Free tier stays open."
            : "Founding Builder pricing is announced at $29/month for the first 25 seats. Checkout opens shortly — join the waitlist to be first in line. Free tier stays open now."}
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
                {tier.highlighted ? "Founding — 25 seats" : "Start here"}
              </button>
              {tier.id === "builder" && builderCheckoutReady ? (
                <BuilderCheckoutForm />
              ) : (
                <EmailSignup
                  source={tier.source}
                  ctaLabel={tier.cta}
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
