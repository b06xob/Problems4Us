# Problems4Us acceptance — XPS Ranking / Discovery Contract v1 draft

**Status:** Accepted for Month-2 integration spike  
**Owner:** Problems4Us Agent (Audi)  
**Date:** 2026-07-29  
**Correlation:** `cos-continuous-work-standing-order-20260729`  
**Plan step:** `problems4us-06`  
**Peer artifact:** `XPS/docs/contracts/XPS_RANKING_DISCOVERY_CONTRACT_SPIKE.md` (xps-core-05 done)

## Verdict

Problems4Us **agrees** with the XPS-authored ranking/discovery contract draft (`contractVersion` `1.0.0-draft`) as the shared Month-1 design spike. Ready for Month-2 integration (`problems4us-13` / `xps-core` peer).

Schema agreement does **not** require Azure OpenAI. Production AI path is already live as `AI_PROVIDER=openai`.

## What we accept

| Area | Acceptance |
|---|---|
| Inputs | `contractVersion`, `requestId`, `product`, `domain`, `asOf`, `candidates[]`, optional `limit` / `facetsRequested[]` |
| Facets | `relevance`, `quality`, `novelty`, `risk`, `composite` with `value` + `status` (`live` \| `parked` \| `research`) |
| Explainability | Required `reasons[]` (min 1); optional `topFeatures[]`, `policyNotes[]` |
| Freshness | `asOf`, `computedAt`, `maxAgeSeconds`, `stale` — consumers must surface `stale=true` |
| Determinism | Production ranking payloads must set `scoringPolicy.deterministic=true` |
| Fail-closed | Unknown required fields → reject; no silent score defaults |

## Problems4Us → XPS facet mapping (producer side)

Problems4Us opportunity scores today (`src/lib/scoring.ts`):

| P4U facet (0–100) | Weight | Maps into XPS facet | Notes |
|---|---|---|---|
| `FrequencyScore` | 0.25 | `relevance` (partial) | Frequency of complaint / mention intensity |
| `SeverityScore` | 0.25 | `quality` (partial) | Pain intensity proxy until dedicated quality model |
| `WillingnessToPayScore` | 0.30 | `quality` (partial) | Monetization signal folded into quality until XPS adds `monetization` facet |
| `TrendScore` | 0.10 | `novelty` (partial) | Rising trend ≈ discovery novelty; declining ≠ novelty |
| `MarketSizeScore` | 0.10 | `relevance` (partial) | TAM / reach as discovery fit |
| (derived) | — | `risk` | Start at low constant or inverse confidence; do **not** invent lottery risk |
| `calculateOpportunityScore` / 100 | — | `composite` | Normalize 0–100 → 0–1; declare weights in `scoringPolicy` |

Explainability bridge:

- P4U `explainOpportunityScore()` facet contributions → XPS `topFeatures[]` (`name` = facet key, `contribution` = weighted/100).
- Top driver label + score label → at least one `reasons[]` entry (`code` e.g. `P4U_TOP_DRIVER`).

## Sample producer payload

See `problems4us_ranking_discovery_sample_v1.json` in this folder (Problems4Us-domain sample conforming to the shared schema).

## Open items for Month-2 integration (not blockers for this spike)

1. Optional future facet `monetization` so WTP is not folded into `quality`.
2. Explicit P4U `scoringPolicy.compositeWeights` when emitting (may differ numerically from XPS lottery defaults).
3. Runtime endpoint ownership (who hosts rank API vs embed payload on P4U problem resources).

## Out of scope (confirmed)

- Lottery ticket / Fantasy5 internals in Problems4Us
- Billing entitlements (Stripe remains P4U-owned; XPS View consumes Core truth only)
- Treating parked facets as live

## Evidence paths

- `Problems4US/docs/contracts/PROBLEMS4US_XPS_RANKING_CONTRACT_ACCEPTANCE.md` (this file)
- `Problems4US/docs/contracts/xps_ranking_discovery_contract_v1.schema.json` (copy)
- `Problems4US/docs/contracts/problems4us_ranking_discovery_sample_v1.json`
- Peer: `XPS/docs/contracts/XPS_RANKING_DISCOVERY_CONTRACT_SPIKE.md`
