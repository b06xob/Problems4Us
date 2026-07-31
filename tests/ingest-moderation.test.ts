/**
 * @jest-environment node
 */
import {
  classifyModeration,
  containsHeavyPii,
  containsToxicContent,
  moderateRawPosts,
} from "@/lib/ingest-moderation";

describe("ingest-moderation (problems4us-32)", () => {
  it("keeps ordinary pain-point text", () => {
    const text =
      "Our Azure AD sync fails every Monday and SCIM tokens expire unexpectedly.";
    expect(containsToxicContent(text)).toBe(false);
    expect(containsHeavyPii(text)).toBe(false);
    expect(classifyModeration(text)).toBe("keep");
  });

  it("drops toxic harassment phrases", () => {
    expect(classifyModeration("honestly just kill yourself already")).toBe(
      "drop_toxic"
    );
  });

  it("drops email / secret-heavy posts", () => {
    expect(
      classifyModeration("Ping me at ops.lead@example.com about the outage")
    ).toBe("drop_pii");
    expect(
      classifyModeration("api_key=sk-abcdefghijklmnopqrstuvwxyz1234")
    ).toBe("drop_pii");
    expect(containsHeavyPii("ssn 123-45-6789 in the ticket")).toBe(true);
  });

  it("moderateRawPosts reports drop stats and keeps clean rows", () => {
    const { kept, stats } = moderateRawPosts([
      {
        Title: "Billing webhook retries overwhelm our queue",
        Body: "We need idempotency keys for Stripe events.",
        Author: "builder1",
      },
      {
        Title: "hate mail",
        Body: "you should die for shipping this",
        Author: "troll",
      },
      {
        Title: "Creds leaked",
        Body: "password=SuperSecret123 contact me",
        Author: "leak",
      },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].Title).toMatch(/Billing webhook/i);
    expect(stats).toEqual({
      inCount: 3,
      outCount: 1,
      droppedToxic: 1,
      droppedPii: 1,
    });
  });
});
