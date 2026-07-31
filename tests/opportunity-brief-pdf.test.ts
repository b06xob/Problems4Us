import {
  briefMarkdownToPdfLines,
  buildSimpleTextPdf,
  formatOpportunityBriefPdf,
} from "@/lib/opportunity-brief-pdf";
import { formatOpportunityBriefMarkdown } from "@/lib/opportunity-brief";

describe("opportunity brief PDF (problems4us-15b)", () => {
  const painPoint = {
    PainPointId: "pp-1",
    Title: "Azure Reserved Instance Cost Surprises",
    Summary: "Teams get surprise bills when reserved instances expire.",
    Category: "Cloud Cost",
    OpportunityScore: 82,
    SeverityScore: 80,
    FrequencyScore: 75,
    WillingnessToPayScore: 85,
    TrendScore: 70,
    MarketSizeScore: 65,
    TrendDirection: "up",
  };

  it("builds a PDF with %PDF header and EOF", () => {
    const pdf = formatOpportunityBriefPdf(painPoint, [
      {
        Name: "RI Expiry Watch",
        Description: "Alert before reserved instance renewals.",
      },
    ]);
    const text = Buffer.from(pdf).toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.includes("%%EOF")).toBe(true);
    expect(pdf.byteLength).toBeGreaterThan(400);
    expect(text).toContain("Azure Reserved Instance");
  });

  it("wraps long markdown lines for printable width", () => {
    const md = formatOpportunityBriefMarkdown(painPoint, []);
    const lines = briefMarkdownToPdfLines(md);
    expect(lines.some((l) => l.includes("Opportunity brief"))).toBe(true);
    expect(lines.every((l) => l.length <= 92)).toBe(true);
    const fromLines = buildSimpleTextPdf(lines, painPoint.Title);
    expect(fromLines.byteLength).toBeGreaterThan(200);
  });
});
