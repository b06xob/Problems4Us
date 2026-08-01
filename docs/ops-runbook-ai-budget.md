# AI cost caps / token budget (problems4us-27)

## Defaults

| Cap | Env override | Default |
| --- | --- | --- |
| Per-request max chars | `AI_ANALYZE_MAX_CHARS` | 24,000 (~6k tokens) |
| Daily token budget (per instance) | `AI_DAILY_TOKEN_BUDGET` | 250,000 |

Estimate: `ceil(chars / 4)` tokens.

## Behavior

- `POST /api/ai/analyze` checks budget **before** calling the provider.
- Over per-request or daily cap → **HTTP 429** with reason (`per_request` | `daily`) — fail soft, not 500.
- Usage recorded after successful provider call (in-memory per App Service instance; multi-instance is additive ceiling, not a shared Redis ledger).

## Ops

```powershell
# Optional App Service settings
az webapp config appsettings set -n problems4us-linux -g rg-problems4us --settings AI_ANALYZE_MAX_CHARS=24000 AI_DAILY_TOKEN_BUDGET=250000
```

Runaway ingest that fans out analyze calls will hit 429 once the daily budget is consumed for that instance.

## Monthly AI cost ceiling (problems4us-19c)

Passport-readable check (no invented invoices):

```powershell
curl.exe -s "https://problems4us.com/api/admin/ai-cost-ceiling" `
  -H "x-admin-api-key: $env:ADMIN_API_KEY"

# After OpenAI invoice is known:
curl.exe -s "https://problems4us.com/api/admin/ai-cost-ceiling?aiSpendUsd=12.50&mrrUsd=0" `
  -H "x-admin-api-key: $env:ADMIN_API_KEY"
```

| Ceiling | Rule |
| --- | --- |
| % of MRR | AI spend ≤ 35% of MRR (when MRR > 0) |
| Low-MRR per activated | While MRR < $500: AI spend ≤ $15 / activated account / month |

- Missing spend → `status=invoice_pending` (not a breach). Set `AI_MONTHLY_SPEND_USD` on App Service or pass `?aiSpendUsd=`.
- First real invoice breach → `escalateWarningToPassport=true` — publish Intercom Warning+ to Passport/Xavier.
- Analyze path caps (above) stay enforced regardless of monthly invoice state.

## Tests

`tests/ai-budget.test.ts`  
`tests/ai-cost-ceiling.test.ts`
