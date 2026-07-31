# Source ToS + rate-limit compliance pack (problems4us-11d)

**Status:** Draft filed — **not closed** until `problems4us-11a` live Reddit smoke completes.  
**Correlation:** `cos-verify-mustang-login-20260731` (prior: `cos-verify-mustang-clean-retest-20260731`)  
**Owner:** Problems4Us Agent (Audi)  
**Audience:** Passport / Xavier  
**As of (UTC):** 2026-07-31T22:58Z

## Purpose

Single Passport-readable artifact covering robots/ToS posture, auth model, rate limits, and escalation for Reddit + GitHub Issues + Hacker News (forums) ingest.

Canonical ops detail remains in `ops-runbook-admin-ingest.md`. This pack is the executive rollup.

## Source matrix

| Source | Auth | ToS / robots posture | Rate-limit controls | Live status |
|---|---|---|---|---|
| Reddit | OAuth `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` (optional user/pass) | Public subreddit content via official API only; User-Agent `Problems4Us/1.0 (Data Collection Bot)`; no HTML scrape | 429 + `Retry-After` once; ~1200ms between comment threads; ~2000ms between subs; API caps `postLimit`≤100, ≤20 subs | **Blocked** — App Service secrets unset (`az` returned no REDDIT_* keys this cycle). Quality filters deployed. |
| GitHub Issues | Optional `GITHUB_TOKEN`; unauthenticated allowed at lower quota | Official Issues API; drops PRs; User-Agent as above | 429/403 honor `Retry-After`; max 10 repos/request; `perPage`≤100; `maxPages`≤5 | **Live** — prod smoke filed in `problems4us-11b-github-ingest-20260731.json` |
| Hacker News | None (public Algolia HN Search API) | Public forum search; respect provider ToS; no scrape of news.ycombinator.com HTML | ~600ms between queries; max 5 queries; hitsPerPage≤50 | **Live** — prod smoke filed in `problems4us-11c-hackernews-ingest-20260731.json` |

## Quality / safety before score publish

| Control | Where |
|---|---|
| Reddit min score/comments + keyword denylist + ExternalId dedupe | `src/lib/reddit-quality-filters.ts` |
| GitHub short-title / PR drop + ExternalId `github-issue-{id}` | `data-ingestion` / `github-client` |
| HN min length / points floor | `hackernews-client` |
| Admin fail-closed without `ADMIN_API_KEY` | `requireAdminAuth` |

Content moderation quarantine (`problems4us-32`) remains downstream of Reddit unblock.

## Escalation

Escalate **Warning+** to Passport when:

- Repeated 429/auth failures persist >1 hour on any watched source
- Daily scheduled ingest falls below 60% source success for 2 consecutive days
- Secrets appear in git or logs

## Unattended path (prep)

GitHub Action `.github/workflows/scheduled-daily-ingest.yml` — daily 06:20 UTC + `workflow_dispatch`.  
GitHub + HN hard-required; Reddit soft-fails while OAuth secrets missing.

## Close criteria for 11d

- This pack accepted as complete **and**
- `problems4us-11a` dry-run + live smoke after Reddit secrets restore

## Evidence pointers

- `ops-runbook-admin-ingest.md` (Reddit / GitHub / HN sections)
- `problems4us-11a-blocked-reddit-secrets-20260731.json`
- `problems4us-11b-github-ingest-20260731.json`
- `problems4us-11c-hackernews-ingest-20260731.json`
- `problems4us-11e-daily-ingest-ledger-20260731.json` (day-1 unattended GitHub+HN; Reddit soft-fail)
- `docs/contracts/PROBLEMS4US_CENTRALIZED_STRIPE_WEBHOOK_CONSUMER.md` (billing hold — separate workstream)
