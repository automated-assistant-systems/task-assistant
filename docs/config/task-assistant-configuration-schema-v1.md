Task Assistant Configuration Schema v1

Authoritative Contract & Runtime Alignment

Status: LOCKED (v1)
Applies to: Task Assistant GitHub App – Phase 3.1
Effective: Immediately

1. Purpose of This Document

This document resolves the historical ambiguity between:

What the Task Assistant configuration schema declares, and

What the runtime (prepare-repo, Codex, workflows) actually enforces

From this point forward:

Any runtime behavior not justified by this schema is invalid.
Any schema element not enforced by runtime is a defect.

This closes Phase 3.1 Issue #31.

2. Configuration File Location (Authoritative)

Task Assistant configuration MUST exist at:

.github/task-assistant.yml


If missing or unreadable:

Outcome: BLOCKED

Telemetry: config.validation.failed

No repo mutation occurs

3. Schema Versioning
schema_version: "1.0"

Rules

Required

Must be a string

Runtime rejects unknown major versions (2.x, etc.)

Minor extensions allowed only if backward compatible

4. Top-Level Schema Structure (v1)
schema_version: "1.0"

tracks: [...]
labels: [...]
milestones: [...]
telemetry: {...}


All top-level keys are explicitly defined.
Unknown top-level keys are ignored but logged.

5. Tracks (Authoritative)
Schema
tracks:
  - id: sprint
    label: track/sprint
    description: Active sprint work
    default_milestone_pattern: "Sprint {{sprint}}"

Runtime Guarantees

id must be unique

label must exist or be creatable

Track labels are authoritative

Track labels are not optional

Runtime Actions

Missing track label → created

Invalid track entry → BLOCKED

6. Labels (Authoritative, Declarative)
Schema
labels:
  - name: phase-3.1
    description: Phase 3.1 Telemetry Enhancements
    color: "1D76DB"

Runtime Guarantees

Labels defined here are source of truth

Runtime reconciles:

Create missing labels

Update mismatched color/description

Labels not listed here are out of scope (not deleted)

System Labels (Hard-Coded)

These are runtime-mandated, regardless of config:

SUCCESS

PARTIAL

BLOCKED

FAILED

They must exist and must match canonical meaning.

7. Milestones (Declarative, Non-Destructive)
Schema
milestones:
  - title: "Phase 3.1 – Telemetry Enhancements"

Runtime Guarantees

Milestones listed are ensured to exist

Existing milestones are never modified

Milestones are matched by title, not ID

8. Telemetry Configuration (Required)
telemetry:
  enabled: true

Runtime Contract

Telemetry must be enabled for Task Assistant to operate

Telemetry output never writes to the host repo

All telemetry is emitted to the organization telemetry repo

If telemetry is disabled or missing:

Outcome: BLOCKED

Reason: Marketplace safety violation

9. Runtime Outcomes & Status Mapping
Condition	Status	Meaning
Config valid, repo mutated, no errors	SUCCESS	PR opened, tests passing
Config valid, repo mutated, errors occurred	PARTIAL	PR opened, remediation required
Config invalid or ambiguous	BLOCKED	No mutation
Runtime failure	FAILED	Execution error

This mapping is canonical and shared across:

prepare-repo

Codex runner

Future workflows

10. Telemetry Emission Rules

Every schema evaluation emits:

{
  "schema_version": "1.0",
  "actor": "task-assistant",
  "action": "config.validate",
  "outcome": "success | partial | blocked | failed",
  "reason": "...",
  "entity": {
    "type": "repository",
    "repo": "org/name"
  }
}


There are no silent failures.

11. Backward Compatibility Policy

Schema v1 is stable

New keys may be added only if optional

Breaking changes require:

New major version

Explicit migration path

12. Enforcement Summary (Non-Negotiable)

❌ No runtime behavior without schema justification

❌ No schema element without runtime enforcement

❌ No config ambiguity without BLOCKED outcome

❌ No mutation without telemetry
