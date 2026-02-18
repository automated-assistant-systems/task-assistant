# Task Assistant — Marketplace Reviewer Summary (Authoritative)

Status: Phase 3.5 Runtime Model  

---

## What This App Does

Task Assistant is a GitHub App that enforces repository hygiene using explicit, configuration-driven rules under a deterministic, version-pinned runtime model.

All execution is:

- Preflight-gated
- Dispatcher-controlled
- Version-pinned via engine_ref
- Fully auditable via immutable telemetry

No speculative behavior exists.
No hidden automation exists.
No destructive action occurs without explicit configuration.

---

## Runtime Model (Non-Negotiable)

Task Assistant executes under a strictly ordered model:

Dispatcher → Preflight → Engine(s) → emit-engine → Telemetry Repository

Guarantees:

- Preflight validates before any mutation
- engine_ref pins runtime version
- Engines are stateless and deterministic
- Exactly one telemetry record per engine invocation
- Telemetry written only to a dedicated telemetry repository

No engine runs autonomously.

---

## What Runs Automatically

Task Assistant executes only explicitly invoked runtime engines:

### Preflight Engine
- Validates installation, permissions, and runtime invariants
- Prevents mutation before validation
- Emits immutable telemetry

### Validation Engine
- Validates configuration
- Non-mutating
- Deterministic

### Enforcement Engine
- Responds to issue events
- Applies only explicitly configured rules
- Deterministic and idempotent

### Materialize Engine (Manual Only)
- Creates missing labels/milestones
- Explicitly invoked
- Safe to re-run

### Dashboard Engine
- Reads telemetry only
- Produces derived artifacts
- Never mutates monitored repositories

No other scripts or background processes execute.

---

## Version Pinning & Reproducibility

All runtime execution is pinned to engine_ref:

- Selected by dispatcher
- Tag or SHA in Marketplace mode
- Identical across engines in a single run
- Recorded in every telemetry record

This guarantees reproducibility and auditability.

---

## Telemetry & Dashboards

### Telemetry

Telemetry is:

- Written only to a dedicated telemetry repository
- Partitioned by repository, date, and correlation
- Exactly one JSON file per engine invocation
- Immutable once written
- Version-attributed (engine_ref included)

Telemetry is the canonical audit record.

### Dashboards

Dashboards are:

- Derived artifacts
- Fully regenerable
- Read-only
- Deterministic
- Never written to monitored repositories
- Never influence enforcement behavior

---

## Authentication & Permissions

All automation uses:

- GitHub App installation tokens
- Least-privilege repository permissions
- No PATs
- No user credentials
- No cross-org escalation

Mutation requires:

- Valid installation
- Successful preflight
- Explicit engine invocation

---

## Failure & Safety Behavior

Failures:

- Emit telemetry with ok=false
- Do not mutate repositories
- Do not cascade
- Are visible via GitHub Actions logs

Failures never:

- Propagate across repositories
- Trigger hidden retries
- Generate unintended side effects

---

## Explicit Non-Behaviors

Task Assistant does NOT:

- Modify source code
- Create or modify pull requests
- Execute repository code
- Run arbitrary scripts
- Perform speculative actions
- Self-install or self-update
- Aggregate across organizations
- Write dashboards into monitored repositories

---

## Security Posture

Task Assistant is secure by construction:

- Preflight-gated mutation
- Dispatcher-controlled execution
- Version-pinned runtime
- Immutable telemetry
- Deterministic behavior
- Strict identity boundaries

All behavior is explicit, auditable, and Marketplace-safe.

---

## Validation Evidence

Phase 3.5 runtime hardening validation confirms:

- engine_ref propagation across engines
- Preflight gating prevents unsafe mutation
- Single-record-per-engine enforcement
- Immutable telemetry writes
- Cross-org mutation blocking

Validation artifacts are available under:

docs/validation/phase-3.5-runtime-hardening.md
docs/validation/results/
