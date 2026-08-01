import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

/** Problems4Us GA4 measurement ID (Breivax Technologies account). Do not reuse sister-site IDs. */
const GA4_MEASUREMENT_ID = "G-2KR0ZZPNBC";

export const metadata: Metadata = {
  title: "Problems4Us — Turn Customer Complaints into Business Opportunities",
  description:
    "AI-powered opportunity discovery platform. Scan Reddit, GitHub, forums, reviews, and social media to discover repeated customer pain points, cluster them with AI, score the opportunity, and suggest product ideas.",
  keywords: [
    "pain points",
    "opportunity discovery",
    "customer complaints",
    "SaaS ideas",
    "market research",
    "AI analysis",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) — as early in head as possible */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
          strategy="beforeInteractive"
        />
        <Script id="ga4-gtag" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
