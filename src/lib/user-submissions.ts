/**
 * Submission category taxonomy.
 *
 * 2026-08-07 founder direction: Problems4Us is a directory of real problems
 * people want solved — not an IT-scrape marketplace. Expand beyond the six
 * developer-forum buckets so genuine business submissions have somewhere to go.
 *
 * Grounded additions (have real-customer demand behind them):
 * - Content & Social Media / Marketing & Brand — first genuine submitter
 *   (Erlinda Franklin, sub-1786033545921-da4wso) landed in Other.
 *
 * Legacy IT categories retained for scraped catalog compatibility.
 * Further business categories (proposed, not yet wired until submissions land):
 * see docs/problems4us-category-taxonomy-proposal-20260807.json
 */
export const SUBMISSION_CATEGORIES = [
  "Content & Social Media",
  "Marketing & Brand",
  "Sales",
  "Customer Support",
  "Hiring & Talent",
  "Operations",
  "Finance & Accounting",
  "HR & People Ops",
  "Cloud Infrastructure",
  "IT Operations",
  "SQL Server Administration",
  "Accounting Software",
  "Security & Compliance",
  "Developer Tools",
  "Sales & Marketing",
  "Other",
] as const;
