import Link from "next/link";
import type { Metadata } from "next";
import { loadSharedBrief } from "@/lib/load-shared-brief";
import { ShareBriefCopyButton } from "@/components/share/ShareBriefCopyButton";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const token = params.token?.trim() || "";
  if (!token) {
    return { title: "Shared opportunity brief — Problems4Us" };
  }
  const result = await loadSharedBrief(token, { recordView: false });
  if (!result.ok) {
    return { title: "Shared opportunity brief — Problems4Us" };
  }
  return {
    title: `${result.title} — Shared brief | Problems4Us`,
    description: result.painPoint.Summary.slice(0, 160),
    robots: { index: false, follow: false },
  };
}

function formatExpiry(expUnix: number): string {
  try {
    return new Date(expUnix * 1000).toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(expUnix);
  }
}

function scoreTone(score: number): string {
  if (score >= 80) return "badge-critical";
  if (score >= 60) return "badge-high";
  if (score >= 40) return "badge-medium";
  return "badge-low";
}

export default async function SharedBriefPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token?.trim() || "";

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Shared opportunity brief
        </h1>
        <p className="text-text-secondary">
          This link is missing a share token. Ask the Builder who sent it for a
          fresh link.
        </p>
        <Link href="/" className="btn-primary mt-2">
          Go to Problems4Us
        </Link>
      </div>
    );
  }

  const result = await loadSharedBrief(token);

  if (!result.ok) {
    const headline =
      result.status === 403
        ? "This share link is invalid or expired"
        : result.status === 404
          ? "Opportunity not found"
          : result.status === 503
            ? "Share links are temporarily unavailable"
            : "Unable to open this brief";
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{headline}</h1>
        <p className="text-text-secondary">{result.error}</p>
        <Link href="/pricing" className="btn-primary mt-2">
          Get Builder early access
        </Link>
      </div>
    );
  }

  const { painPoint, ideas, scoreExplanation, markdown, shareExpiresAt } =
    result;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-brand-600">
        Shared opportunity brief
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            {painPoint.Title}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Category: {painPoint.Category}
            {painPoint.TrendDirection
              ? ` · Trend: ${painPoint.TrendDirection}`
              : ""}
            {" · "}
            Link expires {formatExpiry(shareExpiresAt)} ET
          </p>
        </div>
        <span
          className={`${scoreTone(painPoint.OpportunityScore)} text-sm px-3 py-1`}
        >
          {painPoint.OpportunityScore} · {scoreExplanation.label}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <ShareBriefCopyButton markdown={markdown} />
        <Link href="/pricing" className="btn-secondary">
          Get your own Builder seat
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Summary</h2>
        <p className="mt-2 whitespace-pre-wrap text-text-secondary">
          {painPoint.Summary.trim() || "No summary available."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">
          Why this score
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Composite {scoreExplanation.total}/100 ({scoreExplanation.label}).
          Top driver: {scoreExplanation.topDriver.label} (
          {(scoreExplanation.topDriver.weight * 100).toFixed(0)}% weight,
          contributes {scoreExplanation.topDriver.weighted} pts).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-2 pr-4 font-medium">Factor</th>
                <th className="py-2 pr-4 font-medium">Raw</th>
                <th className="py-2 pr-4 font-medium">Weight</th>
                <th className="py-2 font-medium">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {scoreExplanation.facets.map((facet) => (
                <tr key={facet.key} className="border-b border-border/60">
                  <td className="py-2 pr-4 text-text-primary">{facet.label}</td>
                  <td className="py-2 pr-4 text-text-secondary">{facet.raw}</td>
                  <td className="py-2 pr-4 text-text-secondary">
                    {(facet.weight * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 text-text-secondary">{facet.weighted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">
          Product ideas
        </h2>
        {ideas.length === 0 ? (
          <p className="mt-2 text-text-secondary">No linked ideas yet.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {ideas.map((idea, index) => (
              <li key={`${idea.Name}-${index}`}>
                <h3 className="font-semibold text-text-primary">
                  {index + 1}. {idea.Name}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-text-secondary">
                  {idea.Description.trim() || "No description."}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-text-muted">
                  {idea.TargetCustomer ? (
                    <li>Target customer: {idea.TargetCustomer}</li>
                  ) : null}
                  {idea.RecommendedFirstFeature ? (
                    <li>First feature: {idea.RecommendedFirstFeature}</li>
                  ) : null}
                  {typeof idea.RevenuePotentialScore === "number" &&
                  Number.isFinite(idea.RevenuePotentialScore) ? (
                    <li>Revenue potential: {idea.RevenuePotentialScore}</li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-12 border-t border-border pt-6 text-xs text-text-muted">
        Generated by Problems4Us Builder early-access. Problem ID:{" "}
        {painPoint.PainPointId}
      </p>
    </div>
  );
}
