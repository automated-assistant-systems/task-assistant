# Task Assistant — System Summary (Authoritative)

Status: Canonical  
Phase: 3.5 — Runtime Hardening Complete  
Scope: End-to-end runtime architecture and execution guarantees  

---

## 1. System Overview

Task Assistant is a deterministic GitHub App–based automation system built around a dispatcher-controlled runtime model.

It consists of:

A. Dispatcher (Orchestration Layer)  
B. Engines (Stateless Execution Units)  
C. emit-engine (Telemetry Authority)  
D. Dedicated Telemetry Repository  

Execution is version-pinned, preflight-gated, and audit-backed.

---

## 2. Runtime Architecture

Task Assistant executes under the following invariant flow:

Dispatcher → Preflight → Engine(s) → emit-engine → Telemetry Repository

This flow is mandatory and cannot be bypassed.

---

## 3. Dispatcher Responsibilities

The dispatcher is the single orchestration authority.

It owns:

- Event interpretation
- Correlation ID generation and normalization
- Engine sequencing
- engine_ref selection and propagation
- Halting execution on preflight failure

The dispatcher:

- Does not perform engine logic
- Does not write telemetry
- Does not mutate repositories directly

All authority flows through the dispatcher.

---

## 4. Preflight (Mandatory First Stage)

Preflight executes first in every dispatcher run.

Preflight validates:

- GitHub App installation
- Repository eligibility
- Telemetry repository resolution
- Authentication scope
- Runtime invariants

If preflight fails:

- Execution halts
- No mutation occurs
- Telemetry is emitted with ok=false

Preflight is non-mutating.

---

## 5. Engine Model

Engines are:

- Stateless
- Deterministic
- Version-pinned
- Infra-agnostic
- Invoked via workflow_call

Each engine:

- Receives target_repo, telemetry_repo, correlation_id, engine_ref
- Emits exactly one telemetry record
- Does not invoke other engines
- Does not generate correlation IDs
- Does not override engine_ref
- Does not write telemetry directly

All engines in a run share the same:

- correlation_id
- engine_ref

---

## 6. Version Pinning (engine_ref)

All runtime execution is version-pinned.

Rules:

- engine_ref is selected by the dispatcher
- Marketplace runtime requires tag or SHA
- Floating branches are not permitted in production
- engine_ref is recorded in every telemetry record

This guarantees reproducibility and auditability.

---

## 7. Telemetry Model

Telemetry is:

- Immutable
- Append-only
- Single-record-per-engine
- Written only to a dedicated telemetry repository
- Emitted exclusively via emit-engine

Telemetry includes:

- engine_name
- engine_ref
- correlation_id
- ok (success indicator)
- Deterministic envelope structure

Host repositories never store telemetry.

---

## 8. Authentication Model

All engines and dispatcher operations use:

- GitHub App authentication
- Installation-scoped tokens
- No PATs
- No user credentials
- No cross-organization escalation

Authentication is validated during preflight.

---

## 9. Determinism Guarantees

Task Assistant guarantees:

- One dispatcher run → one correlation_id
- One engine invocation → one telemetry file
- Identical inputs under identical engine_ref produce identical behavior
- No mutation before validation
- No hidden execution paths
- No dynamic code loading from monitored repositories

---

## 10. Operational Modes

Task Assistant runs as:

- GitHub App (primary mode)
- GitHub Actions–invoked engines

Local development (Express/ngrok) is a development convenience only.

The runtime model is defined by dispatcher and engines — not by server implementation.

---

## 11. Storage Model

Telemetry repository structure:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/<category>.json

Partitioned by:

- Repository
- Date (UTC)
- Correlation
- Engine category

No cross-correlation mixing permitted.

---

## 12. Security Posture

Task Assistant enforces:

- Strict separation of orchestration and execution
- Non-mutating validation stage
- Single-writer telemetry authority
- Version-pinned runtime execution
- No repository code execution
- No pull request creation by engines

The system is Marketplace-safe and audit-friendly.

---

## 13. Current State

As of Phase 3.5:

- engine_ref propagation enforced
- Preflight gating mandatory
- emit-engine required
- Telemetry Schema v1.0 locked
- Runtime model documented and validated
- Validation evidence captured
- Marketplace posture strengthened

The system operates as deterministic automation infrastructure.

---

## 14. Canonical Declaration

Task Assistant is a version-pinned, preflight-gated, dispatcher-controlled automation platform. Engines are stateless execution units emitting immutable telemetry exclusively through emit-engine. All execution is deterministic, auditable, and reproducible under engine_ref. The runtime model is formally documented and locked under Phase 3.5.
