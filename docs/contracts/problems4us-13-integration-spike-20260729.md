# Problems4Us ↔ XPS ranking integration spike #1 (problems4us-13)

**Status:** Mapper implemented; awaiting joint runtime endpoint agreement with XPS Core  
**Date:** 2026-07-29  
**Correlation:** `cos-continuous-work-standing-order-20260729`

## Delivered this session

| Artifact | Path |
|---|---|
| Contract acceptance (06) | `docs/contracts/PROBLEMS4US_XPS_RANKING_CONTRACT_ACCEPTANCE.md` |
| Sample producer payload | `docs/contracts/problems4us_ranking_discovery_sample_v1.json` |
| Score → facet mapper | `src/lib/xps-ranking-map.ts` |
| Unit tests | `tests/xps-ranking-map.test.ts` |

## Remaining for full spike close

1. Agree who hosts the rank HTTP endpoint (P4U embed vs XPS service).
2. Ship a read-only API that returns contract-shaped payloads for ≥1 real scored problem in prod.
3. XPS Core acknowledges sample against live data (or parks with receipt).

Until (2)–(3), step stays **in_progress** with mapper + contract agreed.
