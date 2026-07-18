export const CONVERSION_EVENT_NAMES = [
  "waitlist_view",
  "waitlist_submit",
  "waitlist_success",
  "pricing_view",
  "pricing_cta_click",
  "early_access_interest",
  "paid_early_access",
] as const;

export type ConversionEventName = (typeof CONVERSION_EVENT_NAMES)[number];

export type ConversionFunnelCounts = Record<ConversionEventName, number> & {
  total: number;
};

export function isConversionEventName(value: unknown): value is ConversionEventName {
  return (
    typeof value === "string" &&
    (CONVERSION_EVENT_NAMES as readonly string[]).includes(value)
  );
}

/** Build a zero-filled funnel summary from DB count rows (unit-testable). */
export function buildConversionFunnelCounts(
  rows: Array<{ eventName: string; count: number }>
): ConversionFunnelCounts {
  const counts = Object.fromEntries(
    CONVERSION_EVENT_NAMES.map((name) => [name, 0])
  ) as Record<ConversionEventName, number>;

  let total = 0;
  for (const row of rows) {
    const n = Number(row.count) || 0;
    if (isConversionEventName(row.eventName)) {
      counts[row.eventName] += n;
    }
    total += n;
  }

  return { ...counts, total };
}

/** Fire-and-forget client helper; never throws into UI flows. */
export function trackConversion(
  eventName: ConversionEventName,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window === "undefined") return;

  const payload = {
    eventName,
    path: window.location.pathname,
    props: props ?? {},
  };

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* ignore network errors for analytics */
  });
}
