# Task Assistant — Runtime Model

Status: Canonical  
Audience: Core maintainers, Marketplace reviewers, security reviewers  
Scope: End-to-end execution lifecycle of a dispatcher run  

---

## 1. Overview

Task Assistant executes automation through a strictly ordered, version-pinned runtime model:

Dispatcher → Preflight → Engine(s) → emit-engine → Telemetry Repository

This model guarantees:

- Deterministic execution
- Version reproducibility (engine_ref)
- Immutable audit trails
- Strict trust boundaries
- Failure isolation

No engine may bypass or reorder this flow.

---

## 2. Execution Lifecycle

### Step 1 — Dispatcher

The dispatcher is the single orchestration authority.

It is responsible for:

- Interpreting the triggering event
- Selecting the engine execution ref (engine_ref)
- Generating or normalizing the correlation_id
- Sequencing engine invocation
- Halting execution on preflight failure

The dispatcher:

- Owns the correlation namespace
- Ensures all engines share the same engine_ref
- Never performs engine logic itself

---

### Step 2 — Preflight (Mandatory)

Preflight MUST execute first in every dispatcher run.

Preflight establishes execution invariants:

- Validates target repository accessibility
- Resolves telemetry repository
- Confirms installation token scope
- Verifies basic eligibility conditions
- Emits canonical preflight telemetry

If preflight fails:

- No subsequent engines run
- Telemetry is still emitted
- Execution terminates cleanly

Preflight performs no mutations.

---

### Step 3 — Engine Execution

After successful preflight, one or more engines may execute.

Each engine:

- Is invoked via workflow_call
- Receives target_repo, telemetry_repo, correlation_id, engine_ref
- Is stateless and deterministic
- Does not inspect infrastructure directly
- Does not invoke other engines
- Does not generate correlation IDs
- Does not override engine_ref

All engines in a run share:

- The same correlation_id
- The same engine_ref
- The same telemetry directory

---

### Step 4 — Telemetry Emission (emit-engine)

Every engine MUST emit exactly one telemetry record via the shared emit-engine mechanism.

emit-engine guarantees:

- Canonical envelope structure
- Single record per engine
- Immutable append-only write
- engine_ref inclusion
- Standardized ok / failure semantics
- Safe retry behavior on write conflicts

Engines must not write telemetry directly.

Telemetry is written only to:

telemetry/v1/repos/<owner-repo>/<date>/<correlation_id>/

Telemetry is never written to the monitored repository.

---

## 3. Version Pinning (engine_ref)

All runtime execution is version-pinned.

Rules:

- engine_ref is selected by the dispatcher
- In Marketplace runtime, engine_ref must be a tag or SHA
- Floating branches are not permitted in Marketplace mode
- All engines in a dispatcher run use the identical engine_ref

This guarantees:

- Reproducible execution
- Auditable historical runs
- Safe parallel development

Host repositories do not pin engine versions.

---

## 4. Correlation Model

One dispatcher run → one correlation_id.

All engines in that run:

- Emit telemetry under the same directory
- Share correlation context
- Remain failure-isolated

Engines treat correlation_id as opaque.

---

## 5. Failure Semantics

### Preflight Failure
- Stops execution immediately
- Emits telemetry with ok=false
- No engine logic executes

### Engine Failure
- Engine exits non-zero
- emit-engine records ok=false
- Other engines may still execute (unless sequencing prohibits it)

### Transport Failure
- Telemetry emission may retry on safe GitHub conflicts (e.g. 409)
- Engine logic is never automatically replayed

Failures do not cascade across independent engines.

---

## 6. Trust Boundaries

Task Assistant enforces strict boundaries between:

- Orchestration (dispatcher)
- Validation (preflight)
- Execution (engines)
- Observability (telemetry)
- Infrastructure (infra registry / config)

Engines:

- Do not discover infrastructure
- Do not escalate permissions
- Do not execute monitored repository code
- Do not create pull requests
- Do not trigger workflows

All authority flows through the dispatcher.

---

## 7. Determinism Guarantees

The runtime model guarantees:

- Identical inputs under identical engine_ref produce identical behavior
- All execution is externally auditable
- All telemetry is immutable
- Version selection is centralized
- Infra resolution is preflight-gated
- No hidden cross-engine logic exists

This model underpins Marketplace safety and reproducibility.

---

## Canonical Statement

Task Assistant executes automation through a dispatcher-controlled, preflight-gated, version-pinned runtime model. Engines are stateless, deterministic units that emit immutable telemetry exclusively through emit-engine. Execution order, version selection, and correlation ownership are centralized, ensuring reproducibility, auditability, and strict separation of concerns.
