import {
  mapExtractedPainPoints,
  resolveAiProviderName,
} from "@/lib/ai-analyze";

describe("resolveAiProviderName", () => {
  it("defaults to mock when unset", () => {
    expect(resolveAiProviderName({})).toBe("mock");
  });

  it("accepts known providers", () => {
    expect(resolveAiProviderName({ AI_PROVIDER: "azure-openai" })).toBe(
      "azure-openai"
    );
    expect(resolveAiProviderName({ AI_PROVIDER: "openai" })).toBe("openai");
    expect(resolveAiProviderName({ AI_PROVIDER: "mock" })).toBe("mock");
  });

  it("falls back to mock for unknown values", () => {
    expect(resolveAiProviderName({ AI_PROVIDER: "weird" })).toBe("mock");
  });
});

describe("mapExtractedPainPoints", () => {
  it("maps provider output into analyze API shape", () => {
    const mapped = mapExtractedPainPoints(
      [
        {
          title: "Billing confusion",
          summary: "Users churn after trial",
          category: "Cloud Cost Management",
          severity: 80,
        },
      ],
      "Our SaaS billing is confusing and customers churn after trial."
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0].title).toBe("Billing confusion");
    expect(mapped[0].category).toBe("Cloud Cost Management");
    expect(mapped[0].severity).toBe(80);
    expect(mapped[0].frequency).toBe(72);
    expect(mapped[0].willingnessToPay).toBe(76);
    expect(mapped[0].snippet).toContain("billing");
  });

  it("returns a general fallback when extraction is empty", () => {
    const mapped = mapExtractedPainPoints([], "no signal");
    expect(mapped).toHaveLength(1);
    expect(mapped[0].category).toBe("General");
  });

  it("clamps malformed severity and defaults blank category", () => {
    const mapped = mapExtractedPainPoints(
      [
        {
          title: "Odd scores",
          summary: "provider returned junk",
          category: "",
          severity: Number.NaN,
        },
        {
          title: "Over max",
          summary: "too high",
          category: "Security",
          severity: 999,
        },
      ],
      "source text with enough content to slice for a snippet field"
    );
    expect(mapped).toHaveLength(2);
    expect(mapped[0].severity).toBe(60);
    expect(mapped[0].category).toBe("General");
    expect(mapped[1].severity).toBe(100);
    expect(mapped[1].frequency).toBe(90);
    expect(mapped[1].willingnessToPay).toBe(95);
    expect(mapped[0].snippet.length).toBeLessThanOrEqual(200);
  });
});
