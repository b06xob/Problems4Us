/**
 * Public site version metadata (company PUBLIC-SITE-VERSIONING-STANDARD).
 * Values are injected at build/deploy time — never hand-edited.
 */

export type SiteVersionInfo = {
  version: string;
  commit: string;
  deployedAt: string;
};

function trimEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Format: vYYYY.MM.DD-<7-char SHA> */
export function formatSiteVersion(deployDateUtc: string, shortSha: string): string {
  return `v${deployDateUtc}-${shortSha}`;
}

export function getSiteVersion(): SiteVersionInfo {
  const commit =
    trimEnv("NEXT_PUBLIC_GIT_COMMIT") ||
    trimEnv("GIT_COMMIT") ||
    "local";
  const shortSha = commit === "local" ? "local" : commit.slice(0, 7);
  const version =
    trimEnv("NEXT_PUBLIC_APP_VERSION") ||
    trimEnv("APP_VERSION") ||
    formatSiteVersion("local", shortSha);
  const deployedAt =
    trimEnv("NEXT_PUBLIC_DEPLOYED_AT") ||
    trimEnv("DEPLOYED_AT") ||
    "";

  return { version, commit, deployedAt };
}
