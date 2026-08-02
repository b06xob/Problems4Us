import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

/** Problems4Us GA4 measurement ID (Breivax Technologies account). Do not reuse sister-site IDs. */
const GA4_MEASUREMENT_ID = "G-2KR0ZZPNBC";

const SITE_URL = "https://problems4us.com";
const SITE_NAME = "Problems4Us";
const SITE_TITLE =
  "Problems4Us — Turn Customer Complaints into Business Opportunities";
const SITE_DESCRIPTION =
  "AI-powered opportunity discovery platform. Scan Reddit, GitHub, forums, reviews, and social media to discover repeated customer pain points, cluster them with AI, score the opportunity, and suggest product ideas.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Problems4Us",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "pain points",
    "opportunity discovery",
    "customer complaints",
    "SaaS ideas",
    "market research",
    "AI analysis",
    "Problems4Us",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      knowsAbout: [
        "Opportunity discovery",
        "Customer pain points",
        "AI market research",
        "SaaS idea generation",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: SITE_TITLE,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
