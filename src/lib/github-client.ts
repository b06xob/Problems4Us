/**
 * GitHub Issues ingest client (problems4us-11b).
 * Uses GitHub REST API with optional GITHUB_TOKEN for higher rate limits.
 */

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user?: { login?: string } | null;
  comments: number;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
  labels?: Array<{ name?: string }>;
}

export interface GitHubIssuesFetchResult {
  repo: string;
  issues: GitHubIssue[];
  fetchedAt: string;
  rateLimitRemaining: number | null;
}

const USER_AGENT = "Problems4Us/1.0 (Data Collection Bot)";
const DEFAULT_REPOS = [
  { owner: "Azure", repo: "azure-cli", sourceId: "src-github-azure-cli" },
] as const;

export const TARGET_GITHUB_REPOS = DEFAULT_REPOS;

export type GitHubIssuesOptions = {
  state?: "open" | "closed" | "all";
  perPage?: number;
  maxPages?: number;
};

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubGet(url: string): Promise<Response> {
  const response = await fetch(url, { headers: githubHeaders() });
  if (response.status === 403 || response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") || "5");
    await new Promise((r) => setTimeout(r, Math.max(1000, retryAfter * 1000)));
    return fetch(url, { headers: githubHeaders() });
  }
  return response;
}

/** Drop PRs masquerading as issues and empty noise. */
export function isIngestibleIssue(issue: GitHubIssue): boolean {
  if (issue.pull_request) return false;
  const title = (issue.title || "").trim();
  if (title.length < 12) return false;
  const body = (issue.body || "").trim();
  if (!body && title.length < 40) return false;
  return true;
}

export async function fetchRepoIssues(
  owner: string,
  repo: string,
  options: GitHubIssuesOptions = {}
): Promise<GitHubIssuesFetchResult> {
  const state = options.state ?? "open";
  const perPage = Math.min(100, Math.max(1, options.perPage ?? 30));
  const maxPages = Math.min(5, Math.max(1, options.maxPages ?? 1));

  const issues: GitHubIssue[] = [];
  let rateLimitRemaining: number | null = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const url =
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues` +
      `?state=${state}&per_page=${perPage}&page=${page}&sort=updated&direction=desc`;

    const response = await githubGet(url);
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining != null) rateLimitRemaining = Number(remaining);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `GitHub issues fetch failed for ${owner}/${repo}: ${response.status} - ${text.slice(0, 300)}`
      );
    }

    const batch = (await response.json()) as GitHubIssue[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    issues.push(...batch.filter(isIngestibleIssue));
    if (batch.length < perPage) break;
    await new Promise((r) => setTimeout(r, 800));
  }

  return {
    repo: `${owner}/${repo}`,
    issues,
    fetchedAt: new Date().toISOString(),
    rateLimitRemaining,
  };
}

export function parseRepoTarget(
  input: string
): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/^https?:\/\/github\.com\//i, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    return null;
  }
  return { owner, repo };
}
