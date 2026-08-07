"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ChooseVersionInner() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const preset = params.get("choice")?.trim().toLowerCase() ?? "";
  const [choice, setChoice] = useState<"original" | "rewrite" | "">(
    preset === "original" || preset === "rewrite" ? preset : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    choice: string;
    message: string;
    published: boolean;
  } | null>(null);

  useEffect(() => {
    if (
      token &&
      (preset === "original" || preset === "rewrite") &&
      !done &&
      !busy
    ) {
      void submitChoice(preset);
    }
    // Auto-submit once when email deep-link includes choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitChoice(selected: "original" | "rewrite") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions/pii-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, choice: selected }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not record your choice.");
        return;
      }
      setDone({
        choice: selected,
        message: json.message ?? "Choice recorded.",
        published: Boolean(json.submission?.published),
      });
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (choice !== "original" && choice !== "rewrite") {
      setError("Please pick original or rewrite.");
      return;
    }
    await submitChoice(choice);
  }

  if (!token) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold">Missing choice link</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Open the link from your Problems4Us email to choose how your problem
          appears publicly.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold">Choice recorded</h1>
        <p className="mt-2 text-sm text-text-secondary">{done.message}</p>
        <p className="mt-1 text-xs text-text-muted">
          You selected the <strong>{done.choice}</strong> version. This consent
          is stored with your submission.
        </p>
        <Link href="/submissions" className="btn-primary mt-6 inline-flex">
          Browse community problems
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-6">
      <div>
        <h1 className="text-xl font-bold">Choose how your problem appears</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Whatever you pick becomes a public, search-indexed page under the name
          you submitted. We publish neither version until you choose.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <fieldset className="space-y-3">
        <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-4">
          <input
            type="radio"
            name="choice"
            value="original"
            checked={choice === "original"}
            onChange={() => setChoice("original")}
          />
          <span>
            <span className="font-medium text-text-primary">
              Keep my original wording
            </span>
            <span className="mt-1 block text-xs text-text-muted">
              Publishes exactly what you wrote (after email confirmation).
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-4">
          <input
            type="radio"
            name="choice"
            value="rewrite"
            checked={choice === "rewrite"}
            onChange={() => setChoice("rewrite")}
          />
          <span>
            <span className="font-medium text-text-primary">
              Use the privacy rewrite
            </span>
            <span className="mt-1 block text-xs text-text-muted">
              Direct identifiers removed; problem substance kept.
            </span>
          </span>
        </label>
      </fieldset>

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : "Confirm my choice"}
      </button>
    </form>
  );
}

export default function ChooseSubmissionVersionPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Suspense
        fallback={
          <div className="card text-center text-sm text-text-secondary">
            Loading…
          </div>
        }
      >
        <ChooseVersionInner />
      </Suspense>
    </div>
  );
}
