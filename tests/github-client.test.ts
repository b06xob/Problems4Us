/**
 * @jest-environment node
 */
import {
  isIngestibleIssue,
  parseRepoTarget,
  type GitHubIssue,
} from "@/lib/github-client";

function issue(partial: Partial<GitHubIssue>): GitHubIssue {
  return {
    id: 1,
    number: 1,
    title: "Azure CLI deploy fails with cryptic auth error",
    body: "When deploying with service principal the CLI returns 401 without actionable detail.",
    state: "open",
    html_url: "https://github.com/Azure/azure-cli/issues/1",
    user: { login: "dev" },
    comments: 2,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    ...partial,
  };
}

describe("github-client (problems4us-11b)", () => {
  it("parses owner/repo and github URLs", () => {
    expect(parseRepoTarget("Azure/azure-cli")).toEqual({
      owner: "Azure",
      repo: "azure-cli",
    });
    expect(parseRepoTarget("https://github.com/Azure/azure-cli.git")).toEqual({
      owner: "Azure",
      repo: "azure-cli",
    });
    expect(parseRepoTarget("not-a-repo")).toBeNull();
  });

  it("drops pull requests and tiny titles", () => {
    expect(isIngestibleIssue(issue({ pull_request: {} }))).toBe(false);
    expect(isIngestibleIssue(issue({ title: "fix", body: null }))).toBe(false);
    expect(isIngestibleIssue(issue({}))).toBe(true);
  });
});
