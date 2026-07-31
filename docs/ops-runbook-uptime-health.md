# Uptime / health monitor path (problems4us-17d)

## Purpose

Track availability of https://problems4us.com toward a **≥99% monthly** uptime target, and escalate when health is down for multiple hours.

## Probe

| Item | Value |
| --- | --- |
| Workflow | `.github/workflows/health-uptime-probe.yml` |
| Schedule | Hourly cron `5 * * * *` UTC (+ `workflow_dispatch`) |
| Endpoint | `GET https://problems4us.com/api/health` |
| Pass | HTTP 200 and JSON `status` contains `healthy` when present |
| Fail | Non-200 or unhealthy → GitHub Actions failure (visible to ops / Passport via CI) |

## Monthly uptime compute

1. Count scheduled probe runs in the calendar month (≈24 × days).
2. Count successful (green) runs.
3. `uptimePct = successes / attempts * 100`.
4. Target: `uptimePct >= 99`.

GitHub Actions → workflow runs for **Health uptime probe** are the source of truth for attempt/success counts until an external status page is added.

## Escalation

| Condition | Action |
| --- | --- |
| Single probe fail | Investigate App Service / SQL; retry `workflow_dispatch` |
| ≥2 consecutive hours fail | Treat as multi-hour downtime — publish Intercom **Warning+** to Passport (`humanActionRequired` if customer-facing) |
| Monthly uptime &lt; 99% | File reliability note in next DailyStatus; prioritize root cause |

## Manual check

```powershell
curl.exe -sS https://problems4us.com/api/health
```

## Related

- Deploy post-smoke: `.github/workflows/deploy.yml` (problems4us-17c)
- Health route: `src/app/api/health/route.ts`
