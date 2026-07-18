/**
 * @jest-environment node
 */
import {
  INGEST_LIMITS,
  normalizeIngestRequest,
  summarizeIngestResults,
} from "@/lib/ingest-guards";

describe("ingest-guards", () => {
  it("requires subreddits for fetch mode", () => {
    const result = normalizeIngestRequest({ mode: "fetch" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/subreddits/i);
    }
  });

  it("accepts mode all with defaults and clamps postLimit", () => {
    const result = normalizeIngestRequest({
      mode: "all",
      postLimit: 999,
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mode).toBe("all");
      expect(result.value.postLimit).toBe(INGEST_LIMITS.maxPostLimit);
      expect(result.value.dryRun).toBe(true);
      expect(result.value.sort).toBe("new");
      expect(result.value.timeframe).toBe("week");
    }
  });

  it("rejects invalid mode/sort/timeframe", () => {
    expect(normalizeIngestRequest({ mode: "nope" }).ok).toBe(false);
    expect(
      normalizeIngestRequest({ mode: "all", sort: "weird" }).ok
    ).toBe(false);
    expect(
      normalizeIngestRequest({ mode: "all", timeframe: "forever" }).ok
    ).toBe(false);
  });

  it("caps subreddit and keyword list sizes", () => {
    const tooManySubs = Array.from({ length: 21 }, (_, i) => `sub${i}`);
    const tooManyKw = Array.from({ length: 11 }, (_, i) => `kw${i}`);
    expect(
      normalizeIngestRequest({ mode: "all", subreddits: tooManySubs }).ok
    ).toBe(false);
    expect(
      normalizeIngestRequest({
        mode: "search",
        searchKeywords: tooManyKw,
      }).ok
    ).toBe(false);
  });

  it("summarizes ingest results for ops status", () => {
    const summary = summarizeIngestResults([
      { postsCollected: 10, painPointsExtracted: 2, errors: [] },
      { postsCollected: 5, painPointsExtracted: 0, errors: ["rate limited"] },
    ]);
    expect(summary.subredditsProcessed).toBe(2);
    expect(summary.totalPostsCollected).toBe(15);
    expect(summary.totalPainPointsExtracted).toBe(2);
    expect(summary.errorCount).toBe(1);
    expect(summary.ok).toBe(false);
  });
});
