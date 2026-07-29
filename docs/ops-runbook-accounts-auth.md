# Accounts + saved problems/ideas (M2.1 / problems4us-08)

## Auth model

Email + password accounts with httpOnly session cookie `p4u_session` (30-day TTL).
Session tokens are stored hashed (SHA-256 with `SESSION_SECRET` or `ADMIN_API_KEY` pepper).
Passwords use Node `scrypt` (salt + hash in `UserAccounts`).

Managed IdP (Azure AD / Clerk / Auth0) can replace this later without changing saved-item tables.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create account + set session cookie |
| POST | `/api/auth/login` | public | Sign in + set session cookie |
| POST | `/api/auth/logout` | session optional | Revoke session + clear cookie |
| GET | `/api/auth/me` | session | Current user + activation |
| GET/POST/DELETE | `/api/me/saved/problems` | session | List / save / unsave problems (`painPointId`) |
| GET/POST/DELETE | `/api/me/saved/ideas` | session | List / save / unsave ideas (`productIdeaId`) |
| GET | `/api/admin/activation` | `ADMIN_API_KEY` | Activation metric for Passport/ops |

Bearer `Authorization` or `x-session-token` also accepted for API clients.

## Activation metric

An account is **activated** when:

- saved ideas ≥ 1, **or**
- saved problems ≥ 3

Measurable via `GET /api/admin/activation` → `activatedAccounts` / `totalAccounts`.

## Tables (auto-created on first use)

- `UserAccounts`
- `UserSessions`
- `SavedProblems`
- `SavedIdeas`

## Smoke (PowerShell)

```powershell
$email = "pilot+$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
$pass = "test-pass-123"
curl.exe -sS -c cookies.txt -X POST "https://problems4us.com/api/auth/register" `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"$email\",\"password\":\"$pass\"}"
curl.exe -sS -b cookies.txt -X POST "https://problems4us.com/api/me/saved/ideas" `
  -H "Content-Type: application/json" `
  -d "{\"productIdeaId\":\"idea-demo-1\"}"
curl.exe -sS -b cookies.txt "https://problems4us.com/api/auth/me"
curl.exe -sS -H "x-admin-api-key: $env:ADMIN_API_KEY" "https://problems4us.com/api/admin/activation"
```
