import type { Metadata } from "next";
import Link from "next/link";
import { ProblemSubmissionForm } from "@/components/submit/ProblemSubmissionForm";

export const metadata: Metadata = {
  title: "Submit a Problem",
  description:
    "Tell builders about a real problem you need solved. Problems4Us is a public directory where solution builders look for genuine demand.",
  alternates: { canonical: "/submit" },
  openGraph: {
    title: "Submit a Problem — Problems4Us",
    description:
      "Tell builders about a real problem you need solved. Real builders look here for problems worth solving.",
    url: "https://problems4us.com/submit",
  },
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 text-center">
        <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
          Real problems. Real builders.
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Where problems get solved
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          Problems4Us is a public directory of real problems from people who
          want a solution. Solution builders come here looking for genuine
          demand — we do not promise a fix, and we do not sit in the deal today.
          We do put your problem in front of people who build.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-xs text-text-muted">
          Submissions can become public, search-indexed pages under the name you
          choose. If your text includes identifying or sensitive detail, we will
          email you a privacy rewrite and wait for your choice before publishing
          either version.
        </p>
      </div>

      <ProblemSubmissionForm />

      <div className="mt-8 text-center">
        <Link
          href="/submissions"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Browse problems others have submitted →
        </Link>
      </div>
    </div>
  );
}
