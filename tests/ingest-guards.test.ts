/**
 * @jest-environment node
 */
import {
  resolveGitHubRepoTargets,
  resolveIngestDryRun,
} from "@/lib/ingest-guards";

describe("ingest-guards", () => {
  it("resolves dryRun from body or ?dryRun=1 query (query wins)", () => {
    expect(resolveIngestDryRun(false, new URLSearchParams("dryRun=1"))).toBe(
      true
    );
    expect(resolveIngestDryRun(true, new URLSearchParams("dryRun=0"))).toBe(
      false
    );
    expect(resolveIngestDryRun(true, new URLSearchParams())).toBe(true);
    expect(resolveIngestDryRun(false, null)).toBe(false);
    expect(resolveIngestDryRun(false, new URLSearchParams("dryRun=true"))).toBe(
      true
    );
  });

  it("resolves GitHub owner+repo / repos / targets shapes", () => {
    expect(
      resolveGitHubRepoTargets({ owner: "Azure", repo: "azure-cli" })
    ).toEqual(["Azure/azure-cli"]);
    expect(resolveGitHubRepoTargets({ repo: "Azure/azure-cli" })).toEqual([
      "Azure/azure-cli",
    ]);
    expect(
      resolveGitHubRepoTargets({ repos: ["Azure/azure-cli", "microsoft/vscode"] })
    ).toEqual(["Azure/azure-cli", "microsoft/vscode"]);
    expect(
      resolveGitHubRepoTargets({
        targets: [{ owner: "Azure", repo: "azure-cli" }],
      })
    ).toEqual(["Azure/azure-cli"]);
    expect(resolveGitHubRepoTargets({ repo: "azure-cli" })).toEqual([]);
  });
});
