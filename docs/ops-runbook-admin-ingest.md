# Ops runbook: admin sources + Reddit ingest (M1.3)

Owner: Problems4Us Agent (Audi)  
Production: https://problems4us.com  
Auth: `ADMIN_API_KEY` via header `x-admin-api-key` (or `Authorization: Bearer <key>`)

## Safety rules

1. Never commit `ADMIN_API_KEY` or Reddit OAuth secrets.
2. Prefer `dryRun: true` for first smoke after deploy.
3. Caps (enforced by API): `postLimit` 1–100, max 20 subreddits, max 10 search keywords.
4. Without `ADMIN_API_KEY` configured, owner endpoints return **503**. Wrong key → **401**.
5. On Windows PowerShell, always use `curl.exe` (not `curl`). Bare `curl` is an alias for `Invoke-WebRequest`; `curl -s URL` binds `-s` to `-SessionVariable` and leaves `-Uri` empty, which hangs on an interactive `Uri:` prompt.

## Reddit ToS + rate-limit mitigations (problems4us-11a)

| Control | Implementation |
|---------|----------------|
| Auth | OAuth client credentials / password grant via `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` (optional username/password). Never scrape HTML. |
| User-Agent | `Problems4Us/1.0 (Data Collection Bot)` on all Reddit HTTP calls (`src/lib/reddit-client.ts`). |
| 429 handling | On HTTP 429, honor `Retry-After` (default 5s) and retry once (`redditGet`). |
| Inter-request pacing | ~1200ms between comment-thread fetches; ~2000ms between subreddits in `ingestAllSubreddits`. |
| Request caps | API clamps `postLimit` ≤100, ≤20 subs, ≤10 search keywords (`ingest-guards`). |
| Quality filters | Min post score/comments, keyword denylist, ExternalId dedupe (`src/lib/reddit-quality-filters.ts`) before DB/AI writes. |
| Ops preference | Always dry-run first; avoid tight loops of live ingest against production. |

**Compliance posture:** Public subreddit content only via official Reddit API. Do not increase concurrency without Passport review. Escalate Warning to Passport if repeated 429s or auth failures persist >1 hour.

Defaults (code): `minPostScore=2`, `minPostComments=1`, `minCommentScore=1`, denylist includes spam/promo phrases (`upvote if`, giveaways, crypto airdrops, etc.).

## GitHub Issues ingest (problems4us-11b)

| Control | Implementation |
|---------|----------------|
| Auth | Optional `GITHUB_TOKEN` Bearer on App Service; unauthenticated works with lower rate limit |
| User-Agent | `Problems4Us/1.0 (Data Collection Bot)` |
| 429/403 | Honor `Retry-After` / retry once (`github-client`) |
| Caps | Max 10 repos/request; `perPage` ≤100; `maxPages` ≤5 |
| Quality | Drops PRs, short titles; ExternalId dedupe `github-issue-{id}` |
| Admin path | `GET/POST /api/ingest/github` (ADMIN_API_KEY) |

```powershell
# Dry-run default Azure/azure-cli issues
curl.exe -s -X POST https://problems4us.com/api/ingest/github `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"repo":"Azure/azure-cli","perPage":10,"dryRun":true}'
```

## Hacker News forums ingest (problems4us-11c)

| Control | Implementation |
|---------|----------------|
| Auth | None (public Algolia HN API) |
| User-Agent | `Problems4Us/1.0 (Data Collection Bot)` |
| Quality | Min title/body length + points floor (`hackernews-client`) |
| Caps | Max 5 queries; hitsPerPage ≤50; ~600ms between queries |
| Admin path | `GET/POST /api/ingest/hackernews` (ADMIN_API_KEY) |

```powershell
curl.exe -s -X POST https://problems4us.com/api/ingest/hackernews `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"hitsPerPage":10,"dryRun":true}'
```

Set the key once per shell session:

```powershell
$env:ADMIN_API_KEY = "<secret>"   # or rely on a User env var already set
```

## Health first

```powershell
curl.exe -s https://problems4us.com/api/health
# Expect: status=healthy, database=connected
```

## List configured Reddit targets

```powershell
curl.exe -s https://problems4us.com/api/ingest/reddit -H "x-admin-api-key: $env:ADMIN_API_KEY"
```

## Dry-run ingest (collect only, no AI / pain-point writes)

```powershell
curl.exe -s -X POST https://problems4us.com/api/ingest/reddit `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"mode":"fetch","subreddits":["sysadmin"],"postLimit":10,"dryRun":true}'
```

## Live ingest (writes raw posts + AI extraction when provider configured)

```powershell
curl.exe -s -X POST https://problems4us.com/api/ingest/reddit `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"mode":"fetch","subreddits":["sysadmin"],"postLimit":25,"dryRun":false}'
```

## Sources CRUD (admin)

```powershell
# List
curl.exe -s https://problems4us.com/api/sources -H "x-admin-api-key: $env:ADMIN_API_KEY"

# Create
curl.exe -s -X POST https://problems4us.com/api/sources `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"SourceType":"reddit","SourceName":"r/devops","SourceUrl":"https://reddit.com/r/devops"}'
```

## Failure triage

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| PowerShell prompts `Uri:` after `curl -s …` | Used `curl` alias (Invoke-WebRequest); `-s` → `-SessionVariable` | Cancel with Ctrl+C; re-run with `curl.exe` |
| 503 on ingest/sources | `ADMIN_API_KEY` unset in App Service | Set key; restart app |
| 401 | Wrong/missing key | Rotate check; confirm header name |
| 400 | Invalid mode / missing subreddits / over caps | Fix JSON body; see GET usage |
| 500 + Reddit errors | Reddit rate limit / OAuth | Retry later; verify Reddit app creds |
| AI errors in results | `AI_PROVIDER=mock` or missing Azure OpenAI | Keep mock for dryRun; set secrets for live AI |
| health degraded | SQL down | Check Azure SQL firewall / connection string |

## Evidence to publish (Intercom)

After a successful dry-run or live ingest, note in DailyStatus / Progress:

- HTTP status and `summary.totalPostsCollected`
- `summary.dryRun` and `summary.errorCount`
- Correlation id of the directing CoS task

## Unattended daily ingest (problems4us-11e prep)

| Item | Value |
|------|--------|
| Scheduler | GitHub Actions `.github/workflows/scheduled-daily-ingest.yml` |
| Cadence | `cron: 20 6 * * *` (daily 06:20 UTC) + `workflow_dispatch` |
| Sources | GitHub Issues + Hacker News hard-required; Reddit soft-fails while OAuth secrets missing |
| Secret | Repo secret `ADMIN_API_KEY` (same as alerts evaluate) |

Escalate Warning to Passport if the scheduled job fails twice in a row, or success rate stays below 60% for 2 consecutive days after Reddit secrets are restored.

## Builder entitlement pilot (G7 bypass)

While Stripe keys are unset, grant a pilot seat then verify briefs:

```powershell
curl.exe -s -X POST https://problems4us.com/api/checkout/entitlements `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"action":"grant","email":"pilot@example.com","note":"ops-pilot"}'

# Expect 200 + markdown when seat active and problemId exists
curl.exe -s "https://problems4us.com/api/builder/briefs?email=pilot@example.com&problemId=<id>"

# After smoke: dry-run then wipe leftover pilot seats only (paid Stripe seats untouched)
curl.exe -s -X POST https://problems4us.com/api/checkout/entitlements `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"action":"revoke_all_pilots","confirm":"REVOKE_ALL_PILOTS","dryRun":true}'
curl.exe -s -X POST https://problems4us.com/api/checkout/entitlements `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"action":"revoke_all_pilots","confirm":"REVOKE_ALL_PILOTS"}'
```
