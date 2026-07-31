# Content moderation / toxic ingest filter (problems4us-32)

**Status:** Implemented in repo + unit-tested; pending production deploy for Live=Yes.  
**Correlation:** `cos-hourly-pulse-20260731T224503Z`  
**Owner:** Problems4Us Agent (Audi)  
**As of (UTC):** 2026-07-31T23:22Z

## Policy

Before raw posts are written to the database or sent to AI extraction/scoring, the ingest pipeline drops content that is:

1. **Toxic / harassment** — conservative phrase denylist (e.g. explicit self-harm encouragement, racial slurs, sexual violence terms).
2. **PII-heavy** — emails, US phone-like numbers, SSN patterns, `password=` / `api_key=` style secrets, long provider tokens (`sk-`, `ghp-`, etc.).

Dropped items are **quarantined by omission** (not published to the public problem list). They are not stored as pain points.

## Where it runs

| Source | Hook |
|---|---|
| Reddit | After quality filters + ExternalId dedupe in `ingestSubreddit` / search path |
| GitHub Issues | After issue→raw mapping + dedupe in `ingestGitHubRepo` |
| Hacker News | After hit→raw mapping + dedupe in `ingestHackerNews` |

Code: `src/lib/ingest-moderation.ts`  
Wired: `src/lib/data-ingestion.ts` (`moderation` stats on `IngestionResult`)

## Sample evidence (unit)

`tests/ingest-moderation.test.ts` — keeps clean ops pain text; drops toxic phrase; drops email/secret posts; reports `droppedToxic` / `droppedPii` stats.

Local: `npm test -- --testPathPattern=ingest-moderation` → **4/4 passed** this cycle.

## Close criteria remaining

- Production deploy of this commit (GitHub Actions → `problems4us-linux`)
- Optional dry-run ingest response showing `moderation` field on a live path after deploy
- Formal plan mark `done` after Live smoke

## Relation to blockers

Does **not** require Reddit OAuth secrets to ship for GitHub/HN paths. Full three-source live proof still waits on `problems4us-11a` secrets for Reddit.
