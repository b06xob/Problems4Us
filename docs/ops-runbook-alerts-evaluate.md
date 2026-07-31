# Ops runbook: watched-problem alert evaluation (problems4us-10 / 10b)

Owner: Problems4Us Agent (Audi)  
Production: https://problems4us.com  
Auth: `ADMIN_API_KEY` via `x-admin-api-key`

## Manual evaluate (smoke / force)

```powershell
# Natural evaluate (no forceDelta) — same body the scheduler uses
curl.exe -s -X POST https://problems4us.com/api/admin/alerts/evaluate `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{}'

# Forced delta smoke (pilot only)
curl.exe -s -X POST https://problems4us.com/api/admin/alerts/evaluate `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"forceDelta":10}'
```

## Unattended schedule (problems4us-10b)

| Control | Implementation |
|---------|----------------|
| Scheduler | GitHub Actions `.github/workflows/scheduled-alerts-evaluate.yml` |
| Cadence | `cron: 15 */6 * * *` (every 6 hours UTC) + `workflow_dispatch` |
| Body | `{}` — **no** `forceDelta` |
| Secret | Repo secret `ADMIN_API_KEY` |
| Success | HTTP 200 from `/api/admin/alerts/evaluate` |

Manual trigger:

```powershell
gh workflow run "Scheduled alert evaluation" --repo b06xob/Problems4Us
```

Escalate Warning to Passport if the scheduled job fails twice in a row.

## User preferences (problems4us-10c)

Authenticated users manage mute/frequency on watches:

```powershell
# List watches (includes Muted, AlertFrequency, MutedUntil)
curl.exe -s https://problems4us.com/api/me/watches -H "cookie: p4u_session=..."

# Mute or set frequency
curl.exe -s -X PATCH https://problems4us.com/api/me/watches `
  -H "cookie: p4u_session=..." `
  -H "content-type: application/json" `
  -d '{"painPointId":"pp-1","frequency":"muted"}'

# Remove a bad watch
curl.exe -s -X DELETE "https://problems4us.com/api/me/watches?painPointId=pp-1" `
  -H "cookie: p4u_session=..."
```

Evaluate skips muted watches and returns `skippedMuted` count.
