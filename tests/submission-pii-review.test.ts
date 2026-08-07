import { reviewSubmissionForPii } from "@/lib/submission-pii-review";
import { SUBMISSION_CATEGORIES } from "@/lib/user-submissions";

describe("submission PII review (founder choice model)", () => {
  it("strips direct identifiers but keeps problem substance", () => {
    const r = reviewSubmissionForPii(
      "Outage escalation is broken",
      "Ping me at ops.lead@example.com about the production outage. Call 415-555-0100. Our warehouse sync fails every Friday and burns four hours."
    );
    expect(r.hasDirectIdentifiers).toBe(true);
    expect(r.needsChoice).toBe(true);
    expect(r.rewriteChanged).toBe(true);
    expect(r.proposedDescription).not.toMatch(/ops\.lead@example\.com/i);
    expect(r.proposedDescription).not.toMatch(/415-555-0100/);
    expect(r.proposedDescription.toLowerCase()).toContain("warehouse sync");
    expect(
      r.findings.some((f) => f.bucket === "direct_identifier")
    ).toBe(true);
  });

  it("flags voluntary sensitive detail without stripping it", () => {
    const r = reviewSubmissionForPii(
      "Turning My Story Into a Social Media Growth System",
      "I have more than 40 years of corporate and technology leadership experience. My primary audience is women over 40. I need help turning faith and personal transformation into content that leads to paid opportunities."
    );
    expect(r.hasDirectIdentifiers).toBe(false);
    expect(r.hasVoluntarySensitive).toBe(true);
    expect(r.needsChoice).toBe(true);
    expect(r.proposedDescription.toLowerCase()).toContain("faith");
    expect(r.proposedDescription.toLowerCase()).toContain(
      "personal transformation"
    );
    expect(
      r.findings.some((f) => f.bucket === "substantive_context")
    ).toBe(true);
    expect(
      r.findings.some((f) => f.bucket === "voluntary_sensitive")
    ).toBe(true);
  });

  it("does not hold clean operational problems", () => {
    const r = reviewSubmissionForPii(
      "Cannot track license renewals across vendors",
      "We miss renewals every quarter because spreadsheets drift from vendor portals and nobody owns the calendar."
    );
    expect(r.needsChoice).toBe(false);
    expect(r.rewriteChanged).toBe(false);
  });
});

describe("submission categories (directory taxonomy)", () => {
  it("includes Content & Social Media and Marketing & Brand for real business problems", () => {
    expect(SUBMISSION_CATEGORIES).toContain("Content & Social Media");
    expect(SUBMISSION_CATEGORIES).toContain("Marketing & Brand");
    expect(SUBMISSION_CATEGORIES[SUBMISSION_CATEGORIES.length - 1]).toBe(
      "Other"
    );
  });
});
