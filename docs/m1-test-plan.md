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
| G5 Unit suite | `npm test` | All Jest suites green | Pass (2026-07-18T03:48Z — checkout REST create + webhook stub) |
| G6 AI analyze | Admin `POST /api/ai/analyze` | 200 + `provider` field | Code path wired; prod still `AI_PROVIDER=mock` until Azure OpenAI secrets set |
| G7 Paid checkout | Stripe / marketplace | Charge succeeds | Blocked — merchant keys; session REST create wired; webhook fail-closed 503 until secret |
| G8 Admin ingest guards | Unit `ingest-guards` + unauth `POST /api/ingest/reddit` | Jest green; prod returns 401 without key | Pass (2026-07-18) |
| G9 Ops runbook | `docs/ops-runbook-admin-ingest.md` | Documented dry-run + triage | Pass (2026-07-18) |
| G10 Funnel summary | Admin `GET /api/events?summary=1` | 200 + zero-filled counts; auth required | Pass (prod 2026-07-18T02:48Z — 401 unauth / 200+counts with key) |
| G11 Security baseline | `docs/m1-5-security-baseline.md` | Admin fail-closed; secrets out of repo | Pass (2026-07-18) |

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

## Paid-path prep (G7 / Month-2)

Month-1 keeps `/pricing` as waitlist CTA only (no charge). Before enabling checkout:

1. Create Stripe account + activate live/test keys (human / finance).
2. Set App Service + local secrets (placeholders in `.env.example`):
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_BUILDER_MONTHLY` (Builder Early Access $49/mo)
3. `POST /api/checkout/session` fail-closes **503** when secrets unset; when set, creates Checkout Session via Stripe REST (no SDK).
4. `POST /api/checkout/webhook` fail-closes **503** until `STRIPE_WEBHOOK_SECRET`; next: signature verify + `checkout.session.completed` → `paid_early_access`.
5. Gate: smoke test charge in Stripe test mode; then flip live keys.

```bash
# Expect 503 until Stripe secrets are set
curl -s -X POST https://problems4us.com/api/checkout/session \
  -H "content-type: application/json" \
  -d '{"tier":"builder"}'

curl -s -X POST https://problems4us.com/api/checkout/webhook \
  -H "content-type: application/json" \
  -d '{}'
```

Hourly evidence (cos-hourly-pulse-20260718T034502Z): CI deploy 6739468 success (run 29627714274); prod checkout session **503** gate=G7; session REST create + webhook stub shipped.
