import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Problems",
  description:
    "Browse community-submitted problems and help builders discover real opportunities.",
  alternates: { canonical: "/submissions" },
  openGraph: {
    title: "Community Problems — Problems4Us",
    description:
      "Browse community-submitted problems and help builders discover real opportunities.",
    url: "https://problems4us.com/submissions",
  },
};

export default function SubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
