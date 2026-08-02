"""
Close Reddit plan steps per Founder directive 2026-08-02.
Correlation: cos-remove-reddit-20260802
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

PLAN = Path(r"C:\Users\b06xo\OneDrive\Test\Intercom\Docs\project-plans\problems4us-plan.json")
CORR = "cos-remove-reddit-20260802"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
EVIDENCE = "Problems4US/docs/problems4us-remove-reddit-20260802.json"

raw = json.loads(PLAN.read_text(encoding="utf-8"))
if isinstance(raw, list):
    steps_list = raw
    wrap = None
elif isinstance(raw, dict):
    wrap = raw
    for key in ("steps", "tasks", "planSteps", "Tasks"):
        if isinstance(raw.get(key), list):
            steps_list = raw[key]
            break
    else:
        raise SystemExit(f"Unknown plan shape keys={list(raw.keys())[:20]}")
else:
    raise SystemExit(type(raw))

by_id = {s.get("step_id"): s for s in steps_list if isinstance(s, dict)}

close_note = (
    f"Removed per Founder directive 2026-08-02 ({CORR}). "
    "Reddit is not deferred and not restored — fully removed from ingest, config, "
    "public site, AEO, and docs. Evidence: " + EVIDENCE
)

for sid in ("problems4us-11a", "problems4us-11f"):
    s = by_id.get(sid)
    if not s:
        print("MISSING", sid)
        continue
    s["status"] = "done"
    s["blocker_note"] = ""
    s["evidence"] = f"CLOSED {NOW} ({CORR}): {close_note}"
    print("closed", sid, "->", s["status"])

s11 = by_id.get("problems4us-11")
if s11:
    s11["title"] = "Source expansion: GitHub Issues + Hacker News (+ forums/reviews)"
    prior = str(s11.get("evidence", ""))[:400]
    s11["evidence"] = (
        f"UPDATED {NOW} ({CORR}): Reddit removed from Month-2 source bar; "
        f"11a/11f closed as Removed per Founder directive. Prior: {prior}"
    )
    print("updated problems4us-11 title")

if "problems4us-11g" not in by_id:
    new_step = {
        "step_id": "problems4us-11g",
        "title": "Remove Reddit entirely (ingest, config, site, AEO, catalog attribution)",
        "target_date": "2026-08-02",
        "status": "done",
        "depends_on": ["problems4us-11a", "problems4us-11f"],
        "owner": "Problems4Us Agent",
        "success_criteria": (
            "No Reddit ingest route/module/job; no REDDIT_* env/App Service settings; "
            "no public-site or AEO Reddit mentions; legacy catalog reddit sources "
            "re-labeled to community for public attribution; plan 11a/11f closed as Removed."
        ),
        "evidence": f"CLOSED {NOW} ({CORR}): {close_note}",
        "blocker_note": "",
        "roadmap_month": 2,
        "roadmap_milestone": "M2.4g",
        "source_docs": [EVIDENCE],
    }
    idx = next(
        (i for i, s in enumerate(steps_list) if s.get("step_id") == "problems4us-11f"),
        len(steps_list) - 1,
    )
    steps_list.insert(idx + 1, new_step)
    print("added problems4us-11g")
else:
    by_id["problems4us-11g"]["status"] = "done"
    by_id["problems4us-11g"]["evidence"] = f"CLOSED {NOW} ({CORR}): {close_note}"
    print("updated problems4us-11g")

out = steps_list if wrap is None else wrap
PLAN.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", PLAN)
