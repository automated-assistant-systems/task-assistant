# Task Assistant — Configuration Schema v1.0 (Authoritative)

Status: Locked  
Applies To: Enforcement & Materialization Engines  
Phase: 3.5 Runtime Model  

---

## 1. Purpose

This document defines the authoritative configuration contract for Task Assistant.

The configuration file:

- Declares repository governance rules
- Defines enforcement behavior
- Defines label and milestone expectations
- Does NOT control runtime versioning
- Does NOT control telemetry behavior
- Does NOT override preflight gating

Runtime invariants (engine_ref, telemetry emission, authentication) are enforced by the dispatcher and engines, not configuration.

---

## 2. Configuration File Location

The configuration file MUST exist at:

.github/task-assistant.yml

If the file is:

- Missing
- Unreadable
- Invalid YAML
- Invalid schema

Then:

- event.action = "failure"
- ok = false
- No repository mutation occurs

Preflight still executes before configuration evaluation.

---

## 3. Schema Versioning

schema_version: "1.0"

Rules:

- Required
- Must be string
- Unknown major version → BLOCKED
- Minor additions must be backward-compatible
- Runtime enforces major version match

---

## 4. Top-Level Structure (v1)

```yaml
schema_version: "1.0"

tracks: [...]
labels: [...]
milestones: [...]
enforcement: {...}
Rules:

Unknown top-level keys are ignored

Missing required keys → BLOCKED

Enforcement behavior must be declared explicitly

5. Tracks (Declarative)
Tracks define authoritative work categories.

yaml
Copy code
tracks:
  - id: sprint
    label: track/sprint
    description: Active sprint work
Rules:

id must be unique

label must be valid GitHub label name

Tracks are declarative identifiers

Tracks do not imply enforcement unless configured

Runtime guarantees:

Missing declared track labels may be created by materialize engine

Invalid track definition → BLOCKED

6. Labels (Declarative, Non-Destructive)
yaml
Copy code
labels:
  - name: phase-1
    description: Phase 1 – Planning
    color: "1D76DB"
Runtime guarantees:

Declared labels are authoritative

Missing labels may be created by materialize engine

Label color/description reconciled deterministically

Labels not declared are never deleted

7. Milestones (Declarative)
yaml
Copy code
milestones:
  - title: "Phase 1 – Planning"
Runtime guarantees:

Missing milestones may be created

Existing milestones are never modified

Matching is by exact title

No milestone is invented implicitly

8. Enforcement (Behavioral Section)
All mutation behavior must be declared here.

If enforcement is omitted:

No issue mutation occurs

Validation may still run

System operates in advisory mode

8.1 Enforcement Schema
yaml
Copy code
enforcement:
  exclusivity:
    phase:
      mode: enforce | warn | fail | off
      strategy: highest | lowest

    track:
      mode: enforce | warn | fail | off

    state:
      mode: enforce | warn | fail | off
      terminal: [state/done, state/closed]

  phase_milestones:
    phase-1: "Planning"
    phase-2: "Execution"
8.2 Exclusivity Rules
Exclusivity behavior is:

Declarative

Deterministic

Engine-enforced

Idempotent

No hard-coded exclusivity exists outside configuration.

8.3 Phase → Milestone Mapping
Optional.

If omitted:

Phase labels remain exclusive (if configured)

No milestone enforcement occurs

No mutation related to milestones

If defined:

Keys must match declared phase-* labels

Values must match milestone titles exactly

Missing milestone → may be created by materialize engine

Invalid mapping → BLOCKED

9. Mutation Model
Mutation occurs only when:

Preflight succeeds

Configuration is valid

Enforcement engine is invoked

engine_ref is pinned

GitHub App token has permission

Configuration alone never causes mutation.

10. Determinism Requirements
Given:

Identical configuration

Identical issue state

Identical engine_ref

The enforcement result must be identical.

No randomness.
No time-dependent behavior.
No implicit defaults.

11. Explicit Non-Behaviors
Configuration does NOT:

Select runtime version

Override engine_ref

Control telemetry emission

Alter authentication model

Permit cross-repository access

Trigger background execution

All runtime guarantees are enforced externally.

12. Failure Semantics
Invalid configuration results in:

event.action = "failure"

ok = false

No repository mutation

Telemetry emitted

Ambiguity is treated as failure.

13. Backward Compatibility Policy
Schema v1.0 is locked.

Breaking changes require:

New major version

Migration guidance

Runtime support for both versions (during transition)

Minor additions must be optional and backward compatible.

14. Canonical Declaration
Configuration Schema v1.0 governs repository hygiene rules only.

All runtime invariants — including version pinning, preflight gating, authentication, and telemetry emission — are enforced by the Task Assistant runtime model and cannot be altered via configuration.
