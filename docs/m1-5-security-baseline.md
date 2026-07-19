# M1.5 Security Baseline

Last updated: 2026-07-18 (Audi / Problems4Us Agent)

## Done

| Control | Evidence |
|---------|----------|
| No production secrets in git | `.env` gitignored; `.env.example` placeholders only |
| Admin fail-closed | `requireAdminAuth` returns 503 if `ADMIN_API_KEY` unset; 401 on mismatch (`tests/admin-auth.test.ts`) |
| Admin routes locked | ingest, sources, AI analyze/ideas, waitlist GET, events GET summary |
| Conversion POST strips PII keys | `/api/events` drops `email|password|token|secret|key` props |
| Submissions hide emails from public | `toPublicSubmission` strips `SubmitterEmail` unless admin |

## Funnel ops (M1.4 read path)

```powershell
# Use curl.exe on Windows PowerShell (bare curl aliases to Invoke-WebRequest)
curl.exe -s "https://problems4us.com/api/events?summary=1&hours=24" `
  -H "x-admin-api-key: $env:ADMIN_API_KEY"
```

Returns zero-filled counts for waitlist/pricing conversion events.

## Still human-gated

1. Azure OpenAI App Service secrets (M1.2) — flip `AI_PROVIDER=azure-openai`.
2. Stripe merchant keys (G7 / M2.2).
3. Rotate `ADMIN_API_KEY` if ever exposed in logs/chat.
