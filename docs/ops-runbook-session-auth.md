# Ops: Session auth + password reset + email verification (problems4us-22 / 22a / 22b)

Last updated: 2026-08-06 (Audi / Problems4Us Agent) — 22b email verification

## Session expiry

| Setting | Value |
| --- | --- |
| Cookie | `p4u_session` (httpOnly, SameSite=lax, Secure in production) |
| TTL | 30 days (`SESSION_TTL_DAYS`) |
| Storage | `UserSessions.TokenHash` + `ExpiresAt` (pepper: `SESSION_SECRET` or fallback `ADMIN_API_KEY`) |

`resolveSessionUser` rejects expired rows (`ExpiresAt > GETUTCDATE()`) and returns `emailVerified`.

## Rotation

- **Login**: deletes all prior `UserSessions` for that user, then mints a fresh token (rotate-on-login).
- **Logout**: deletes the current token hash row and clears cookie (`maxAge=0`).
- Stale expired sessions are cleaned when minting.

## Shared email-token mechanism

Password reset and email verification share `src/lib/auth-email-token.ts`:

- Mint: 32-byte `base64url` (`randomBytes`)
- Store: SHA-256 hash only, purpose-prefixed (`pwdreset` vs `emailverify`) so hashes are non-interchangeable
- Single-use + expiry; invalidate outstanding verify tokens on password change

## Password reset (problems4us-22a)

| Surface | Path |
| --- | --- |
| Request | `POST /api/auth/forgot-password` `{ email }` — generic 200 (no enumeration) |
| Complete | `POST /api/auth/reset-password` `{ token, password }` |
| UI | `/forgot-password`, `/reset-password?token=` |
| Ops issue (smoke) | `POST /api/admin/password-reset/issue` + `ADMIN_API_KEY` — returns raw token once |
| Storage | `PasswordResetTokens` (hash only, 60 min TTL, single-use) |
| Gate | **Requires `EmailVerifiedAt`** — unverified accounts get the same generic forgot response with no email sent |

## Email verification (problems4us-22b)

| Surface | Path |
| --- | --- |
| Register | `POST /api/auth/register` — creates **unverified** account; sends verify link; existing emails get generic 200 (no 409) |
| Confirm | `POST /api/auth/verify-email` `{ token }` |
| Resend | `POST /api/auth/resend-verification` `{ email }` — generic 200; rate-limited per IP (10/h) and per email (3/h) |
| UI | `/check-email`, `/verify-email?token=`, `/resend-verification` |
| Ops issue | `POST /api/admin/email-verification/issue` + `ADMIN_API_KEY` |
| Ops failures | `GET /api/admin/mail-failures` — hard/soft delivery failures |
| Storage | `UserAccounts.EmailVerifiedAt`, `EmailVerificationTokens` (24h TTL), `MailDeliveryFailures` |

### Unverified account policy

**May:** sign in, browse public catalog, save problems/ideas, watches/alerts.

**May not:** password reset, Builder brief export, paid entitlement claim as durable identity.

Pre-22b accounts are grandfathered (`EmailVerifiedAt = CreatedAt` on column add).

### Disposable domain policy

**Decision: BLOCK** known disposable domains at register/resend (`src/lib/disposable-email.ts`). Recorded in `DISPOSABLE_EMAIL_POLICY`.

### Email delivery

Same SendGrid or company SMTP path as password reset. Health: `ops.emailVerificationConfigured` (mirrors mailer readiness). Hard SMTP failures (550/551/553/5.1.x) are logged to `MailDeliveryFailures` and suppress further verify sends for that address for 30 days.

## Smoke

```powershell
$admin = $env:ADMIN_API_KEY
$email = "p4u22b+$(Get-Date -UFormat %s)@example.com"
# Register (201 + unverified)
Invoke-RestMethod -Method POST -Uri "https://problems4us.com/api/auth/register" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{ email = $email; password = "SmokePass1!" } | ConvertTo-Json)
# Ops issue token (when SMTP inbox not readable)
$issue = Invoke-RestMethod -Method POST -Uri "https://problems4us.com/api/admin/email-verification/issue" `
  -Headers @{ "x-admin-api-key" = $admin; "Content-Type" = "application/json" } `
  -Body (@{ email = $email } | ConvertTo-Json)
# Verify
Invoke-RestMethod -Method POST -Uri "https://problems4us.com/api/auth/verify-email" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{ token = $issue.token } | ConvertTo-Json)
# Replay must fail
```

Unit: `tests/email-verification.test.ts`, `tests/password-reset.test.ts`.

Code: `src/lib/auth-email-token.ts`, `src/lib/email-verification.ts`, `src/lib/disposable-email.ts`, `src/lib/user-db.ts`, auth verify/resend/register routes, admin email-verification + mail-failures.
