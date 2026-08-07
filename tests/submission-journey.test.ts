import {
  findBestCatalogMatch,
  jaccardSimilarity,
  opportunityPercentileRank,
  tokenizeForMatch,
} from "@/lib/submission-match";
import { triageSubmissionText } from "@/lib/submission-triage";

describe("submission-match", () => {
  it("tokenizes and computes jaccard", () => {
    const a = tokenizeForMatch("Azure reserved instance cost surprises");
    const b = tokenizeForMatch("Azure RI cost surprise billing");
    expect(jaccardSimilarity(a, b)).toBeGreaterThan(0.2);
  });

  it("finds a strong catalog match and skips weak ones", () => {
    const candidates = [
      {
        PainPointId: "pp-1",
        Title: "Azure Reserved Instance Cost Surprises",
        Summary:
          "Unexpected charges when workloads change on reserved instances",
        Category: "Cloud Infrastructure",
        OpportunityScore: 84,
      },
      {
        PainPointId: "pp-other",
        Title: "Unrelated printer jam workflow",
        Summary: "Office printers jam every Monday",
        Category: "IT Operations",
        OpportunityScore: 40,
      },
    ];
    const hit = findBestCatalogMatch(
      "Azure reserved instance billing surprises",
      "We keep getting unexpected reserved instance charges when VMs change",
      "Cloud Infrastructure",
      candidates
    );
    expect(hit?.painPointId).toBe("pp-1");

    const miss = findBestCatalogMatch(
      "Completely novel widget inventory sync",
      "Nobody has ever talked about flamingo-shaped SKU reconciliation before",
      "Other",
      candidates
    );
    expect(miss).toBeNull();
  });

  it("computes percentile rank without inventing data", () => {
    expect(opportunityPercentileRank(90, [10, 50, 90, 95])).toBe(75);
    expect(opportunityPercentileRank(50, [])).toBeNull();
  });
});

describe("submission triage (reuses problems4us-32 filter)", () => {
  it("auto-approves clean text", () => {
    const d = triageSubmissionText(
      "Cannot track license renewals across vendors",
      "We miss renewals every quarter because spreadsheets drift from vendor portals."
    );
    expect(d.status).toBe("accepted");
    expect(d.moderationAction).toBe("keep");
  });

  it("declines toxic content", () => {
    const d = triageSubmissionText(
      "Angry post",
      "honestly just kill yourself already if you cannot fix this tool"
    );
    expect(d.status).toBe("declined");
  });

  it("queues PII-heavy problem text for review", () => {
    const d = triageSubmissionText(
      "Need help with our outage",
      "Ping me at ops.lead@example.com about the production outage details"
    );
    expect(d.status).toBe("reviewing");
    expect(d.moderationAction).toBe("drop_pii");
  });
});

describe("auth-email-token shared mechanism (submissionverify)", () => {
  it("mints opaque tokens and hashes are purpose-isolated", async () => {
    const { mintAuthEmailToken, hashAuthEmailToken } = await import(
      "@/lib/auth-email-token"
    );
    const token = mintAuthEmailToken();
    expect(token.length).toBeGreaterThan(20);
    const subHash = hashAuthEmailToken("submissionverify", token);
    const acctHash = hashAuthEmailToken("emailverify", token);
    const pwdHash = hashAuthEmailToken("pwdreset", token);
    expect(subHash).not.toBe(acctHash);
    expect(subHash).not.toBe(pwdHash);
    expect(subHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
