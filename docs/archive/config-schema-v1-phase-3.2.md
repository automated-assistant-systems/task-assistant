Task Assistant Configuration Schema v1

Authoritative Configuration Contract

Status: LOCKED (v1)
Applies to: Task Assistant GitHub App
Phase: 3.2 — Hygiene & Enforcement
Effective: Immediately

1. Purpose of This Document

This document is the single source of truth for what the Task Assistant
configuration declares and what the runtime enforces.

From this point forward:

❌ Any runtime behavior not justified by this schema is invalid

❌ Any schema element not enforced by runtime is a defect

❌ Any ambiguity results in a BLOCKED outcome

This document replaces all prior informal or implied contracts.

2. Configuration File Location (Authoritative)

Task Assistant configuration MUST exist at:

.github/task-assistant.yml

Failure Handling

If the file is:

Missing

Unreadable

Invalid YAML

Outcome: BLOCKED
Runtime Action: No repository mutation
Enforcement: prepare-repo, issue-events, nightly-sweep, self-test

3. Schema Versioning
schema_version: "1.0"

Rules

Required

Must be a string

Unknown major versions (e.g. 2.x) → BLOCKED

Minor extensions allowed only if backward compatible

Runtime enforces exact major version match

4. Top-Level Schema Structure (v1)
schema_version: "1.0"

tracks: [...]
labels: [...]
milestones: [...]
enforcement: {...}

Guarantees

All listed top-level keys are explicitly defined

Unknown top-level keys are ignored

Ignored keys do not affect enforcement

Missing required keys → BLOCKED

5. Tracks (Authoritative)
Schema
tracks:
  - id: sprint
    label: track/sprint
    description: Active sprint work

Rules

id must be unique

label must be a valid GitHub label name

Tracks are declarative, not behavioral

Track labels are authoritative identifiers

Runtime Guarantees

Missing track labels → created

Invalid track entry → BLOCKED

Track labels are not optional

6. Labels (Authoritative, Declarative)
Schema
labels:
  - name: phase-3.2
    description: Phase 3.2 – Hygiene & Enforcement
    color: "1D76DB"

Runtime Guarantees

Labels listed here are source of truth

Runtime will:

Create missing labels

Update color and description if mismatched

Labels not listed are ignored (never deleted)

System Labels (Implicitly Required)

The following labels are mandatory, regardless of config:

SUCCESS
PARTIAL
BLOCKED
FAILED
codex:execute


Runtime ensures these labels exist and match canonical meaning.

7. Milestones (Declarative, Non-Destructive)
Schema
milestones:
  - title: "Phase 3.2 – Hygiene & Enforcement"

Runtime Guarantees

Milestones listed here are ensured to exist

Existing milestones are never modified

Matching is done by title only

Missing milestone → created (unless dry-run)

8. Phase Labels & Enforcement Semantics (Config-Driven)

Phase labels are labels matching:

phase-<number>

Enforcement Rules:

- Issues may have zero or more phase labels
- Phase labels are mutually exclusive (highest wins by default)
- Exclusivity behavior is defined in enforcement.exclusivity.phase

Milestone Enforcement:

- Occurs ONLY if enforcement.phase_milestones is defined
- No implicit or hard-coded mappings exist
- Task Assistant never invents milestone names

9. Enforcement (Authoritative, Config-Driven)

The enforcement section defines all behavioral rules applied by Task Assistant.

No enforcement behavior may exist outside this section.

If enforcement is omitted:
- No issue mutation occurs
- Runtime operates in advisory / validation-only mode
9.1 Enforcement Schema
yaml
Copy code
enforcement:
  exclusivity:
    phase:
      mode: enforce | warn | fail | off
      strategy: highest | lowest

    priority:
      mode: enforce | warn | fail | off

    track:
      mode: enforce | warn | fail | off

    state:
      mode: enforce | warn | fail | off
      terminal: [state/done, state/closed]

  phase_milestones:
    <phase-label>: <milestone-title>
9.2 Phase → Milestone Mapping (Config-Driven)
md
Copy code
Phase milestone enforcement is OPTIONAL and entirely config-driven.

If phase_milestones is omitted:
- Phase labels are still exclusive
- No milestone enforcement occurs
- Outcome: PASS or WARN (no mutation)
Example:

yaml
Copy code
enforcement:
  phase_milestones:
    phase-1: "Planning"
    phase-2: "Execution"
    phase-3: "Release"
Rules:

Keys must match phase-* labels

Values must be exact milestone titles

Missing milestone → created (unless dry-run)

Missing mapping → WARN, no mutation


10. Label Exclusivity (Config-Driven)

Label exclusivity is config-driven, not hard-coded.

Supported Exclusivity Classes

phase-* labels are mutually exclusive by priority

Track labels may be exclusive if declared

Future exclusivity rules must be:

Declared in schema

Enforced deterministically

Backward compatible

11. Runtime Scope & Responsibilities
Component	Responsibilities
prepare-repo	Config validation, label & milestone reconciliation
issue-events	Issue hygiene & phase enforcement
self-test	Validate enforcement correctness
nightly-sweep	Ongoing compliance checks
emit.js	Telemetry emission only

prepare-repo never emits telemetry.
All telemetry emission occurs at workflow level.

12. Telemetry (Out of Scope for Schema)

Telemetry configuration is not part of schema v1.

Guarantees:

Runtime workflows always emit telemetry

Telemetry is written only to telemetry repository

Host repositories are never mutated by telemetry

Telemetry behavior is enforced by runtime, not configuration.

13. Runtime Outcomes & Status Mapping (Canonical)
Condition	Status	Meaning
Config valid, no errors	SUCCESS	No remediation required
Config valid, warnings	PARTIAL	Action taken or advisory
Config invalid or ambiguous	BLOCKED	No mutation
Runtime failure	FAILED	Execution error

This mapping is shared across all workflows.

14. Backward Compatibility Policy

Schema v1 is stable

New keys must be optional

Breaking changes require:

New major version

Explicit migration plan

Parallel runtime support

v1 Compatibility Note:

Repositories relying on implicit phase → milestone semantics must
declare phase_milestones explicitly going forward.

Omission of enforcement configuration results in non-destructive behavior.

15. Enforcement Summary (Non-Negotiable)

❌ No runtime behavior without schema justification

❌ No schema element without runtime enforcement

❌ No ambiguity without BLOCKED

❌ No silent failure

❌ No telemetry without determinism
