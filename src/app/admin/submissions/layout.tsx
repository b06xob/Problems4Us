import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submission moderation (Owner)",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminSubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
