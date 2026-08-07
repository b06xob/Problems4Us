import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Builder Founding Pricing",
  description:
    "Problems4Us free tier plus Builder founding at $29/month — first 25 customers, rate locked for life.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Builder Founding Pricing — Problems4Us",
    description:
      "Free browse and submit. Builder founding: $29/month for scores, briefs, saved problems, and alerts. Cap 25 seats, locked for life.",
    url: "https://problems4us.com/pricing",
  },
};

/**
 * No Suspense+useSearchParams shell: that pattern CSR-bailouts and left
 * production stuck on "Loading pricing…" when hydration lagged or failed.
 * Checkout return banners read window.search in the client instead.
 */
export default function PricingPage() {
  return <PricingPageClient />;
}
