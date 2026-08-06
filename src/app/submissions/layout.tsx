import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Problems",
  description:
    "Browse approved community-submitted problems that have passed moderation and scoring.",
  alternates: { canonical: "/submissions" },
  openGraph: {
    title: "Community Problems — Problems4Us",
    description:
      "Browse approved community-submitted problems that have passed moderation and scoring.",
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
