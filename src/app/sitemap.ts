import type { MetadataRoute } from "next";

const SITE_URL = "https://problems4us.com";

/** Public, indexable routes only — exclude auth, admin, and per-user app surfaces. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-02");

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/problems`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/submissions`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ideas`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
