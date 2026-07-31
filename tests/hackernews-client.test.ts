/**
 * @jest-environment node
 */
import { isIngestibleHnHit, type HnHit } from "@/lib/hackernews-client";

describe("hackernews-client (problems4us-11c)", () => {
  it("keeps substantive HN hits", () => {
    const hit: HnHit = {
      objectID: "1",
      title: "Why SaaS billing surprises still hurt teams",
      story_text: "Long discussion about unexpected invoice spikes and poor alert timing.",
      points: 12,
    };
    expect(isIngestibleHnHit(hit)).toBe(true);
  });

  it("drops empty low-signal hits", () => {
    expect(
      isIngestibleHnHit({ objectID: "2", title: "hi", points: 0 })
    ).toBe(false);
  });
});
