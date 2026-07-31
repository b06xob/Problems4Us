/**
 * @jest-environment node
 */
import {
  REDDIT_QUALITY_DEFAULTS,
  dedupeByExternalId,
  filterRedditContent,
  passesCommentEngagement,
  passesDenylist,
  passesPostEngagement,
} from "@/lib/reddit-quality-filters";

describe("reddit-quality-filters (problems4us-11a)", () => {
  it("drops low-score posts without substantial body", () => {
    expect(
      passesPostEngagement({
        id: "a",
        title: "Short complaint about tooling that is long enough",
        selftext: "",
        score: 0,
        num_comments: 5,
      })
    ).toBe(false);
  });

  it("keeps engaged posts meeting min score/comments", () => {
    expect(
      passesPostEngagement({
        id: "b",
        title: "Anyone else struggling with Azure AD sync failures?",
        selftext: "We keep hitting token expiry and broken SCIM every week.",
        score: REDDIT_QUALITY_DEFAULTS.minPostScore,
        num_comments: REDDIT_QUALITY_DEFAULTS.minPostComments,
      })
    ).toBe(true);
  });

  it("rejects denylist spam phrases", () => {
    expect(passesDenylist("Upvote if you agree", "please upvote this")).toBe(
      false
    );
    expect(
      passesDenylist(
        "SSO nightmare with our IdP",
        "Looking for alternatives after outages"
      )
    ).toBe(true);
  });

  it("filters comments by score and body length", () => {
    expect(
      passesCommentEngagement({
        id: "c1",
        body: "ok",
        score: 10,
      })
    ).toBe(false);
    expect(
      passesCommentEngagement({
        id: "c2",
        body: "We switched vendors after three outages in a month — still painful.",
        score: REDDIT_QUALITY_DEFAULTS.minCommentScore,
      })
    ).toBe(true);
  });

  it("dedupes by ExternalId", () => {
    const { unique, dropped } = dedupeByExternalId([
      { ExternalId: "t3_1", Title: "a" },
      { ExternalId: "t3_1", Title: "dup" },
      { ExternalId: "t3_2", Title: "b" },
    ]);
    expect(unique).toHaveLength(2);
    expect(dropped).toBe(1);
  });

  it("filterRedditContent applies engagement + denylist + dedupe", () => {
    const result = filterRedditContent({
      posts: [
        {
          id: "1",
          title: "Upvote if you like free giveaway crypto airdrop",
          selftext: "click here to claim",
          score: 100,
          num_comments: 50,
        },
        {
          id: "2",
          title: "MSP RMM agent keeps dying overnight — alternatives?",
          selftext:
            "Our monitoring agent crashes after patch Tuesday. Looking for a less painful stack.",
          score: 8,
          num_comments: 12,
        },
        {
          id: "2",
          title: "MSP RMM agent keeps dying overnight — alternatives?",
          selftext:
            "Our monitoring agent crashes after patch Tuesday. Looking for a less painful stack.",
          score: 8,
          num_comments: 12,
        },
        {
          id: "3",
          title: "hi",
          selftext: "",
          score: 0,
          num_comments: 0,
        },
      ],
      comments: [
        {
          id: "x",
          body: "same issue here after last Windows update broke GPO",
          score: 3,
        },
        { id: "y", body: "[deleted]", score: 1 },
      ],
    });

    expect(result.posts.map((p) => p.id)).toEqual(["2"]);
    expect(result.comments.map((c) => c.id)).toEqual(["x"]);
    expect(result.stats.droppedDenylist).toBeGreaterThanOrEqual(1);
    expect(result.stats.droppedLowEngagement).toBeGreaterThanOrEqual(1);
    expect(result.stats.droppedDedupe).toBe(1);
  });
});
