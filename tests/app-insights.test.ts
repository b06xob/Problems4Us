/**
 * @jest-environment node
 */
import {
  isAppInsightsConfigured,
  parseAppInsightsConnectionString,
  TELEMETRY_EVENTS,
  trackAppEvent,
} from "@/lib/app-insights";

describe("app-insights (problems4us-30a)", () => {
  const prev = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    } else {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = prev;
    }
  });

  it("parses connection string into key + ingestion endpoint", () => {
    const cfg = parseAppInsightsConnectionString(
      "InstrumentationKey=abc-123;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/"
    );
    expect(cfg).toEqual({
      instrumentationKey: "abc-123",
      ingestionEndpoint:
        "https://eastus-8.in.applicationinsights.azure.com/v2/track",
    });
  });

  it("returns null when connection string missing", () => {
    expect(parseAppInsightsConnectionString("")).toBeNull();
    expect(parseAppInsightsConnectionString(null)).toBeNull();
  });

  it("exposes required custom event names", () => {
    expect(TELEMETRY_EVENTS.ingestComplete).toBe("ingest_complete");
    expect(TELEMETRY_EVENTS.aiBudgetDenied).toBe("ai_budget_denied");
    expect(TELEMETRY_EVENTS.builderBriefExport).toBe("builder_brief_export");
    expect(TELEMETRY_EVENTS.alertEmitted).toBe("alert_emitted");
  });

  it("no-ops track when unset", async () => {
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    expect(isAppInsightsConfigured()).toBe(false);
    const result = await trackAppEvent(TELEMETRY_EVENTS.ingestComplete, {
      source: "test",
    });
    expect(result.tracked).toBe(false);
    expect(result.reason).toMatch(/unset/i);
  });
});
