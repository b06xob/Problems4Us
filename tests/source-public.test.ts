/**
 * @jest-environment node
 */
import {
  toPublicSourceName,
  toPublicSourceType,
  toPublicSourceUrl,
} from "@/lib/source-public";

describe("source-public", () => {
  it("maps reddit to community and scrubs URLs/names", () => {
    expect(toPublicSourceType("reddit")).toBe("community");
    expect(toPublicSourceType("github")).toBe("github");
    expect(toPublicSourceName("reddit", "r/sysadmin")).toBe(
      "Community discussion"
    );
    expect(toPublicSourceUrl("reddit", "https://reddit.com/r/sysadmin")).toBe(
      ""
    );
    expect(
      toPublicSourceUrl("forum", "https://news.ycombinator.com/item?id=1")
    ).toBe("https://news.ycombinator.com/item?id=1");
  });
});
