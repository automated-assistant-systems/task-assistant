# Task Assistant — Engine Interface Specification

Status: Canonical
Audience: Core maintainers, engine authors, Marketplace reviewers
Scope: All runtime engines invoked by Task Assistant


## 1. Purpose

This document defines the stable interface contract between the Task Assistant dispatcher and all runtime engines.

It exists to ensure that:

- Engines remain interchangeable and evolvable
- Telemetry remains consistent and auditable
- Marketplace guarantees are preserved
- Engine execution is version-pinned and auditable (engine_ref)
- No engine becomes implicit, special-cased, or ad-hoc

Any new engine must conform to this specification.


## 2. Architectural Model (Non-Negotiable)

Task Assistant follows a strict Dispatcher → Engine model.

### Mandatory sequencing

- Preflight MUST execute first for every dispatcher run.
- If preflight fails, no subsequent engines may run.

Preflight establishes run invariants (telemetry destination, auth viability, basic eligibility checks) and emits
the canonical `preflight.json` record for the correlation.

### Dispatcher Responsibilities

The dispatcher owns:
- Event interpretation
- Execution sequencing
- Correlation ID ownership and normalization
- Engine orchestration
- Engine version pinning and propagation (engine_ref)

### Engine Responsibilities

Engines are:
- Stateless
- Deterministic
- Configuration-driven
- Telemetry-emitting
- Infra-agnostic
- Version-pinned by engine_ref

### Engines must never:

- Discover infrastructure on their own
- Generate or mutate correlation IDs
- Inspect unrelated repositories
- Invoke other engines
- Contain cross-engine logic
- Override engine_ref

### Operator Tooling (Out of Scope)

Operator tools may:
- Trigger dispatcher workflows
- Supply optional correlation IDs
- Supply optional engine_ref (non-Marketplace/testing only)
- Wait on telemetry as a completion signal

Operator tooling:
- Is not part of the Marketplace runtime
- Does not alter engine behavior
- Does not bypass dispatcher authority


## 3. Invocation Contract

All engines are invoked using workflow_call.

### Required Inputs (All Engines)

Input           Type    Source       Description
target_repo      string  dispatcher   <owner>/<repo> under operation
telemetry_repo   string  preflight    Fully qualified telemetry repository
correlation_id   string  dispatcher   Run-scoped correlation identifier
engine_ref       string  dispatcher   Immutable engine repository ref (tag or SHA)

These inputs are mandatory and uniform across all engines.

### engine_ref (Locked execution pin)

- engine_ref MUST be provided by the dispatcher to every engine invocation.
- In Marketplace runtime, engine_ref MUST be a tag or SHA (no floating branches).
- All engines in a dispatcher run MUST use the same engine_ref.
- Engines treat engine_ref as opaque and MUST NOT override or reinterpret it.


## 4. Correlation Model (Locked)

### Ownership

- The dispatcher owns the correlation namespace
- A correlation ID MAY be supplied externally (e.g., operator tooling)
- The dispatcher MUST normalize and propagate a single correlation ID per run
- Engines must treat the correlation ID as opaque

### Scope

- One dispatcher run → one correlation ID
- All engines in that run emit telemetry under the same directory

### Canonical Directory Layout
telemetry/v1/
└─ repos/<owner-repo>/<date>/<correlation_id>/
   ├─ preflight.json
   ├─ validate.json
   ├─ self-test.json
   ├─ enforce.json
   ├─ materialize.json
   └─ dashboard.json

- Missing files are allowed
- Duplicate files are not


## 5. Telemetry Contract (Canonical)

Every engine must emit exactly one telemetry record per invocation.

### Emission Rules
- Append-only
- Immutable after write
- Written only to telemetry_repo
- Never written to the monitored repository
- MUST be emitted via the shared emit-engine mechanism (no bespoke emitters)

### emit-engine (Required)

All engines MUST emit telemetry using the shared `emit-engine` helper to ensure:

- Canonical envelope shape
- Single-record-per-engine enforcement
- Standard ok=false failure reporting
- Safe retry behavior on write conflicts (e.g. 409)

Engines MUST NOT manually craft or write telemetry payloads outside emit-engine.

### Canonical Telemetry Envelope

Each engine emits a JSON document with the following top-level structure:

- schema_version
- generated_at (UTC ISO-8601)
- correlation_id
- engine_name
- engine_ref
- source
- entity
- event
- ok
- details

### Engine Result Location

- Engine-specific results MUST appear under `details`
- Engines MUST NOT redefine repository identity fields
- Engines MUST NOT modify correlation metadata


## 6. Environment Guarantees

Each engine is provided the following environment variables:

Variable        Description
CORRELATION_ID  Dispatcher-generated
ENGINE_NAME     Stable engine identifier
ENGINE_REF      Dispatcher-provided execution ref (tag or SHA)
ENGINE_JOB      Job name (diagnostics only)
TELEMETRY_REPO  Telemetry destination

Engines must not depend on:
- GitHub event payloads
- Runner state
- Artifacts from other jobs


## 7. Authentication Model

All engines authenticate using a GitHub App installation token.

### Allowed Access
- Read access to target_repo
- Write access only to telemetry_repo
- Additional write access only when required by engine purpose (e.g. enforcement, materialization)

### Forbidden
- Personal Access Tokens (PATs)
- User credentials
- Cross-organization access
- Dynamic permission escalation


## 8. Engine Classification

### A. Read-Only Engines

Examples:
- preflight
- validate
- self-test
- dashboard

Note: The self-test dispatcher mode invokes both the self-test and dashboard engines
under a shared correlation ID.

Rules:
- No mutations to target_repo
- Telemetry-only side effects
- Fail safely

### B. Conditional Enforcement Engines

Examples:
- enforce

Rules:
- Metadata mutations only when explicitly configured
- Deterministic behavior
- Idempotent where feasible

### C. Explicit Materialization Engines

Examples:
- materialize

Rules:
- Manual invocation only
- Declarative intent from configuration
- Metadata creation only
- No speculative behavior


## 9. Failure Semantics

### Engine Failure

- Engines exit non-zero on failure
- Telemetry is still emitted (ok=false)
- Engines do not retry internally

### Dispatch & Transport Failures

- Dispatch failures may be retried by operator tooling
- Telemetry emission may retry on safe GitHub errors (e.g. 409)
- Engine logic is never re-executed automatically

### Failure Isolation
- Failures do not cascade
- One engine’s failure does not suppress unrelated engines

### Visibility
- Failures visible via GitHub Actions logs only
- No user notifications
- No enforcement side effects


## 10. Engine Versioning Rules

- Engines are versioned by Task Assistant repository ref (engine_ref)
- Host repositories never pin engine versions
- The dispatcher is the only authority that selects engine_ref
- Breaking interface changes require:
  - A new engine name or
  - A major phase boundary


## 11. Prohibited Patterns (Hard No)

### Engines must never:
- Read infra registries directly
- Execute code from target repositories
- Create pull requests
- Write dashboards into monitored repositories
- Trigger other workflows
- Accept free-form user input


## 12. Compliance Checklist (For New Engines)

### Before adding a new engine:
-  Uses workflow_call
-  Accepts only standard inputs (including engine_ref)
-  Emits exactly one telemetry record via emit-engine
-  Does not generate correlation IDs
-  Has a single responsibility
-  Is safe to disable
-  Is independently reviewable for Marketplace

## Canonical Statement

Task Assistant engines are deterministic, stateless executors invoked by a central dispatcher under a pinned engine_ref. Preflight executes first to establish run invariants. Engines operate only on explicitly provided inputs, emit immutable telemetry via emit-engine, and respect strict trust boundaries between enforcement, observability, and infrastructure.
