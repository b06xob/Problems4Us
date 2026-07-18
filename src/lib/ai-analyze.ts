export type ExtractedPainPoint = {
  title: string;
  summary: string;
  category: string;
  severity: number;
};

export type AnalyzedPainPoint = {
  title: string;
  severity: number;
  frequency: number;
  willingnessToPay: number;
  category: string;
  snippet: string;
};

/** Safe public name for health/smoke — never includes secrets. */
export function resolveAiProviderName(
  env: NodeJS.ProcessEnv = process.env
): string {
  const raw = env.AI_PROVIDER?.trim();
  if (!raw) return "mock";
  if (raw === "azure-openai" || raw === "openai" || raw === "mock") return raw;
  return "mock";
}

/**
 * Maps AIProvider.extractPainPoints output into the analyze API response shape.
 * frequency / WTP are derived heuristics until dedicated provider scores are wired.
 */
export function mapExtractedPainPoints(
  extracted: ExtractedPainPoint[],
  sourceText: string
): AnalyzedPainPoint[] {
  const snippet = sourceText.slice(0, 200);
  if (!extracted.length) {
    return [
      {
        title: "General user frustration with current tooling",
        severity: 60,
        frequency: 65,
        willingnessToPay: 55,
        category: "General",
        snippet,
      },
    ];
  }

  return extracted.map((p) => {
    const severity = clampScore(p.severity, 60);
    return {
      title: p.title,
      severity,
      frequency: clampScore(Math.round(severity * 0.9), 55),
      willingnessToPay: clampScore(Math.round(severity * 0.95), 50),
      category: p.category || "General",
      snippet,
    };
  });
}

function clampScore(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}
