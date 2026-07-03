import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

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
