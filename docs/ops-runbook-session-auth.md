# Ops: Session auth + password reset (problems4us-22 / 22a)

Last updated: 2026-08-01 (Audi / Problems4Us Agent)

## Session expiry

| Setting | Value |
| --- | --- |
| Cookie | `p4u_session` (httpOnly, SameSite=lax, Secure in production) |
| TTL | 30 days (`SESSION_TTL_DAYS`) |
| Storage | `UserSessions.TokenHash` + `ExpiresAt` (pepper: `SESSION_SECRET` or fallback `ADMIN_API_KEY`) |

`resolveSessionUser` rejects expired rows (`ExpiresAt > GETUTCDATE()`).

## Rotation

- **Login**: deletes all prior `UserSessions` for that user, then mints a fresh token (rotate-on-login).
- **Logout**: deletes the current token hash row and clears cookie (`maxAge=0`).
- Stale expired sessions are cleaned when minting.

## Password reset (problems4us-22a)

| Surface | Path |
| --- | --- |
| Request | `POST /api/auth/forgot-password` `{ email }` — generic 200 (no enumeration) |
| Complete | `POST /api/auth/reset-password` `{ token, password }` |
| UI | `/forgot-password`, `/reset-password?token=` |
| Ops issue (smoke) | `POST /api/admin/password-reset/issue` + `ADMIN_API_KEY` — returns raw token once |
| Storage | `PasswordResetTokens` (hash only, 60 min TTL, single-use) |

### Email delivery

Self-serve email requires App Service settings:

- `SENDGRID_API_KEY`
- `PASSWORD_RESET_FROM_EMAIL` or `SENDGRID_FROM_EMAIL`

Until those are set, forgot-password still creates tokens but `deliverySent=false`. Formal user self-serve without admin is blocked on Founder wiring the mailer (same deferral posture as problems4us-10a).

### Ops smoke (no SendGrid)

```powershell
$admin = $env:ADMIN_API_KEY
$email = "pilot@example.com"
# Issue token
$issue = Invoke-RestMethod -Method POST -Uri "https://problems4us.com/api/admin/password-reset/issue" `
  -Headers @{ "x-admin-api-key" = $admin; "Content-Type" = "application/json" } `
  -Body (@{ email = $email } | ConvertTo-Json)
# Complete reset
Invoke-RestMethod -Method POST -Uri "https://problems4us.com/api/auth/reset-password" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{ token = $issue.token; password = "NewPassw0rd!" } | ConvertTo-Json)
```

## Smoke

```powershell
# Logout clears cookie — unit: tests/user-auth.test.ts
# Reset tokens — unit: tests/password-reset.test.ts
```

Code: `src/lib/user-auth.ts`, `src/lib/password-reset.ts`, `src/lib/user-db.ts`, `src/app/api/auth/forgot-password`, `src/app/api/auth/reset-password`, `src/app/api/admin/password-reset/issue`.
