# Ops runbook: admin triage cheatsheet (problems4us-30)

Owner: Problems4Us Agent (Audi)  
Production: https://problems4us.com  
Evidence: `problems4us-30-observability-20260731.json`  
Auth header: `x-admin-api-key` or `Authorization: Bearer <key>`

---

## Quick health

```powershell
curl.exe -sS https://problems4us.com/api/health
```

| Field | Healthy | Degraded action |
|-------|---------|-----------------|
| `status` | `healthy` | Check App Service + SQL |
| `database` | `connected` | Firewall, connection string, Azure SQL status |
| `aiProvider` | `openai` (prod) | Verify `AI_PROVIDER` + `OPENAI_API_KEY` |
| `checkout.checkoutReady` | `false` (expected until Stripe) | Not an outage — G7 gate |
| `ops.passwordResetEmailConfigured` | `true` when SendGrid wired | Else 22a self-serve email blocked |
| `ops.appInsightsConfigured` | `true` when App Insights CS set | Else 30a emission fail-soft |

Passport credential checklist (admin): `GET /api/admin/ops-readiness` — returns `openFounderGates[]` without secret values. Reddit OAuth gate removed 2026-08-02 (`cos-remove-reddit-20260802`).

Hourly probe: `.github/workflows/health-uptime-probe.yml` — see `ops-runbook-uptime-health.md`.

---

## HTTP 401 — Unauthorized

**Pattern (admin routes):**

```json
{ "error": "Unauthorized" }
```

**Source:** `requireAdminAuth()` in `src/lib/admin-auth.ts` when key is configured but header missing/wrong.

| Check | Action |
|-------|--------|
| Header name | Must be `x-admin-api-key` or `Bearer` token |
| Key value | Match App Service `ADMIN_API_KEY` setting |
| Timing-safe compare | Extra/missing chars → 401 (not 503) |

**User session 401:** `GET /api/auth/me` without valid `p4u_session` → `{ "error": "Unauthorized" }` via `unauthorizedJson()` in `src/lib/user-auth.ts`.

**Builder 403 (not 401):** No seat → `Builder early-access entitlement required`.

---

## HTTP 503 — Service unavailable / fail-closed

### Admin key not configured

```json
{
  "error": "Admin API key is not configured. Set ADMIN_API_KEY before using owner endpoints."
}
```

**Affected:** `/api/ingest/*`, `/api/sources*`, `/api/ai/*`, `/api/checkout/entitlements`, `/api/admin/*`, `/api/waitlist` (GET list), `/api/events` (GET summary).

**Action:** Set `ADMIN_API_KEY` on App Service → restart → retry.

### Database / user-table failures

Common user-facing messages (with `console.error` prefix in App Service logs):

| Log prefix | Route | JSON error |
|------------|-------|------------|
| `Register failed:` | POST `/api/auth/register` | `Could not create account. Database may be unavailable.` |
| `Login failed:` | POST `/api/auth/login` | `Could not sign in. Database may be unavailable.` |
| `List watches failed:` | GET `/api/me/watches` | `Could not list watches` |
| `Evaluate alerts failed:` | POST `/api/admin/alerts/evaluate` | `Could not evaluate alerts` |
| `Failed to load Builder entitlement:` | GET `/api/builder/briefs` | `Failed to verify Builder entitlement` (500) |

**Action:** Verify SQL connectivity; check Azure Portal → App Service → Log stream for the prefixed message + stack.

### Stripe fail-closed

| Route | When | Response |
|-------|------|----------|
| POST `/api/checkout/session` | `checkoutReady=false` | 503 — checkout not configured |
| POST `/api/checkout/webhook` | missing `STRIPE_WEBHOOK_SECRET` | 503 |

**Expected** until Founder provides Stripe secrets — not an ingest/AI outage.

### Share links unavailable

`GET /share/briefs?token=` may return **503** page copy: “Share links are temporarily unavailable” when `BRIEF_SHARE_SECRET` and fallback unset (`load-shared-brief.ts`).

---

## AI failures

### Admin analyze — POST `/api/ai/analyze`

| Status | Body pattern | Action |
|--------|--------------|--------|
| 400 | `Request body must include a non-empty 'text' field` | Fix JSON |
| 429 | `reason`, `dailyUsed`, `dailyCap`, `Retry-After: 3600` | Budget cap — wait or raise cap (`ai-budget.ts`) |
| 500 | `Failed to analyze text` | Check OpenAI key, provider errors in logs (catch block swallows detail in response) |

**Log:** No dedicated `console.error` in analyze catch — **gap:** failures only return generic 500.

### Ingest AI extraction errors

Ingest responses include per-source `errors[]` in JSON body; HTTP may still be 200 with `success: false`.

| Symptom | Likely cause |
|---------|--------------|
| `painPointsExtracted: 0` with posts | `AI_PROVIDER=mock` or OpenAI failure |
| GitHub 403/429 in errors | Rate limit — optional `GITHUB_TOKEN` |

**Log prefixes:**

- `GitHub ingestion error:` → 500
- `HN ingestion error:` → 500

---

## Ingest failures

See `ops-runbook-admin-ingest.md` for full matrix. Summary:

| HTTP | Cause |
|------|-------|
| 401 | Bad admin key |
| 503 | Admin key unset |
| 400 | Invalid body (missing repo / bad params) |
| 500 | Uncaught exception — read `error` string in body |

Reddit ingest was removed 2026-08-02 (`cos-remove-reddit-20260802`). Do not expect `/api/ingest/reddit` or `REDDIT_*` settings.

---

## Structured logging today

Logging is **`console.error("<context>:", error)`** on API route catch blocks — visible in **Azure App Service Log stream** and GitHub Actions deploy logs. There is **no** Application Insights SDK wired in `src/` as of 2026-07-31.

**Representative prefixes** (grep App Service logs):

```
Failed to fetch pain point detail:
Failed to verify Builder entitlement:
GitHub ingestion error:
HN ingestion error:
Evaluate alerts failed:
Register failed:
Login failed:
```

**Gaps:**

- No request correlation IDs
- AI analyze 500 hides error detail from client (by design) but also omits `console.error`
- No centralized log query — manual Log stream only

---

## Recommended next step: Application Insights

1. Create App Insights resource in `Prius_RG` (or shared Breivax monitoring RG).
2. Set App Service setting `APPLICATIONINSIGHTS_CONNECTION_STRING`.
3. Add `@azure/monitor-opentelemetry` or `applicationinsights` package to Next.js server bootstrap.
4. Emit custom events: `ingest_complete`, `ai_budget_denied`, `builder_brief_export`, `alert_emitted`.
5. Alert rules: 503 rate on `/api/health`, ingest 500 spike, OpenAI 429 burst.

Until wired, use:

- GitHub Actions health workflow failures → Passport escalate (≥2 consecutive hours)
- Manual Log stream + curl repro from this runbook

---

## One-page triage flow

```
503 on admin route?
  ├─ "Admin API key is not configured" → set ADMIN_API_KEY, restart
  └─ "Could not …" / DB errors → SQL firewall + connection string

401 on admin route?
  └─ Fix x-admin-api-key header

Ingest returns errors[] but HTTP 200?
  ├─ AI zero extraction → check AI_PROVIDER + OPENAI_API_KEY
  └─ Upstream rate limits → retry / GITHUB_TOKEN
  └─ Rate limit → retry with dryRun, smaller limits

AI analyze 429?
  └─ Daily budget — wait 1h or adjust ai-budget caps

Public page broken?
  └─ GET /api/problems/{id} — check Log stream for "Failed to fetch pain point detail"
```
