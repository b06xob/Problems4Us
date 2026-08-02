# M1.5 Security Baseline

Last updated: 2026-07-31 (Audi / Problems4Us Agent)

## Done

| Control | Evidence |
|---------|----------|
| No production secrets in git | `.env` gitignored; `.env.example` placeholders only |
| Admin fail-closed | `requireAdminAuth` returns 503 if `ADMIN_API_KEY` unset; 401 on mismatch (`tests/admin-auth.test.ts`) |
| Admin routes locked | ingest, sources, AI analyze/ideas, waitlist GET, events GET summary |
| Conversion POST strips PII keys | `/api/events` drops `email|password|token|secret|key` props |
| Submissions hide emails from public | `toPublicSubmission` strips `SubmitterEmail` unless admin |
| Shared brief PII strip + revoke | `/share/briefs` redacts emails/secret-like props; admin `POST /api/admin/share/revoke` denylists token hash (`src/lib/brief-share-revoke.ts`) |
| Public POST rate limits | Waitlist / auth register+login / checkout session return **429** when per-IP window exceeded (`src/lib/public-rate-limit.ts`, `tests/public-rate-limit.test.ts`) |
| AI analyze cost caps | Per-request char + daily token budget; **429** fail-soft (`src/lib/ai-budget.ts`, `docs/ops-runbook-ai-budget.md`) |
| Session expiry + rotation | Cookie `p4u_session` TTL 30d; login rotates prior sessions; logout revokes + clears cookie (`SESSION_POLICY`, `docs/ops-runbook-session-auth.md`) |
| Waitlist → account claim | Register links same-email waitlist row (`ClaimedAt`/`ClaimedUserId`) + `waitlist_account_upgrade` event |

## Public rate limits (problems4us-23)

| Route | Default | Window |
| --- | --- | --- |
| `POST /api/waitlist` | 20 / IP | 60s |
| `POST /api/auth/register` | 10 / IP | 60s |
| `POST /api/auth/login` | 30 / IP | 60s |
| `POST /api/checkout/session` | 15 / IP | 60s |

In-memory per App Service instance. Prefer Azure Front Door / WAF for edge abuse; these guards stop naive spray without breaking legitimate smoke.

## Still human-gated

```powershell
# Use curl.exe on Windows PowerShell (bare curl aliases to Invoke-WebRequest)
curl.exe -s "https://problems4us.com/api/events?summary=1&hours=24" `
  -H "x-admin-api-key: $env:ADMIN_API_KEY"
```

Returns zero-filled counts for waitlist/pricing conversion events.

## Share-link revoke (problems4us-15c)

```powershell
# Revoke a minted shareUrl token (consultants get 403 afterward)
curl.exe -s -X POST https://problems4us.com/api/admin/share/revoke `
  -H "x-admin-api-key: $env:ADMIN_API_KEY" `
  -H "content-type: application/json" `
  -d '{"token":"v1....","reason":"customer_request"}'
```

Expiry remains HMAC TTL (default 7 days). Revoke is immediate via `BriefShareRevocations` token-hash denylist.

## Still human-gated

1. Azure OpenAI App Service secrets (M1.2) — flip `AI_PROVIDER=azure-openai` (deferred; direct OpenAI is production standard).
2. Stripe merchant keys (G7 / M2.2) — HELD pending shared `billing.breivax.com/webhooks/stripe`.
3. Rotate `ADMIN_API_KEY` if ever exposed in logs/chat.
4. *(Removed 2026-08-02)* Reddit OAuth is no longer used — Founder directive `cos-remove-reddit-20260802`.
5. Password reset self-serve — deferred until email provider; risk documented in `ops-runbook-session-auth.md`.
6. Email delivery for score alerts (`problems4us-10a`) — deferred; in-app alerts remain.
