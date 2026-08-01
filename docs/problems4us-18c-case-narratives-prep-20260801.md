# Problems4Us — Case-style problem→idea narratives (PREP for problems4us-18c)

**Status:** Prep only — `problems4us-18c` remains `not_started` until `problems4us-11` rollup closes.  
**Correlation:** cos-hourly-pulse-20260801T154503Z (refreshed)  
**Host / agent:** Audi / Problems4Us Agent  
**As of:** 2026-08-01T15:50:30Z  
**Source:** Live production `GET /api/problems` + `GET /api/ideas` (186 scored problems; 12 product ideas). Full-catalog source mix this pulse: forum=180, reddit=5, github=1. Narrative set below uses the five idea-linked classics until 11 closes.

These five narratives cite real pain-point and idea IDs for the partner offer pack. Formal close of 18c waits on source-expansion rollup (11).

---

## 1. Azure Reserved Instance cost surprises → CloudCost Guardian

- **Problem ID:** pp-1  
- **Source type (live):** reddit  
- **Opportunity score:** 84 (severity 85 · frequency 78 · willingness 92 · market 80 · trend 82)  
- **Customer pain:** Mid-market teams buy Azure Reserved Instances, then get surprised by charges when workloads shift or instances are misconfigured — commonly 20–40% of cloud budget wasted.  
- **Idea ID / name:** idea-1 / CloudCost Guardian  
- **Product angle:** Real-time Azure cost anomaly detection with smart alerting (learns spend patterns; alerts on genuine anomalies). First feature: daily cost anomaly digest with one-click investigation.  
- **Why it matters for pilots:** Highest willingness-to-pay facet in the top set; maps cleanly to a 10-minute demo (score facets → Builder brief).

## 2. Microsoft 365 license waste → M365 License Optimizer

- **Problem ID:** pp-7  
- **Source type (live):** forum  
- **Opportunity score:** 82  
- **Customer pain:** Companies pay for unused M365 seats with no easy reclaim path (~$15–25 per unused seat / month).  
- **Idea ID / name:** idea-4 / M365 License Optimizer  
- **Product angle:** Usage analysis, waste ID, downgrade recommendations, automated reclamation, savings reporting. First feature: license waste scanner with monthly savings estimate.  
- **Why it matters for pilots:** Clear ROI story for IT/procurement; strong for MSPs managing multiple tenants.

## 3. Support ticket routing inefficiency → TicketFlow AI

- **Problem ID:** pp-19  
- **Source type (live):** forum  
- **Opportunity score:** 78  
- **Customer pain:** Tickets misrouted to wrong teams add 24–48 hours of delay and frustrate agents and customers.  
- **Idea ID / name:** idea-8 / TicketFlow AI  
- **Product angle:** AI classification + smart routing from historical patterns; SLA tracker and escalation automation. First feature: classifier trained on historical routing data.  
- **Why it matters for pilots:** Support ops buyers understand the pain immediately; idea already has a named MVP feature set.

## 4. SQL Server query performance degradation → SQLPulse

- **Problem ID:** pp-4  
- **Source type (live):** forum  
- **Opportunity score:** 78 (severity 88)  
- **Customer pain:** DBAs spend hours troubleshooting sudden query regressions with inadequate built-in tools.  
- **Idea ID / name:** idea-3 / SQLPulse  
- **Product angle:** Automatic regression detection, index advisor, wait-stats analysis, capacity forecasting. First feature: automatic query regression detection with root-cause analysis.  
- **Why it matters for pilots:** High-severity technical buyer path (DBA/DevOps) distinct from cloud-cost and M365 stories.

## 5. QuickBooks integration breaking changes → QuickSync Bridge

- **Problem ID:** pp-17  
- **Source type (live):** reddit  
- **Opportunity score:** 77  
- **Customer pain:** QuickBooks API updates break third-party integrations without warning, causing sync failures for small businesses.  
- **Idea ID / name:** idea-7 / QuickSync Bridge  
- **Product angle:** Middleware that detects API changes, adapts mappings, validates data, and recovers from sync errors. First feature: API change monitor with automatic field-mapping updates.  
- **Why it matters for pilots:** SMB / accountant channel; complements enterprise IT narratives in the outreach pack.

---

## Evidence paths

- Live problems: `https://problems4us.com/api/problems` (total=186; mix forum=180, reddit=5, github=1)  
- Live ideas catalog: `https://problems4us.com/api/ideas` (total=12)  
- Offer pack companion: `Problems4US/docs/problems4us-18a-partner-pilot-offer-20260731.md`  
- Demo script companion: `Problems4US/docs/problems4us-18b-demo-script-20260731.md`  
- Prod version at probe: `v2026.08.01-504a43c`  
- Dry-runs this pulse: HN postsCollected=29; GitHub postsCollected=9 (Azure/azure-cli); Reddit credentials-missing

## Remaining to mark 18c done

1. Close `problems4us-11` (requires Reddit secrets for 11a **or** Founder accept GitHub+HN via 11f, plus Day-3 of 11e on 2026-08-02).  
2. Optionally refresh narratives with newly ingested GitHub/HN (and Reddit) IDs after 11e Day-3.  
3. File final pack under offer docs and set plan status `done`.
