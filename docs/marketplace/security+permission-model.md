# Task Assistant — Security & Permission Model (Reviewer Summary)

Status: Canonical  
Phase: 3.5 — Runtime Hardening Complete  

---

## 1. Overview

Task Assistant enforces strict, defense-in-depth controls over all repository mutations.

No repository mutation can occur unless:

1. GitHub permissions allow it  
2. Preflight validation succeeds  
3. The dispatcher selects a valid engine_ref  
4. The invoked engine explicitly performs a deterministic mutation  
5. Telemetry is emitted via emit-engine  

This model is enforced uniformly across validation, enforcement, materialization, self-test, and dashboard workflows.

Security is enforced through both **identity boundaries** and **runtime architecture guarantees**.

---

## 2. Identity-Based Access Control

All runtime operations execute under:

- A GitHub App installation token
- Scoped to the specific repository installation

Task Assistant:

- Never uses Personal Access Tokens (PATs)
- Never uses user credentials
- Never escalates privileges
- Never mutates repositories across org boundaries

If the active installation token lacks permission:

- The engine fails safely
- ok=false is emitted
- No mutation occurs

✔️ Verified across single-org and multi-org test matrices

---

## 3. Preflight Security Gate

Preflight is a mandatory first-stage validation engine.

Before any mutation-capable engine runs, preflight verifies:

- GitHub App installation validity
- Repository eligibility
- Telemetry repository write access
- Authentication scope
- Infra classification rules (if applicable)

If preflight fails:

- Execution halts
- No mutation occurs
- Telemetry is emitted with ok=false

Preflight enforces mutation gating before business logic executes.

---

## 4. Version-Pinned Execution (engine_ref)

All runtime execution is version-pinned via engine_ref.

Security guarantees:

- engine_ref is selected exclusively by the dispatcher
- In Marketplace runtime, engine_ref must be a tag or SHA
- Floating branches are not permitted
- Engines cannot override engine_ref
- engine_ref is recorded in every telemetry record

This prevents:

- Runtime code drift
- Implicit upgrades
- Hidden behavior changes
- Dynamic code execution ambiguity

Every mutation can be traced to a specific version of engine logic.

---

## 5. Engine Isolation Model

Engines are:

- Stateless
- Deterministic
- Infra-agnostic
- Invocation-bound
- Version-pinned

Engines do NOT:

- Execute arbitrary repository code
- Run local scripts
- Create pull requests
- Trigger other workflows
- Escalate privileges
- Cross organization boundaries
- Mutate repositories without explicit invocation

No engine runs autonomously.

All engines execute only when invoked by the dispatcher.

---

## 6. Mutation Guardrails

Every mutation path (labels, milestones, issue enforcement):

- Requires explicit engine execution
- Is deterministic
- Is idempotent where applicable
- Emits immutable telemetry
- Is traceable by correlation_id
- Is version-traceable via engine_ref

There are:

- No background mutation loops
- No hidden cron jobs
- No silent side effects
- No speculative changes

---

## 7. Infra-Governed Boundaries (If Applicable)

If infra registry is enabled:

- Certain operations are sandbox-restricted
- Destructive operations require explicit classification
- Non-sandbox repositories are protected from reset-like operations

These rules are enforced before mutation logic executes.

---

## 8. Telemetry as a Security Control

Telemetry is:

- Immutable
- Append-only
- Single-record-per-engine
- Written only to a dedicated telemetry repository
- Emitted exclusively via emit-engine

Each record includes:

- engine_name
- engine_ref
- correlation_id
- ok indicator
- Action metadata

This provides:

- Complete audit traceability
- Version attribution
- Failure visibility
- Forensic reconstruction capability

Telemetry does not influence runtime decisions.

---

## 9. Event-Driven Enforcement Safety

Issue enforcement:

- Is event-driven only
- Is scoped strictly to the repository where the event originated
- Cannot cross repositories
- Cannot cross organizations
- Cannot escalate permissions

Cross-repository enforcement is not possible under this model.

---

## 10. Deterministic Security Guarantees

Task Assistant guarantees:

- One dispatcher run → one correlation_id
- One engine invocation → one telemetry file
- Preflight executes before mutation
- No mutation before validation
- Version-pinned execution
- No dynamic code loading
- No repository code execution
- No hidden behavior paths

Determinism is a security property.

---

## 11. Verified Scenarios

The following scenarios were explicitly validated:

- ✅ Same-org mutation succeeds when permitted
- ✅ Cross-org mutation attempts fail safely
- ✅ Insufficient permissions block mutation
- ✅ Sandbox-only operations blocked outside sandbox
- ✅ Preflight failure halts execution
- ✅ engine_ref propagation consistent across engines
- ✅ Telemetry always written for success and failure
- ✅ No privilege escalation paths exist

---

## 12. Security Posture Summary

Task Assistant is secure by construction:

- Principle of least privilege
- Dispatcher-controlled execution
- Preflight-gated mutation
- Version-pinned engine logic
- Deterministic runtime model
- Immutable telemetry audit trail
- No autonomous engines
- No hidden mutation paths

Failures are intentional, safe, auditable, and version-traceable.

