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
- No engine becomes implicit, special-cased, or ad-hoc

Any new engine must conform to this specification.

## 2. Architectural Model (Non-Negotiable)

Task Assistant follows a strict Dispatcher → Engine model.

### Dispatcher Responsibilities

The dispatcher owns:
- Event interpretation
- Execution sequencing
- Correlation ID generation
- Engine orchestration

### Engine Responsibilities

Engines are:
- Stateless
- Deterministic
- Configuration-driven
- Telemetry-emitting
- Infra-agnostic

Engines MUST NOT

### Engines must never:

Discover infrastructure on their own
- Generate or mutate correlation IDs
- Inspect unrelated repositories
- Invoke other engines
- Contain cross-engine logic

## 3. Invocation Contract

All engines are invoked using workflow_call.

### Required Inputs (All Engines)
Input		Type	Source		Description
target_repo	string	dispatcher	<owner>/<repo> under operation
telemetry_repo	string	preflight	Fully qualified telemetry repository
correlation_id	string	dispatcher	Run-scoped correlation identifier

These inputs are mandatory and uniform across all engines.

## 4. Correlation Model (Locked)

### Ownership

- Correlation IDs are generated once by the dispatcher
- Engines must not generate, alter, or reinterpret them

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

## 5. Telemetry Contract

Every engine must emit exactly one telemetry record per invocation.

### Emission Rules
- Append-only
- Immutable after write
- Written only to telemetry_repo
- Never written to the monitored repository

### Required Telemetry Fields
Field		Description
engine		Stable engine identifier
ok		Boolean success indicator
target_repo	<owner>/<repo>
correlation_id	Dispatcher-provided
summary		Human-readable outcome
timestamp	UTC ISO-8601

Additional structured fields are allowed, but these fields are mandatory.

## 6. Environment Guarantees

Each engine is provided the following environment variables:

Variable	Description
CORRELATION_ID	Dispatcher-generated
ENGINE_NAME	Stable engine identifier
ENGINE_JOB	Job name (diagnostics only)
TELEMETRY_REPO	Telemetry destination

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
- materialize-repo

Rules:
- Manual invocation only
- Declarative intent from configuration
- Metadata creation only
- No speculative behavior

## 9. Failure Semantics

### Engine Failure
- Engine exits non-zero
- Telemetry is still emitted (ok=false)
- No automatic retries

### Failure Isolation
- Failures do not cascade
- One engine’s failure does not suppress unrelated engines

### Visibility
- Failures visible via GitHub Actions logs only
- No user notifications
- No enforcement side effects

## 10. Engine Versioning Rules

- Engines are versioned by Task Assistant repository ref
- Host repositories never pin engine versions
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
-  Accepts only standard inputs
-  Emits exactly one telemetry record
-  Does not generate correlation IDs
-  Has a single responsibility
-  Is safe to disable
-  Is independently reviewable for Marketplace

## Canonical Statement

Task Assistant engines are deterministic, stateless executors invoked by a central dispatcher. They operate only on explicitly provided inputs, emit immutable telemetry, and respect strict trust boundaries between enforcement, observability, and infrastructure.
