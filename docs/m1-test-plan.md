# Problems4Us Month-1 Test Plan

Last updated: 2026-07-18 (Audi / Problems4Us Agent)

## Scope

Month-1 production foundation: deploy health, SQL-backed waitlist funnel, AI analyze path, and early-access pricing surface.

## Gates

| Gate | What | Pass criteria | Status |
|------|------|---------------|--------|
| G1 Deploy health | `GET /api/health` on production | `status=healthy`, `database=connected` | Pass (2026-07-18) |
| G2 Waitlist write | `POST /api/waitlist` | HTTP 201 + `waitlistId` | Pass (2026-07-18) |
| G3 Waitlist read | Admin `GET /api/waitlist?countOnly=1` | `total >= 1` | Pass (2026-07-18, total=1) |
| G4 Pricing surface | `GET /pricing` | HTTP 200 | Pass |
| G5 Unit suite | `npm test` | All Jest suites green | Run each ship |
| G6 AI analyze | Admin `POST /api/ai/analyze` | 200 + `provider` field | Code path wired; prod still `AI_PROVIDER=mock` until Azure OpenAI secrets set |
| G7 Paid checkout | Stripe / marketplace | Charge succeeds | Blocked — Month-2 (merchant account) |

## Commands

```bash
# Local unit
npm test

# Prod health
curl -s https://problems4us.com/api/health

# Waitlist smoke (use a unique email)
curl -s -X POST https://problems4us.com/api/waitlist \
  -H "content-type: application/json" \
  -d '{"email":"smoke+<ts>@example.com","source":"hourly_smoke"}'

# Admin count (requires ADMIN_API_KEY)
curl -s "https://problems4us.com/api/waitlist?countOnly=1" \
  -H "x-admin-api-key: $ADMIN_API_KEY"
```

## Remaining for M1.2

1. Set App Service `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`.
2. Flip `AI_PROVIDER=azure-openai`.
3. Re-run G6 and confirm `provider=azure-openai` in analyze response / health.
