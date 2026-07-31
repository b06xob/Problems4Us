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

## Tests

`tests/ai-budget.test.ts`
