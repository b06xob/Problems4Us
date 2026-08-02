/**
 * Shared source-type helpers.
 * Reddit was removed as a product source (Founder directive 2026-08-02).
 * Legacy DB rows may still say SourceType=reddit — public surfaces must not.
 */

import type { SourceType } from "./types";

const PUBLIC_SOURCE_TYPES: readonly SourceType[] = [
  "github",
  "forum",
  "review",
  "social",
  "community",
] as const;

/** Source types allowed on create / admin forms after Reddit removal. */
export function allowedSourceTypes(): readonly SourceType[] {
  return PUBLIC_SOURCE_TYPES;
}

/**
 * Map legacy reddit attribution to community for any public/API response.
 * Also scrub reddit.com URLs and r/ names so crawlers never see Reddit.
 */
export function toPublicSourceType(type: string | null | undefined): SourceType {
  if (!type) return "forum";
  if (type === "reddit") return "community";
  if ((PUBLIC_SOURCE_TYPES as readonly string[]).includes(type)) {
    return type as SourceType;
  }
  return "forum";
}

export function toPublicSourceName(
  sourceType: string | null | undefined,
  sourceName: string | null | undefined
): string {
  const name = (sourceName ?? "").trim();
  if (sourceType === "reddit" || /^r\//i.test(name) || /reddit/i.test(name)) {
    return name.replace(/^r\//i, "").trim()
      ? "Community discussion"
      : "Community discussion";
  }
  return name || "Unknown source";
}

export function toPublicSourceUrl(
  sourceType: string | null | undefined,
  sourceUrl: string | null | undefined
): string {
  const url = (sourceUrl ?? "").trim();
  if (
    sourceType === "reddit" ||
    /reddit\.com/i.test(url) ||
    /redd\.it/i.test(url)
  ) {
    return "";
  }
  return url;
}
