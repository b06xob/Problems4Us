# Problems4Us — Founder decisions packet (11:45 ET pulse)

**Agent:** Problems4Us Agent (Audi)  
**Correlation:** cos-hourly-pulse-20260801T154503Z  
**As of:** 2026-08-01T15:50:30Z  
**Purpose:** One page so Xavier can clear the only remaining Month-2 gates that engineering cannot close alone.

Live ops readiness (`GET /api/admin/ops-readiness` + `/api/health` ops flags) still shows four open Founder credential/direction gates. Health ops flags this pulse: Reddit / Stripe checkout / SendGrid / App Insights / billing-forward all false; `ADMIN_API_KEY` + OpenAI + SQL remain live (admin APIs succeed).

---

## Decision A — Source mix (closes 11a / 11f path)

**Question:** Restore Reddit OAuth on `problems4us-linux`, or accept GitHub Issues + Hacker News as the Month-2 three-source bar (Reddit deferred)?

**Recommendation:** Accept GitHub + Hacker News as Month-2 bar **now**, and restore Reddit later as a growth add-on.

**Reason:** Daily unattended ingest already succeeds 2/3 sources (66%) for two consecutive UTC days with Reddit soft-failing on missing credentials. Live catalog now 186 problems (forum=180, reddit=5, github=1) after HN growth this morning. This pulse: HN dry-run path OK (29 posts); GitHub Azure/azure-cli OK; Reddit dry-run still credentials-missing on all 6 subs. Waiting on Reddit secrets blocks the Month-2 source rollup without blocking customer value from GitHub+HN.

**Impact if approved:** Agent amends 11a/11/11f success criteria to GitHub+HN-only, closes 11f, and finishes 11e after Day-3 (2026-08-02 cron) without inventing Reddit traffic.

**Impact if declined (restore Reddit instead):** Xavier sets `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` on App Service; agent re-runs live Reddit smoke and clears 11a the same day.

**Deadline:** 2026-08-02 (before Day-3 cron narrative hardens around a permanent soft-fail).

**Default if no response:** Keep GitHub+HN running; leave 11a/11f blocked; do not invent Reddit success.

---

## Decision B — Month-2 paid path (closes 09 / 09f path)

**Question:** Treat invite-only Builder cohort + manual invoicing as the production paid path for Month-2, or wait for centralized `billing.breivax.com` Stripe webhook delivery?

**Recommendation:** Approve invite-only cohort as production paid path **now** (09a already live and smoke-tested), and keep centralized Stripe as the Month-3 hardening track.

**Reason:** Isolated Stripe on Problems4Us is on Founder HOLD. Centralized billing is a cross-product dependency. Invite grant/revoke + Builder entitlement enforcement already work in production (`checkoutReady=false`, 1 active pilot seat). Formal 09 close and funnel “paid seats” KPI (12c) cannot finish without this direction.

**Impact if approved:** Agent closes 09f/09 rollup on invite cohort evidence; 12c can close with invite seats as paid/entitled; outreach (14b/18) can grant seats without waiting on Stripe secrets.

**Impact if declined:** Keep HOLD; 09/09b/09d/09f/12 stay open until `BREIVAX_BILLING_FORWARD_SECRET` + centralized webhook delivery are live.

**Deadline:** 2026-08-05 (keeps Month-2 monetization on schedule).

**Default if no response:** Invite cohort remains the only live paid path; plan steps stay blocked; no invented Stripe checkout.

---

## Decision C — External pilot outreach (closes 14b)

**Question:** Will Xavier run the first external (non-smoke) pilot outreach using the packed offer + demo + narratives?

**Recommendation:** Yes — schedule 3 outreach contacts this week.

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

## Evidence this pulse

- Health: `https://problems4us.com/api/health` — healthy, db connected, aiProvider=openai, checkoutReady=false, redditOAuthConfigured=false
- Ingest ledger: `GET /api/admin/ingest-daily` — 2/3 days; Reddit soft_credentials ×2
- Funnel: `GET /api/admin/funnel?hours=168` — pricing_view=5, waitlist_view=38, activated 1/6, invite seats 1, Stripe paid 0
- Ops readiness: `GET /api/admin/ops-readiness` — 4 open Founder gates
- Version at probe: `v2026.08.01-504a43c` (dry-run query parity deploy pending this pulse)
- Engineering: ingest `?dryRun=1` parity + GitHub owner/repo target shapes (unit 7/7)
