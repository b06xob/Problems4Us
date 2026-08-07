# Problems4Us outbound mail probe policy

**Correlation:** cos-notification-noise-20260807  
**Effective:** 2026-08-07

## Rule

Never send mail from the **production sender** to an address that does not exist or that you do not control.

Forbidden against production SMTP/SendGrid:

- `@example.com`, `@example.org`, `@example.net`
- `*.invalid`, `*.localhost`, `*.test`
- Fabricated locals such as `p4u.verify.probe+…@…`

## Allowed verification approaches

1. An inbox you control (e.g. founder / agent-owned mailbox).
2. A mail-testing sink you own and can read.
3. Admin token issue endpoints that do **not** require a live delivery (`/api/admin/email-verification/issue`).

## Enforcement

Code: `src/lib/mail-recipient-policy.ts` (blocks send + submission intake).  
Ops: `docs/ops-runbook-session-auth.md`.  
Bounce handling: `src/lib/mail-bounce.ts` + `POST /api/admin/mail-failures`.
