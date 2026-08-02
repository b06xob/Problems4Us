import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Problem Explorer",
  description:
    "Browse scored customer pain points discovered across Reddit, GitHub, forums, reviews, and social media.",
  alternates: { canonical: "/problems" },
  openGraph: {
    title: "Problem Explorer — Problems4Us",
    description:
      "Browse scored customer pain points discovered across Reddit, GitHub, forums, reviews, and social media.",
    url: "https://problems4us.com/problems",
  },
};

export default function ProblemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
