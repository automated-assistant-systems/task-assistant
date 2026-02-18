# Task Assistant — Architecture Lock Declaration

Status: LOCKED  
Effective Phase: 3.5 — Runtime Hardening  
Scope: Runtime Model, Telemetry Contract, Version Pinning, Security Boundaries  

---

## 1. Purpose

This document formally locks the Task Assistant runtime architecture as of Phase 3.5.

From this point forward:

- The runtime model is frozen.
- The telemetry contract is frozen.
- Version-pinning behavior is mandatory.
- Preflight gating is mandatory.
- emit-engine is the sole telemetry authority.

Architectural drift is not permitted without deliberate versioning.

---

## 2. Locked Runtime Model

The following execution flow is canonical and non-negotiable:

Dispatcher → Preflight → Engine(s) → emit-engine → Telemetry Repository

Guarantees:

- Preflight executes before any mutation.
- Dispatcher selects engine_ref.
- All engines in a run share identical engine_ref.
- Engines are stateless and deterministic.
- Exactly one telemetry file is emitted per engine invocation.
- Telemetry is immutable once written.

This model must not be bypassed.

---

## 3. Version Pinning (engine_ref)

The following are permanently required in v1:

- engine_ref is selected by the dispatcher.
- engine_ref must be tag or SHA in Marketplace runtime.
- Engines cannot override engine_ref.
- engine_ref is recorded in every telemetry record.
- All engines in a dispatch share identical engine_ref.

Removing or weakening version pinning requires:

- Major architecture revision
- Explicit migration plan
- Schema version bump if telemetry structure changes

---

## 4. Telemetry Contract Lock

Telemetry Schema v1.0 is locked.

The following are invariant:

- One JSON file per engine execution
- Exactly one JSON object per file
- Immutable write behavior
- Partitioned by repository, date, correlation
- Emitted exclusively via emit-engine
- Includes engine_name, engine_ref, correlation_id, ok

Streaming JSONL, multi-record-per-engine files, or direct engine writes are prohibited.

Breaking changes require:

- New telemetry root (e.g., telemetry/v2/)
- Updated schema document
- Migration guidance

---

## 5. Preflight Gating

Preflight is mandatory and first.

It must:

- Validate installation
- Validate telemetry repository access
- Validate repository eligibility
- Halt execution on failure

Mutation before preflight success is forbidden.

---

## 6. Security Boundaries

The following are locked:

- No repository code execution
- No dynamic runtime loading
- No cross-organization mutation
- No privilege escalation
- No autonomous engine execution
- No background mutation loops
- No implicit version upgrades

Determinism is a security property and must be preserved.

---

## 7. Configuration Scope Lock

Configuration governs:

- Enforcement rules
- Label and milestone declarations
- Exclusivity policies

Configuration does NOT govern:

- Runtime version
- Authentication model
- Telemetry emission mechanics
- Dispatcher behavior
- Preflight gating

Configuration cannot override architectural invariants.

---

## 8. Marketplace Safety Guarantees

The architecture guarantees:

- Deterministic execution
- Version-traceable mutations
- Immutable audit trail
- Strict identity boundaries
- No hidden behavior paths

This posture must be preserved for Marketplace distribution.

---

## 9. Change Control Policy

Any proposal that alters:

- Execution order
- Version pinning model
- Telemetry envelope
- Storage layout
- Authentication boundaries
- Engine autonomy

Requires:

1. Explicit architectural review
2. New phase designation
3. Updated canonical documentation
4. Migration plan
5. Validation evidence

Unreviewed structural change is prohibited.

---

## 10. Canonical Declaration

As of Phase 3.5, Task Assistant operates under a version-pinned, preflight-gated, dispatcher-controlled runtime model with centralized telemetry authority.

The architecture is formally locked.

Future evolution must be deliberate, versioned, and documented.
