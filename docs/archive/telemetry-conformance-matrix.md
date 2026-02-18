Task Assistant — Telemetry Coverage & Conformance Matrix

Phase 3.1 (Authoritative)

Status: COMPLETE
Schema: Telemetry Schema v1 (LOCKED)
Scope: All enforcement and mutation paths validated in Phase 2 and Phase 3.1

1. Purpose

This matrix explicitly maps:

Every known enforcement / mutation path

To required telemetry emission

With outcome coverage guarantees

This eliminates silent behavior and proves Phase 3.1 telemetry completeness.

2. Canonical Outcomes (Applies Everywhere)
Outcome	Meaning	Repo Mutation Allowed
SUCCESS	Completed as intended	✅ Yes
PARTIAL	Completed with recoverable issues	✅ Yes
BLOCKED	Input invalid or ambiguous	❌ No
FAILED	Execution/runtime failure	❌ No

These outcomes are globally consistent across:

prepare-repo

Codex runner

Supervisor workflows

Future enforcement workflows

3. Coverage Matrix — Core Entry Points
3.1 prepare-repo.js
Path	Action	Telemetry Action	Outcomes Covered	Notes
Config load	Read .github/task-assistant.yml	config.load	SUCCESS, BLOCKED	Missing/unreadable → BLOCKED
Schema validation	Validate schema v1	config.validate	SUCCESS, BLOCKED	No mutation on BLOCKED
Track validation	Validate tracks	config.validate.tracks	SUCCESS, BLOCKED	Invalid track IDs
Label reconciliation	Create/update labels	repo.prepare.labels.reconcile	SUCCESS, PARTIAL, FAILED	PARTIAL if some labels fail
Milestone reconciliation	Ensure milestones exist	repo.prepare.milestones.reconcile	SUCCESS, PARTIAL	Never destructive
Completion	Overall result	repo.prepare.complete	SUCCESS, PARTIAL, BLOCKED, FAILED	Canonical summary

Guarantee:
prepare-repo cannot exit without emitting telemetry.

3.2 Codex Supervisor (Workflow Level)
Path	Action	Telemetry Action	Outcomes Covered	Notes
Issue dispatch	Issue selected	codex.supervisor.dispatch	SUCCESS	Correlation ID created
Input validation	Issue body + labels	codex.validate	SUCCESS, BLOCKED	BLOCKED → auto-label
Task resolution	Task mapping	codex.task.resolve	SUCCESS, BLOCKED	Missing task → BLOCKED
3.3 Codex Runner (run.js)
Path	Action	Telemetry Action	Outcomes Covered	Notes
Execution start	Begin task	codex.execute	SUCCESS	Correlation ID logged
Task execution	Task logic	codex.task.run	SUCCESS, PARTIAL, FAILED	PARTIAL → remediation
PR creation	Create PR	codex.pr.create	SUCCESS, FAILED	
Auto-labeling	Apply status label	codex.issue.label	SUCCESS	SUCCESS / PARTIAL / BLOCKED / FAILED
Completion	Final outcome	codex.complete	SUCCESS, PARTIAL, BLOCKED, FAILED	Canonical
4. Enforcement Paths from Phase 2 (Mapped)
Phase 2 Gap	Resolution	Telemetry
Silent config failure	BLOCKED + telemetry	config.validate
Partial repo prep	PARTIAL status	repo.prepare.complete
Codex ambiguity	BLOCKED auto-label	codex.validate
PR failures	FAILED	codex.pr.create
Missing audit trail	Telemetry repo	telemetry.write
5. Telemetry Sink Coverage
Sink	Status
Host repo	❌ Forbidden
Logs only	❌ Forbidden
Telemetry repo	✅ Required
Local filesystem	❌ Forbidden

All telemetry is written via GitHub App installation token to the org telemetry repo.

6. Correlation Strategy (Guaranteed)

One UUID v4 per logical execution

Propagated across:

Supervisor

Runner

Subtasks

Required in every record

7. Known Gaps (Explicitly Deferred)

These are not Phase 3.1 failures:

Item	Phase
Workflow retrofitting	Phase 3.2
Dashboard ingestion	Phase 3.3
Alerting / thresholds	Phase 3.4
Long-term retention	Phase 3.5
8. Phase 3.1 Completion Assertion

✔ All Phase 2 enforcement paths mapped
✔ All entry points emit telemetry
✔ All outcomes represented
✔ No silent failure paths
✔ Marketplace-safe auditability achieved

9. Issue Closure Statement (Ready to Paste)

Telemetry coverage has been fully mapped across all known enforcement and mutation paths.
All core workflows emit canonical decision telemetry with complete outcome coverage.
Remaining workflow retrofits are explicitly deferred to Phase 3.2.
