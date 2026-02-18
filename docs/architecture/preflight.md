# Task Assistant — Preflight Specification

Status: Canonical  
Audience: Core maintainers, Marketplace reviewers, security reviewers  
Scope: Mandatory first-stage validation for every dispatcher run  

---

## 1. Purpose

Preflight is the mandatory first engine executed in every dispatcher run.

Its purpose is to establish execution invariants before any engine logic runs.

Preflight ensures:

- Repository eligibility
- Telemetry destination resolution
- Authentication validity
- Basic configuration integrity
- Deterministic runtime conditions

No engine may execute before preflight completes successfully.

---

## 2. Position in the Runtime Model

Runtime flow:

Dispatcher → Preflight → Engine(s) → emit-engine → Telemetry

Preflight is:

- Invoked via workflow_call
- Executed under the same engine_ref as all subsequent engines
- Bound to the dispatcher-generated correlation_id
- Telemetry-emitting
- Non-mutating

---

## 3. Responsibilities

Preflight MUST:

### 3.1 Validate Target Repository

- Confirm the GitHub App is installed
- Confirm read access to target_repo
- Confirm repository is not disabled via configuration
- Confirm repository is not explicitly blocked

Preflight MUST NOT:

- Mutate repository state
- Create labels or milestones
- Trigger workflows

---

### 3.2 Resolve Telemetry Repository

Preflight is the only engine responsible for resolving the telemetry destination.

It must:

- Determine the fully-qualified telemetry_repo
- Confirm write access to telemetry_repo
- Confirm telemetry path viability

No subsequent engine performs telemetry resolution.

---

### 3.3 Validate Authentication Scope

Preflight confirms:

- Installation token is valid
- Required scopes are present
- No unauthorized access paths exist

If authentication validation fails:

- Execution halts
- Telemetry is emitted
- No engine logic runs

---

### 3.4 Normalize Runtime Invariants

Preflight establishes:

- Canonical correlation_id
- engine_ref consistency
- Telemetry directory location
- Base runtime assumptions

Preflight does not modify these values — it verifies and propagates them.

---

## 4. Inputs

Preflight accepts the standard engine inputs:

- target_repo
- telemetry_repo (may be provisional or resolved internally)
- correlation_id
- engine_ref

All inputs are treated as opaque.

---

## 5. Outputs

Preflight emits exactly one telemetry record:

telemetry/v1/repos/<owner-repo>/<date>/<correlation_id>/preflight.json

The record must include:

- schema_version
- generated_at
- correlation_id
- engine_name = "preflight"
- engine_ref
- ok (true | false)
- details (validation results)

Preflight MUST use emit-engine to produce this record.

---

## 6. Failure Semantics

### If Preflight Fails

- emit-engine records ok=false
- Dispatcher terminates execution
- No subsequent engines run
- No repository mutations occur

### If Preflight Succeeds

- emit-engine records ok=true
- Dispatcher proceeds to next engine
- All subsequent engines inherit validated invariants

Preflight failure is terminal for the run.

---

## 7. Determinism Requirements

Preflight must be:

- Stateless
- Configuration-driven
- Free of time-based branching
- Free of random behavior

Given identical inputs and engine_ref, preflight must produce identical results.

---

## 8. Security and Trust Boundaries

Preflight enforces strict boundaries between:

- Infrastructure resolution
- Runtime execution
- Engine logic
- Telemetry writing

Preflight:

- Does not read infra registries directly (unless explicitly scoped and documented)
- Does not escalate permissions
- Does not execute monitored repository code
- Does not dynamically load external scripts

It performs validation only.

---

## 9. Non-Responsibilities

Preflight does NOT:

- Execute validation engines
- Perform enforcement
- Build dashboards
- Retry engine failures
- Generate correlation IDs
- Select engine_ref

All orchestration authority remains with the dispatcher.

---

## 10. Architectural Guarantees

Preflight guarantees that:

- All subsequent engines operate in a validated environment
- Telemetry is resolvable and writable
- Authentication is verified
- Execution halts safely if invariants fail
- No mutation occurs before validation

This establishes deterministic, Marketplace-safe execution.

---

## Canonical Statement

Preflight is the mandatory, non-mutating validation stage that executes first in every dispatcher run. It verifies repository eligibility, authentication scope, and telemetry resolution under a pinned engine_ref. If preflight fails, execution halts cleanly. If it succeeds, all subsequent engines operate under validated, deterministic runtime conditions.
