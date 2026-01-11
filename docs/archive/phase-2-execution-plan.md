Recommended Phase 2 Execution Plan (Authoritative)
Phase 2.0 — Thread Initialization (Now)

Lock scope:

No core architecture changes

No auth model changes

No webhook rewrites

Everything builds on the canonical summary.

Phase 2.1 — Finish Functional Validation (FIRST)

Goal: prove the engine is behaviorally complete.

Do this before touching telemetry storage.

Checklist:

All issue lifecycle events you care about fire

Label idempotency confirmed

Milestone enforcement stable

Self-healing rules deterministic

No duplicated writes

No race conditions on re-runs

Deliverable:

“Given event X, output Y is guaranteed.”

This becomes your behavioral contract.

Phase 2.2 — Define Telemetry Contract (Schema, Not Repo)

This is the pivot point.

Before creating a repo, define:

event types

aggregation rules

retention assumptions

append-only vs mutable

per-run vs per-issue vs per-repo

Example:

TelemetryEvent {
  run_id
  repo
  issue_number
  event_type
  applied_rules[]
  changes_made[]
  timestamp
}


Only after this is frozen should telemetry storage exist.

Phase 2.3 — Telemetry Persistence (New Repo or Sink)

Now decide:

central telemetry repo

per-org repo

local JSON + GitHub Pages

future DB

This should be:

write-only from task assistant

never required for task assistant to succeed

failure-tolerant

Phase 2.4 — Improved Dashboard (Reads Telemetry Only)

Dashboards should:

never read live GitHub state

never depend on the App being installed

operate entirely from telemetry artifacts

This gives you:

historical views

reproducibility

offline analysis

Phase 2.5 — Installation Automation

Now that behavior + telemetry are stable:

scaffold repo

env validation

webhook secret generation

optional telemetry sink config

ngrok/dev vs prod paths

This becomes:

README quickstart

scriptable setup

Marketplace-friendly

Phase 2.6 — Migration: saas-app Codex → Task Assistant

Only now do you:

deprecate legacy codex

test install process on real repo

validate backward compatibility

document migration path

This is where confidence matters most.
