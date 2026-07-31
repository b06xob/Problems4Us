# Ops runbook: invite-only paid cohort + manual invoicing (problems4us-09a)

**Purpose:** Close the paid Builder path **without Stripe** when Founder approves invite-only fallback. Admin grants synthetic pilot seats (`admin_pilot:*` session ids); invoices are handled outside the app.

**Gate:** Does **not** set `checkout.checkoutReady=true`. Stripe (`problems4us-09b`) remains optional once Founder accepts this cohort for production seats.

**Stripe note (2026-07-31):** Standalone product webhook secrets for 09b are **HELD** pending shared `billing.breivax.com/webhooks/stripe`. This invite-only path is the approved near-term paid route while that central billing endpoint lands. See `docs/problems4us-09b-hold-shared-billing-20260731.md`.

## Prerequisites

- `ADMIN_API_KEY` set on App Service `problems4us-linux`
- Prod healthy: `GET https://problems4us.com/api/health` → `status=healthy`, `database=connected`
- Known problem id for brief smoke (e.g. `pp-1`)

## Grant a Builder seat (invite / paid-manual)

```powershell
$email = "pilot+invite@example.com"   # real customer email in ops

curl.exe -s -X POST https://problems4us.com/api/checkout/entitlements `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d "{\"action\":\"grant\",\"email\":\"$email\",\"note\":\"invite-cohort\"}"
```

Expect: HTTP 200, entitlement `tier=builder`, `status=active`, session id prefixed `admin_pilot:`.

Funnel event: `admin_pilot_grant`.

## Verify Builder-gated surface

```powershell
# Without seat → 403
curl.exe -s "https://problems4us.com/api/builder/briefs?email=nosuch@example.com&problemId=pp-1"

# With seat → 200 markdown brief
curl.exe -s "https://problems4us.com/api/builder/briefs?email=$email&problemId=pp-1"
```

## Cohort list / hygiene

```powershell
curl.exe -s "https://problems4us.com/api/checkout/entitlements?summary=1" `
  -H "x-admin-api-key: $env:ADMIN_API_KEY"

curl.exe -s "https://problems4us.com/api/checkout/entitlements?list=1&pilotOnly=1" `
  -H "x-admin-api-key: $env:ADMIN_API_KEY"
```

### Wipe leftover pilot seats safely (problems4us-25)

Dry-run first (no mutations). Paid Stripe seats (`cs_*`) are never touched — only `admin_pilot:*` sessions.

```powershell
curl.exe -s -X POST https://problems4us.com/api/checkout/entitlements `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"action":"revoke_all_pilots","confirm":"REVOKE_ALL_PILOTS","dryRun":true}'

# Apply wipe after dry-run review
curl.exe -s -X POST https://problems4us.com/api/checkout/entitlements `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"action":"revoke_all_pilots","confirm":"REVOKE_ALL_PILOTS"}'
```

Confirm token must be exactly `REVOKE_ALL_PILOTS`. Funnel event: `admin_pilot_revoke_all`.

## Revoke one seat

```powershell
curl.exe -s -X POST https://problems4us.com/api/checkout/entitlements `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d "{\"action\":\"revoke\",\"email\":\"$email\"}"
```

Paid Stripe seats (`cs_*`) require confirm token `REVOKE_PAID` — never use that for pilot seats.

## Usage limits (documented intent)

| Surface | Without Builder entitlement | With active Builder |
|---|---|---|
| Public explore / ranking | Open | Open |
| `GET /api/builder/briefs` | 403 | 200 + optional share URL |
| Saved problems / ideas (auth) | Explorer defaults | Same auth path; Builder surfaces gated separately |

Saved-search / alert volume caps for Builder are tracked under `problems4us-09c` enforcement work; invite seats use the same entitlement row as paid Builder.

## Manual invoicing (out of band)

1. Founder records invite email + price + period (spreadsheet or billing tool).
2. Ops grants seat with `note` naming the invoice id (e.g. `inv-2026-07-001`).
3. On non-payment or end of period, ops revokes seat.
4. Do **not** invent Stripe sessions for these seats.

## Founder decision required to close problems4us-09

Either:

- Approve this invite-only cohort as production paid path while shared billing lands, **or**
- After Passport confirms `billing.breivax.com/webhooks/stripe` (or Founder authorizes temporary standalone), complete `problems4us-09b` so `checkoutReady=true`

Do **not** provision an isolated Problems4Us-only Stripe webhook secret while the shared-billing HOLD is active (`docs/problems4us-09b-hold-shared-billing-20260731.md`).

Engineering prep for this runbook is complete once grant/revoke smoke evidence is filed.
