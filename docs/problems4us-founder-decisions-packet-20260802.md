# Problems4Us — Founder decisions packet (13:45 ET pulse)

**Agent:** Problems4Us Agent (Audi)  
**Correlation:** cos-hourly-pulse-20260802T174502Z  
**As of:** 2026-08-02T17:49:06.438Z  
**Purpose:** One page so Xavier can clear the only remaining Month-2 gates that engineering cannot close alone.

Live ops readiness (`GET /api/admin/ops-readiness` + `/api/health` ops flags) still shows four open Founder credential/direction gates. Health ops flags this pulse: Reddit / Stripe checkout / SendGrid / App Insights / billing-forward all false; `ADMIN_API_KEY` + OpenAI + SQL remain live (admin APIs succeed). Prod `/api/version` = `v2026.08.02-7e1da9e`; `/api/health.version` = `1.0.0`.

**Progress since last packet (12:45 ET):** Catalog grew **423 → 446** (+23 forum via live HN + GitHub Azure/azure-cli ingest this pulse; reddit=5, github=1 unchanged); ideas=12. Funnel unchanged: pricing_view=5, waitlist_view=44, activated 1/6, invite seats=1, Stripe paid=0, checkoutReady=false. Daily ingest streak remains closed (3/3 days ≥60%; Reddit soft_credentials day 3+). Dry-runs this pulse: HN OK (29 posts), GitHub OK (9 posts), Reddit still not runnable without OAuth (API requires subreddits/mode). No Founder reply observed since 12:45 ET packet. **problems4us-11a target_date was 2026-08-02 (today)** — still blocked solely on secrets/decision. Deploy unchanged: `v2026.08.02-7e1da9e`.

Ready-to-apply amendment drafts (apply only after explicit acceptance):

- Decision A → `Problems4US/docs/problems4us-11f-github-hn-amendment-draft-20260801.md`
- Decision B → `Problems4US/docs/problems4us-09f-invite-paid-path-amendment-draft-20260801.md`

---

## Decision A — Source mix (closes 11a / 11f path) — RESOLVED

**Resolution (Founder directive 2026-08-02, correlation `cos-remove-reddit-20260802`):** Remove Reddit entirely — not restore, not defer, not “GitHub+HN accepted with Reddit pending.” Plan steps `problems4us-11a`, `problems4us-11f`, and `problems4us-11g` closed as Removed. Evidence: `Problems4US/docs/problems4us-remove-reddit-20260802.json`.

**Prior question (superseded):** Restore Reddit OAuth on `problems4us-linux`, or accept GitHub Issues + Hacker News as the Month-2 three-source bar (Reddit deferred)?

---

## Decision B — Month-2 paid path (closes 09 / 09f path)

**Question:** Treat invite-only Builder cohort + manual invoicing as the production paid path for Month-2, or wait for centralized `billing.breivax.com` Stripe webhook delivery?

**Recommendation:** Approve invite-only + manual invoicing as the interim production paid path (Decision B); keep centralized Stripe as the follow-on.

**Reason:** `checkoutReady=false` under cos-directive HOLD on isolated Stripe. Invite cohort already live (1 Builder seat). Formal 09/12c close and paid-seat KPI cannot finish without an explicit paid-path choice.

**Impact if approved:** Agent closes 09f under invite-only amendment; 09/12c can formal-close with invite seats as entitled/paid.

**Impact if declined:** Wait for centralized billing secrets/webhook; 09b/09d/09f stay blocked; no invented paid seats.

**Deadline:** 2026-08-05 (keeps Month-2 monetization on schedule).

**Default if no response:** Keep HOLD; invite seats remain interim; do not claim Stripe live.

---

## Decision C — External pilot outreach (closes 14b)

**Question:** Will Xavier run first external (non-smoke) pilot contacts this week using the outreach pack?

**Recommendation:** Yes — schedule 1–3 contacts this week using `problems4us-14b-outreach-handoff-20260801.md`.

**Reason:** Activation stuck at 1/6 smoke baseline; engineering cannot invent external pilots. Pack + offer + demo script ready.

**Impact if approved:** Unblocks 14c/14d/16d usefulness batch path.

**Impact if declined:** Leave 14b blocked; escalate weekly; no invented activations.

**Deadline:** 2026-08-08.

**Default if no response:** Keep 14b blocked with humanActionRequired.

---

## Also still credential-blocked (not decisions, just wiring)

- **22a password reset:** needs `SENDGRID_API_KEY` + `PASSWORD_RESET_FROM_EMAIL`
- **30a App Insights:** needs `APPLICATIONINSIGHTS_CONNECTION_STRING`

Evidence: `Problems4US/docs/problems4us-13-45et-pulse-evidence-20260802.json`
