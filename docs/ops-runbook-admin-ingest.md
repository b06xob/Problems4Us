# Ops runbook: admin sources + GitHub/HN ingest

## Safety rules

1. Never commit `ADMIN_API_KEY` or other secrets.
2. Prefer `dryRun=true` (or `?dryRun=1`) before any live write.
3. Caps (enforced by API): GitHub/HN routes clamp page sizes; do not invent unbounded batch jobs.

## Content moderation (problems4us-32)

After ExternalId dedupe, drop toxic phrases + PII-heavy posts (`src/lib/ingest-moderation.ts`) before DB/AI. Applies to GitHub Issues and Hacker News.

## GitHub Issues ingest

```powershell
curl.exe -s -X POST https://problems4us.com/api/ingest/github `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"repo":"Azure/azure-cli","perPage":10,"dryRun":true}'
```

## Hacker News ingest

```powershell
curl.exe -s -X POST https://problems4us.com/api/ingest/hackernews `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"hitsPerPage":10,"dryRun":true}'
```

## Create a source row

```powershell
curl.exe -s -X POST https://problems4us.com/api/sources `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"SourceType":"github","SourceName":"Azure CLI Issues","SourceUrl":"https://github.com/Azure/azure-cli/issues"}'
```

Valid `SourceType` values: `github`, `forum`, `review`, `social`, `community`.
Reddit was removed entirely (Founder directive 2026-08-02, correlation `cos-remove-reddit-20260802`).

## Scheduled daily ingest (problems4us-11e)

| Field | Value |
| --- | --- |
| Workflow | `.github/workflows/scheduled-daily-ingest.yml` |
| Sources | GitHub Issues + Hacker News (hard-required) |
| Success | Both sources HTTP 200 (≥60% of attempted; currently 2/2) |
| Ledger | `POST/GET /api/admin/ingest-daily` |

Escalate Warning+ to Passport if the scheduled job fails twice in a row, or success rate stays below 60% for 2 consecutive days. `GET /api/admin/ingest-daily` exposes `ledger.escalateWarningToPassport` and `escalateWarning` for agent wakes — publish Intercom Warning+ when true.

## Common errors

| Status | Meaning | Action |
| --- | --- | --- |
| 401 | Missing/invalid admin key | Set `x-admin-api-key` |
| 400 | Invalid body | Fix JSON; see route GET usage |
| 500 | Upstream API / DB | Retry; check App Service logs |
