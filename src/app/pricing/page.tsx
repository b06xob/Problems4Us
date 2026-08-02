import type { Metadata } from "next";
import { Suspense } from "react";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Early Access Pricing",
  description:
    "Join the Problems4Us waitlist and request Builder early-access seats for AI opportunity discovery.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Early Access Pricing — Problems4Us",
    description:
      "Join the Problems4Us waitlist and request Builder early-access seats for AI opportunity discovery.",
    url: "https://problems4us.com/pricing",
  },
};

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-6 py-12">Loading pricing…</div>}>
      <PricingPageClient />
    </Suspense>
  );
}
