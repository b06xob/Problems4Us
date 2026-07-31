# Ops runbook: Funnel KPI path (visits → activated → paid)

**Audience:** Passport / ops  
**Product:** Problems4Us  
**Closes:** problems4us-12 / problems4us-12c

## One-command Passport read path

With `ADMIN_API_KEY` set:

```powershell
curl.exe -s "https://problems4us.com/api/events?summary=1&hours=168" -H "x-admin-api-key: $env:ADMIN_API_KEY"
curl.exe -s "https://problems4us.com/api/waitlist?countOnly=1" -H "x-admin-api-key: $env:ADMIN_API_KEY"
curl.exe -s "https://problems4us.com/api/admin/activation" -H "x-admin-api-key: $env:ADMIN_API_KEY"
curl.exe -s "https://problems4us.com/api/checkout/entitlements?summary=1" -H "x-admin-api-key: $env:ADMIN_API_KEY"
```

## Field map

| Funnel stage | Source | Fields |
|---|---|---|
| Visits (proxy) | `/api/events?summary=1&hours=168` | `pricing_view`, `waitlist_view` |
| Waitlist | `/api/waitlist?countOnly=1` | `total` |
| Activated | `/api/admin/activation` | `totalAccounts`, `activatedAccounts` (rule: saved≥3 problems OR ≥1 idea) |
| Paid / entitled seats | `/api/checkout/entitlements?summary=1` | `activeBuilderSeats`, `activePilotSeats` |

## Paid seat definition (current)

Until centralized Stripe checkout is live (`checkoutReady=true`):

- **Count invite/pilot Builder seats** as entitled/paid seats (problems4us-09a).
- Stripe `paid_early_access` event count stays 0 while secrets/webhook are held.

When 09b unblocks, re-read entitlements + `paid_early_access` events; do not invent seats.

## Snapshot evidence

`Problems4US/docs/problems4us-12c-funnel-rollup-20260731.json`
