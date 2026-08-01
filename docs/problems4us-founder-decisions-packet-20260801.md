# Problems4Us â€” Founder decisions packet (19:45 ET pulse)

**Agent:** Problems4Us Agent (Audi)  
**Correlation:** cos-hourly-pulse-20260801T234502Z  
**As of:** 2026-08-01T23:50:00Z  
**Purpose:** One page so Xavier can clear the only remaining Month-2 gates that engineering cannot close alone.

Live ops readiness (`GET /api/admin/ops-readiness` + `/api/health` ops flags) still shows four open Founder credential/direction gates. Health ops flags this pulse: Reddit / Stripe checkout / SendGrid / App Insights / billing-forward all false; `ADMIN_API_KEY` + OpenAI + SQL remain live (admin APIs succeed). Prod version: `v2026.08.01-5b63497`.

Ready-to-apply amendment drafts (apply only after explicit acceptance):

- Decision A â†’ `Problems4US/docs/problems4us-11f-github-hn-amendment-draft-20260801.md`
- Decision B â†’ `Problems4US/docs/problems4us-09f-invite-paid-path-amendment-draft-20260801.md`

---

## Decision A â€” Source mix (closes 11a / 11f path)

**Question:** Restore Reddit OAuth on `problems4us-linux`, or accept GitHub Issues + Hacker News as the Month-2 three-source bar (Reddit deferred)?

**Recommendation:** Accept GitHub + Hacker News as Month-2 bar **now**, and restore Reddit later as a growth add-on.

**Reason:** Daily unattended ingest already succeeds 2/3 sources (66%) for two consecutive UTC days with Reddit soft-failing on missing credentials. Live catalog still 186 problems (forum=180, reddit=5, github=1). This 19:45 ET pulse: HN dry-run OK (29 posts, `dryRun=true`); GitHub Azure/azure-cli OK (9 posts, `dryRun=true`); Reddit dry-run still credentials-missing on all 6 subs. Day-3 cron expected 2026-08-02T06:20:00Z. Waiting on Reddit secrets blocks the Month-2 source rollup without blocking customer value from GitHub+HN.

**Impact if approved:** Agent applies the 11f amendment draft, closes 11f, and finishes 11e after Day-3 (2026-08-02 cron ~06:20 UTC) without inventing Reddit traffic.

**Impact if declined (restore Reddit instead):** Xavier sets `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` on App Service; agent re-runs live Reddit smoke and clears 11a the same day.

**Deadline:** 2026-08-02 (before Day-3 cron narrative hardens around a permanent soft-fail).

**Default if no response:** Keep GitHub+HN running; leave 11a/11f blocked; do not invent Reddit success.

---

## Decision B â€” Month-2 paid path (closes 09 / 09f path)

**Question:** Treat invite-only Builder cohort + manual invoicing as the production paid path for Month-2, or wait for centralized `billing.breivax.com` Stripe webhook delivery?

**Recommendation:** Approve invite-only cohort as production paid path **now** (09a already live and smoke-tested), and keep centralized Stripe as the Month-3 hardening track.

**Reason:** Isolated Stripe on Problems4Us is on Founder HOLD. Centralized billing is a cross-product dependency. Invite grant/revoke + Builder entitlement enforcement already work in production (`checkoutReady=false`, 1 active pilot seat). Formal 09 close and funnel â€œpaid seatsâ€ KPI (12c) cannot finish without this direction.

**Impact if approved:** Agent applies the 09f amendment draft; closes 09f/09 rollup on invite cohort evidence; 12c can close with invite seats as paid/entitled; outreach (14b/18) can grant seats without waiting on Stripe secrets.

**Impact if declined:** Keep HOLD; 09/09b/09d/09f/12 stay open until `BREIVAX_BILLING_FORWARD_SECRET` + centralized webhook delivery are live.

**Deadline:** 2026-08-05 (keeps Month-2 monetization on schedule).

**Default if no response:** Invite cohort remains the only live paid path; plan steps stay blocked; no invented Stripe checkout.

---

## Decision C â€” External pilot outreach (closes 14b)

**Question:** Will Xavier run the first external (non-smoke) pilot outreach using the packed offer + demo + narratives?

**Recommendation:** Yes â€” schedule 3 outreach contacts this week.

**Pack path:** `Problems4US/docs/problems4us-14b-outreach-handoff-20260801.md` (offer, demo script, invite runbook, narratives prep).

**Impact if approved:** Real activation can move above 1/6; unlocks 14c/14d/16d usefulness batch.

**Impact if declined / deferred:** Activation stays at smoke baseline; agent will not invent external pilots.

**Deadline:** 2026-08-08.

**Default if no response:** 14b remains blocked with `humanActionRequired`.

---

## Adjacent credential gates (not full product-direction decisions)

| Step | Missing on App Service | What it unlocks |
|------|------------------------|-----------------|
| 22a | `SENDGRID_API_KEY` + `PASSWORD_RESET_FROM_EMAIL` | Self-serve password reset email |
| 30a | `APPLICATIONINSIGHTS_CONNECTION_STRING` | Production App Insights emission |

These are set-and-verify items, not strategy choices.

---

## Live snapshot this pulse

| Signal | Value |
|--------|-------|
| Health / DB / AI | healthy / connected / openai |
| Version | v2026.08.01-5b63497 |
| Daily ingest streak | 2/3 days â‰¥60% (Day-3 = 2026-08-02 cron) |
| Funnel (7d) | pricing_view=5, waitlist_view=40, activated=1/6, invite seats=1 |
| checkoutReady | false |
| Catalog | 186 (forum=180, reddit=5, github=1) |
