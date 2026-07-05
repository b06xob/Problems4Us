import Link from "next/link";
import { ProblemSubmissionForm } from "@/components/submit/ProblemSubmissionForm";

export const metadata = {
  title: "Submit a Problem — Problems4Us",
  description:
    "Share a problem you need solved. Help builders and entrepreneurs discover real opportunities.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 text-center">
        <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
          Community
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Share a problem you need solved
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          Have a pain point that no product addresses well? Tell us about it.
          Your submission helps entrepreneurs and builders find real problems
          worth solving.
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
