/**
 * Azure Application Insights helper (problems4us-30a).
 * Lightweight REST track (no SDK) — fail-soft when connection string unset.
 */

export const TELEMETRY_EVENTS = {
  ingestComplete: "ingest_complete",
  aiBudgetDenied: "ai_budget_denied",
  builderBriefExport: "builder_brief_export",
  alertEmitted: "alert_emitted",
} as const;

export type TelemetryEventName =
  (typeof TELEMETRY_EVENTS)[keyof typeof TELEMETRY_EVENTS];

type TrackProps = Record<string, string | number | boolean | undefined>;

export type AppInsightsConfig = {
  instrumentationKey: string;
  ingestionEndpoint: string;
};

export function getAppInsightsConnectionString(): string | null {
  const cs =
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING?.trim() ||
    process.env.APPINSIGHTS_CONNECTION_STRING?.trim() ||
    "";
  return cs || null;
}

export function isAppInsightsConfigured(): boolean {
  return Boolean(parseAppInsightsConnectionString(getAppInsightsConnectionString()));
}

/**
 * Parse APPLICATIONINSIGHTS_CONNECTION_STRING into key + ingestion host.
 */
export function parseAppInsightsConnectionString(
  connectionString: string | null | undefined
): AppInsightsConfig | null {
  if (!connectionString || !connectionString.trim()) return null;
  const parts = connectionString.split(";").map((p) => p.trim()).filter(Boolean);
  const map = new Map<string, string>();
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    map.set(part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1).trim());
  }
  const instrumentationKey =
    map.get("instrumentationkey") || map.get("instrumentation_key") || "";
  if (!instrumentationKey) return null;
  const ingestion =
    map.get("ingestionendpoint") ||
    map.get("ingestion_endpoint") ||
    "https://dc.services.visualstudio.com/";
  const ingestionEndpoint = ingestion.endsWith("/")
    ? `${ingestion}v2/track`
    : `${ingestion}/v2/track`;
  return { instrumentationKey, ingestionEndpoint };
}

function toStringProps(props?: TrackProps): Record<string, string> {
  const out: Record<string, string> = {};
  if (!props) return out;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

/**
 * Fire-and-forget custom event. Never throws to callers.
 */
export async function trackAppEvent(
  name: TelemetryEventName | string,
  properties?: TrackProps
): Promise<{ tracked: boolean; reason?: string }> {
  const cfg = parseAppInsightsConnectionString(getAppInsightsConnectionString());
  if (!cfg) {
    return {
      tracked: false,
      reason: "APPLICATIONINSIGHTS_CONNECTION_STRING unset",
    };
  }

  const envelope = {
    name: "Microsoft.ApplicationInsights.Event",
    time: new Date().toISOString(),
    iKey: cfg.instrumentationKey,
    tags: {
      "ai.cloud.role": "problems4us",
    },
    data: {
      baseType: "EventData",
      baseData: {
        ver: 2,
        name,
        properties: toStringProps(properties),
      },
    },
  };

  try {
    const res = await fetch(cfg.ingestionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([envelope]),
    });
    if (!res.ok) {
      console.error("App Insights track failed:", res.status);
      return { tracked: false, reason: `http_${res.status}` };
    }
    return { tracked: true };
  } catch (err) {
    console.error("App Insights track error:", err);
    return { tracked: false, reason: "network_error" };
  }
}

/** Sync wrapper for call sites that should not await telemetry. */
export function trackAppEventFireAndForget(
  name: TelemetryEventName | string,
  properties?: TrackProps
): void {
  void trackAppEvent(name, properties);
}
