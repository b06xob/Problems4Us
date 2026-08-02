import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Ideas",
  description:
    "Explore AI-generated product ideas with MVP roadmaps derived from scored customer pain points.",
  alternates: { canonical: "/ideas" },
  openGraph: {
    title: "Product Ideas — Problems4Us",
    description:
      "Explore AI-generated product ideas with MVP roadmaps derived from scored customer pain points.",
    url: "https://problems4us.com/ideas",
  },
};

export default function IdeasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
