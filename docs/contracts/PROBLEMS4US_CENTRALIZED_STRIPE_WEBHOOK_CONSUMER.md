# Problems4Us — centralized Stripe webhook consumer contract (prep for problems4us-09b / -09d)

**Status:** Draft / readiness only — **does not** configure App Service Stripe secrets.  
**HOLD remains:** `cos-directive-20260731-hold-isolated-stripe` — no standalone `STRIPE_WEBHOOK_SECRET` on `problems4us-linux`.  
**Correlation:** `cos-verify-mustang-clean-retest-20260731`  
**Owner:** Problems4Us Agent (Audi)  
**As of (UTC):** 2026-07-31

## Goal

When `billing.breivax.com/webhooks/stripe` (or Founder-authorized equivalent) is live, Problems4Us must receive paid entitlement outcomes without owning an isolated Stripe webhook endpoint.

## Checkout metadata already stamped

`src/lib/stripe-checkout.ts` session create already sets:

| Metadata key | Problems4Us value |
|---|---|
| `product` | `Problems4Us` |
| `tier` | `builder` |

Central routing should key on `metadata.product == Problems4Us` (case-sensitive as stamped).

## Local apply path (already implemented, fail-closed)

| Capability | Location |
|---|---|
| Signature verify | `verifyStripeWebhookSignature` in `stripe-checkout.ts` |
| Event parse | `parseStripeWebhookEvent` |
| Paid extract | `extractPaidEarlyAccessFromEvent` (`checkout.session.completed`) |
| Idempotency | `insertPaidEarlyAccessEventDb` keyed by `stripeEventId` |
| Entitlement grant | `upsertPaidBuilderEntitlementDb` → `PlanEntitlements` |
| HTTP entry (legacy Stripe) | `POST /api/checkout/webhook` — **503** until `STRIPE_WEBHOOK_SECRET` present (correct under HOLD) |
| HTTP entry (company forward) | `POST /api/checkout/billing-forward` — **503** until `BREIVAX_BILLING_FORWARD_SECRET` present; auth via `x-breivax-billing-forward-secret` |
| Forward payload parse | `extractPaidEarlyAccessFromForwardPayload` (requires `stripeEventId` + `sessionId`; product=`Problems4Us`) |

Replay of the same `stripeEventId` must not double-grant (09d success criteria).

## Delivery options (Passport chooses one)

1. **Forward** — central verifier POSTs a normalized paid payload to Problems4Us `POST /api/checkout/billing-forward` with header `x-breivax-billing-forward-secret` matching App Service `BREIVAX_BILLING_FORWARD_SECRET`. **Implemented this cycle (HOLD-safe):** route fail-closed until company secret is set; does **not** require `STRIPE_WEBHOOK_SECRET`. Idempotent via `stripeEventId` → `insertPaidEarlyAccessEventDb` + Builder entitlement grant.
2. **Shared company secret** — one Breivax webhook signing secret on `problems4us-linux` matching the central verifier (not a product-isolated invent) on legacy `POST /api/checkout/webhook`.
3. **Pull** — central billing writes claim rows; Problems4Us admin/job applies Builder seats by email.

Until Passport documents which option and sets the matching secret, keep both routes fail-closed without secret.


## Near-term paid path (not blocked by this HOLD)

Invite-only cohort + manual invoicing (`problems4us-09a`) remains the live Builder seat path. Holding isolated webhook wiring does **not** invent a need for temporary standalone Stripe.

## Explicit non-goals under HOLD

- Do not set product-local `STRIPE_WEBHOOK_SECRET` / isolated `STRIPE_SECRET_KEY` on `problems4us-linux`
- Do not treat `checkoutReady=false` as an engineering defect while shared billing is unfinished
- Do not invent MRR or paid seats

## Unblock for 09b / 09d close

Any one of:

1. Passport confirms `billing.breivax.com/webhooks/stripe` exists and documents delivery option above, **or**
2. Founder explicitly authorizes temporary standalone Stripe on `problems4us-linux` (not requested), **or**
3. Founder formally closes Month-2 monetization on invite-only cohort and retargets 09b/09d to a shared-billing milestone

## Evidence this cycle

- Prod health `checkoutReady=false`, `sessionConfigured=false`, `webhookConfigured=false` (2026-07-31T22:55:04Z)
- `az webapp config appsettings list` for REDDIT/STRIPE keys on `problems4us-linux`: empty (reconfirmed)
- Unit tests: `tests/checkout-session.test.ts` — billing forward helpers (22/22 suite pass including 4 new forward cases)
- Route shipped: `src/app/api/checkout/billing-forward/route.ts` (HOLD-safe; no isolated Stripe webhook secret)
