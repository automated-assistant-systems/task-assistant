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

8. Phase Labels & Enforcement Semantics
Phase Label Definition

Phase labels are labels matching:

phase-3.x


Where x is a numeric phase identifier.

Enforcement Rules (Authoritative)

Issues may have zero or more phase labels

If no phase label is present:

No milestone enforcement occurs

If one or more phase labels are present:

Exactly one milestone must be enforced

The highest phase number wins

Lower phase milestones are replaced

Mapping (Canonical)
Phase Label	Enforced Milestone
phase-3.1	Phase 3.1 – Telemetry Enhancements
phase-3.2	Phase 3.2 – Hygiene & Enforcement
phase-3.3	Phase 3.3 – UX & Config Experience
phase-3.4	Phase 3.4 – Marketplace Readiness
phase-3.5	Phase 3.5 – Post-Release Hardening

If mapping is missing → WARN, no mutation.

9. Label Exclusivity (Config-Driven)

Label exclusivity is config-driven, not hard-coded.

Supported Exclusivity Classes

phase-* labels are mutually exclusive by priority

Track labels may be exclusive if declared

Future exclusivity rules must be:

Declared in schema

Enforced deterministically

Backward compatible

10. Runtime Scope & Responsibilities
Component	Responsibilities
prepare-repo	Config validation, label & milestone reconciliation
issue-events	Issue hygiene & phase enforcement
self-test	Validate enforcement correctness
nightly-sweep	Ongoing compliance checks
emit.js	Telemetry emission only

prepare-repo never emits telemetry.
All telemetry emission occurs at workflow level.

11. Telemetry (Out of Scope for Schema)

Telemetry configuration is not part of schema v1.

Guarantees:

Runtime workflows always emit telemetry

Telemetry is written only to telemetry repository

Host repositories are never mutated by telemetry

Telemetry behavior is enforced by runtime, not configuration.

12. Runtime Outcomes & Status Mapping (Canonical)
Condition	Status	Meaning
Config valid, no errors	SUCCESS	No remediation required
Config valid, warnings	PARTIAL	Action taken or advisory
Config invalid or ambiguous	BLOCKED	No mutation
Runtime failure	FAILED	Execution error

This mapping is shared across all workflows.

13. Backward Compatibility Policy

Schema v1 is stable

New keys must be optional

Breaking changes require:

New major version

Explicit migration plan

Parallel runtime support

14. Enforcement Summary (Non-Negotiable)

❌ No runtime behavior without schema justification

❌ No schema element without runtime enforcement

❌ No ambiguity without BLOCKED

❌ No silent failure

❌ No telemetry without determinism
