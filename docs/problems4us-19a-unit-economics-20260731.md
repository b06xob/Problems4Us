# AI cost vs ARPU unit-economics tracker (problems4us-19a)

**As of:** 2026-07-31  
**Correlation:** cos-hourly-pulse-20260731T184503Z  
**Audience:** Passport / Xavier

## Fields (Passport-readable)

| Field | Value (this snapshot) | Source |
| --- | --- | --- |
| Month | 2026-07 | calendar |
| Activated accounts | 1 | `GET /api/admin/activation` |
| Total accounts | 5 | same |
| Paying / invite seats (prod Builder) | 0 counted as paid (checkoutReady=false; invite grants are pilot) | health checkout + entitlements |
| Estimated MRR | $0 | no Stripe checkout live |
| Estimated AI spend (OpenAI analyze) | Cap-bound: daily token budget 250k/instance (~soft ceiling); actual invoice TBD from OpenAI billing | `AI_DAILY_TOKEN_BUDGET` + ops-runbook-ai-budget.md |
| AI cost / activated user / mo | Unknown until OpenAI invoice pulled — flag if &gt;$15 while MRR &lt;$500 | — |
| AI cost % of MRR | N/A while MRR=$0 — treat as **High unit-economics risk** until first paid seat | — |

## Flags

| Rule | Status |
| --- | --- |
| AI cost &gt; 35% of MRR | N/A (MRR $0) — escalate when first paid month closes |
| AI cost &gt; $15 / activated user while MRR &lt; $500 | **Open** — need OpenAI monthly invoice + activated count; Xavier to share invoice or approve App Insights cost export |

## Actions

1. Wire OpenAI usage export or paste monthly invoice into next tracker update.  
2. Do not invent MRR. Paid path blocked on shared Stripe billing hold (`problems4us-09b`).  
3. Keep analyze caps enforced (`problems4us-27` done).

## Evidence

- Activation: `docs/problems4us-14a-activation-gate-20260731.json`  
- AI caps: `docs/ops-runbook-ai-budget.md`  
- Health: https://problems4us.com/api/health (`checkoutReady=false`)
