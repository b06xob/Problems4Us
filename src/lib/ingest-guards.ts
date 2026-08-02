/**
 * Validation and safety clamps for admin ingest requests.
 * Keeps owner APIs fail-closed on bad input and bounds cost/latency.
 * Shared helpers for GitHub Issues + Hacker News (Reddit ingest removed 2026-08-02).
 */

/**
 * Resolve dry-run from JSON body and/or ?dryRun=1|true query.
 * Query wins when present so ops curl patterns cannot accidentally write live.
 */
export function resolveIngestDryRun(
  bodyDryRun: unknown,
  searchParams?: URLSearchParams | null
): boolean {
  const q = searchParams?.get("dryRun");
  if (q !== null && q !== undefined) {
    const normalized = q.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes") {
      return true;
    }
    if (normalized === "0" || normalized === "false" || normalized === "no") {
      return false;
    }
  }
  return Boolean(bodyDryRun);
}

/**
 * Normalize GitHub ingest targets from repo / repos / owner+repo / targets fields.
 * Caller supplies defaults when this returns [].
 */
export function resolveGitHubRepoTargets(body: {
  repo?: unknown;
  repos?: unknown;
  owner?: unknown;
  targets?: unknown;
}): string[] {
  if (Array.isArray(body.repos) && body.repos.length > 0) {
    return body.repos
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  const owner = typeof body.owner === "string" ? body.owner.trim() : "";
  const repo = typeof body.repo === "string" ? body.repo.trim() : "";

  // owner + bare repo name (no slash) → owner/repo
  if (owner && repo && !repo.includes("/")) {
    return [`${owner}/${repo}`];
  }

  // "owner/repo" string
  if (repo && repo.includes("/")) {
    return [repo];
  }

  // targets: [{ owner, repo }] used by some ops probes
  if (Array.isArray(body.targets) && body.targets.length > 0) {
    const out: string[] = [];
    for (const t of body.targets) {
      if (!t || typeof t !== "object") continue;
      const rec = t as Record<string, unknown>;
      if (typeof rec.repo === "string" && rec.repo.includes("/")) {
        out.push(rec.repo.trim());
        continue;
      }
      const o = typeof rec.owner === "string" ? rec.owner.trim() : "";
      const r = typeof rec.repo === "string" ? rec.repo.trim() : "";
      if (o && r) out.push(`${o}/${r}`);
    }
    if (out.length > 0) return out;
  }

  return [];
}
