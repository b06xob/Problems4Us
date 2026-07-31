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
| HTTP entry | `POST /api/checkout/webhook` — **503** until secret present (correct under HOLD) |

Replay of the same `stripeEventId` must not double-grant (09d success criteria).

## Delivery options (Passport chooses one)

1. **Forward** — central verifier POSTs the verified event (or a normalized paid payload) to Problems4Us `POST /api/checkout/webhook` **or** a new internal apply route that skips Stripe signature and trusts a company forward secret.
2. **Shared company secret** — one Breivax webhook signing secret on `problems4us-linux` matching the central verifier (not a product-isolated invent).
3. **Pull** — central billing writes claim rows; Problems4Us admin/job applies Builder seats by email.

Until Passport documents which option, keep `/api/checkout/webhook` fail-closed without secret.

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

- Prod health `checkoutReady=false`, `sessionConfigured=false`, `webhookConfigured=false` (2026-07-31T22:49:50Z)
- `az webapp config appsettings list` for REDDIT/STRIPE keys on `problems4us-linux`: empty `[]` (confirmed this cycle)
