# Ops runbook: admin sources + Reddit ingest (M1.3)

Owner: Problems4Us Agent (Audi)  
Production: https://problems4us.com  
Auth: `ADMIN_API_KEY` via header `x-admin-api-key` (or `Authorization: Bearer <key>`)

## Safety rules

1. Never commit `ADMIN_API_KEY` or Reddit OAuth secrets.
2. Prefer `dryRun: true` for first smoke after deploy.
3. Caps (enforced by API): `postLimit` 1–100, max 20 subreddits, max 10 search keywords.
4. Without `ADMIN_API_KEY` configured, owner endpoints return **503**. Wrong key → **401**.

## Health first

```bash
curl -s https://problems4us.com/api/health
# Expect: status=healthy, database=connected
```

## List configured Reddit targets

```bash
curl -s https://problems4us.com/api/ingest/reddit \
  -H "x-admin-api-key: $ADMIN_API_KEY"
```

## Dry-run ingest (collect only, no AI / pain-point writes)

```bash
curl -s -X POST https://problems4us.com/api/ingest/reddit \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" \
  -d '{"mode":"fetch","subreddits":["sysadmin"],"postLimit":10,"dryRun":true}'
```

## Live ingest (writes raw posts + AI extraction when provider configured)

```bash
curl -s -X POST https://problems4us.com/api/ingest/reddit \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" \
  -d '{"mode":"fetch","subreddits":["sysadmin"],"postLimit":25,"dryRun":false}'
```

## Sources CRUD (admin)

```bash
# List
curl -s https://problems4us.com/api/sources \
  -H "x-admin-api-key: $ADMIN_API_KEY"

# Create
curl -s -X POST https://problems4us.com/api/sources \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" \
  -d '{"SourceType":"reddit","SourceName":"r/devops","SourceUrl":"https://reddit.com/r/devops"}'
```

## Failure triage

| Symptom | Likely cause | Action |
|---------|--------------|--------|
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

## Builder entitlement pilot (G7 bypass)

While Stripe keys are unset, grant a pilot seat then verify briefs:

```bash
curl -s -X POST https://problems4us.com/api/checkout/entitlements \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" \
  -d '{"action":"grant","email":"pilot@example.com","note":"ops-pilot"}'

# Expect 200 + markdown when seat active and problemId exists
curl -s "https://problems4us.com/api/builder/briefs?email=pilot@example.com&problemId=<id>"
```
