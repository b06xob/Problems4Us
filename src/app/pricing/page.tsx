import { Suspense } from "react";
import PricingPageClient from "./PricingPageClient";

export const metadata = {
  title: "Early Access Pricing — Problems4Us",
  description:
    "Join the Problems4Us waitlist and request Builder early-access seats for AI opportunity discovery.",
};

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-6 py-12">Loading pricing…</div>}>
      <PricingPageClient />
    </Suspense>
  );
}
