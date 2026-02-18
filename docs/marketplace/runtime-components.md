# Runtime Execution Components (Authoritative)

This document defines the official runtime surface of **Task Assistant for GitHub Marketplace**.

Only the components described here execute in production.

No hidden engines exist.  
No undocumented behavior exists.

---

## 1. Runtime Model (Non-Negotiable)

Task Assistant operates under a strictly ordered, version-pinned runtime model:

Dispatcher → Preflight → Engine(s) → emit-engine → Telemetry Repository

This flow is mandatory and cannot be bypassed.

All runtime execution is:

- Deterministic
- Version-pinned
- Preflight-gated
- Telemetry-backed
- GitHub App–authenticated

---

## 2. Dispatcher

**Role:** Orchestration authority  
**Surface:** GitHub App runtime  

Responsibilities:

- Receives GitHub events
- Generates or normalizes correlation_id
- Selects engine_ref (tag or SHA)
- Invokes preflight
- Sequences engines
- Halts execution on preflight failure

Guarantees:

- Contains no business logic
- Performs no repository mutations
- Does not write telemetry directly
- All engines in a run share identical engine_ref

The dispatcher is the only component allowed to select runtime version.

---

## 3. Preflight (Mandatory Validation Stage)

Preflight executes first in every dispatcher run.

Capabilities:

- Validates GitHub App installation
- Resolves telemetry repository
- Confirms authentication scope
- Confirms repository eligibility
- Establishes runtime invariants

Behavior:

- Non-mutating
- Emits exactly one telemetry record
- Stops execution on failure
- Runs under the same engine_ref as subsequent engines

No engine executes before preflight succeeds.

---

## 4. Engines

Engines are stateless execution units invoked via workflow_call.

Each engine:

- Receives target_repo, telemetry_repo, correlation_id, engine_ref
- Is deterministic
- Is version-pinned
- Emits exactly one telemetry record via emit-engine
- Does not invoke other engines
- Does not generate correlation IDs
- Does not override engine_ref

Engines never:

- Execute repository code
- Create pull requests
- Run arbitrary scripts
- Escalate permissions
- Cross organization boundaries

---

## 5. Engine Types

### 5.1 Validation Engine

Purpose:

- Validates Task Assistant configuration
- Performs deterministic evaluation
- Emits validation telemetry

Guarantees:

- No repository mutation
- Safe to run repeatedly
- Idempotent

---

### 5.2 Materialize Engine

Purpose:

- Creates missing labels or milestones
- Reconciles configuration with repository metadata

Behavior:

- Manual invocation only
- Deterministic
- Idempotent
- Emits telemetry describing actions taken

Guarantees:

- Never modifies source code
- Safe to re-run

---

### 5.3 Enforcement Engine

Purpose:

- Responds to issue lifecycle events
- Applies explicitly configured rules

Behavior:

- Triggered by GitHub issue events
- Applies deterministic rule evaluation
- Emits telemetry for each decision

Guarantees:

- No speculative mutations
- No silent corrections
- No cross-repository access

---

### 5.4 Self-Test Engine

Purpose:

- Validates system integrity
- Confirms telemetry write capability
- Confirms configuration validity

Behavior:

- Manual invocation
- Emits telemetry
- Does not mutate repositories

---

### 5.5 Dashboard Engine

Purpose:

- Aggregates telemetry
- Produces read-only dashboard artifacts

Behavior:

- Reads telemetry repository only
- Emits dashboard telemetry
- Does not mutate monitored repositories

---

## 6. Version Pinning (engine_ref)

All runtime execution is pinned to engine_ref.

Rules:

- engine_ref is selected by the dispatcher
- In Marketplace mode, engine_ref must be a tag or SHA
- Floating branches are not permitted
- engine_ref is recorded in every telemetry record
- All engines in a dispatcher run share the same engine_ref

This guarantees reproducibility and auditability.

---

## 7. Telemetry Emission (emit-engine)

All engines emit telemetry exclusively via emit-engine.

Capabilities:

- Canonical envelope structure
- engine_name + engine_ref inclusion
- ok success indicator
- Single-record-per-engine enforcement
- Immutable append-only write
- Safe retry on write conflict

Telemetry:

- Is written only to a dedicated telemetry repository
- Is never written to monitored repositories
- Does not influence execution outcomes

---

## 8. Authentication Model

All runtime components use:

- GitHub App authentication
- Installation-scoped tokens
- No PATs
- No user credentials
- No cross-org escalation

Authentication validity is verified during preflight.

---

## 9. Explicit Non-Behaviors

Task Assistant runtime components do NOT:

- Execute arbitrary code
- Modify repository source code
- Create pull requests
- Self-install or self-update
- Run local scripts
- Cross organization boundaries
- Override engine_ref
- Write telemetry directly (engines must use emit-engine)

---

## 10. Deterministic Guarantees

The runtime guarantees:

- One dispatcher run → one correlation_id
- One engine invocation → one telemetry file
- Preflight executes first
- No mutation before validation
- Version-pinned execution
- Immutable telemetry
- No hidden execution paths

---

## 11. Marketplace Safety Statement

Task Assistant runtime components are:

- Explicit
- Deterministic
- Preflight-gated
- Version-pinned
- Fully auditable
- Safe for GitHub Marketplace distribution

No hidden engines exist.  
No undocumented behavior exists.
