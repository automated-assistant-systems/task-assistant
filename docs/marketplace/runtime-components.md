# Runtime Execution Components

This document defines the **authoritative runtime components** that execute as part of **Task Assistant for GitHub**.

Only the components described here are part of the GitHub Marketplace runtime surface.
No other behavior exists.

---

## Execution Model (Non-Negotiable)

Task Assistant operates using a strict **Dispatcher → Engine** model.

- The **Dispatcher** decides *when* something runs
- **Engines** decide *what* runs
- **Telemetry** records *what happened*

No engine runs autonomously.
No engine is embedded in customer repositories.

---

## Dispatcher Workflow

**Component:** `task-assistant-dispatch.yml`  
**Location:** Customer repository  
**Role:** Routing and orchestration only

Responsibilities:
- Receives GitHub events (push, issues, schedule, manual dispatch)
- Resolves execution mode (validate, materialize, self-test, enforce)
- Generates a run-scoped correlation ID
- Invokes exactly one engine per job

Guarantees:
- Contains no business logic
- Performs no repository mutation
- Is safe to inspect, edit, or delete

---

## Preflight Engine

Validates infrastructure and execution prerequisites before any other engine runs.

Capabilities:
- Repository registration resolution
- Telemetry repository resolution
- Permission verification
- Execution gating

Behavior:
- Runs at the start of every execution chain
- Fails fast if prerequisites are not satisfied
- Emits telemetry describing resolution outcome
- Never mutates repositories

---

## Validation Engine

Validates Task Assistant configuration without modifying repositories.

Capabilities:
- Schema validation of `.github/task-assistant.yml`
- Detection of invalid or unsafe configurations
- Deterministic, repeatable evaluation

Behavior:
- Runs automatically on configuration changes
- Runs on a nightly schedule
- Can be triggered manually
- Emits telemetry describing validation results
- Performs **no repository mutations**

---

## Materialize Repository Engine

Creates repository metadata **only when explicitly requested**.

Capabilities:
- Creates missing labels
- Creates missing milestones
- Reconciles configuration with repository state

Behavior:
- Runs **only** via manual dispatch
- Reads configuration as the sole source of truth
- Applies idempotent, deterministic changes
- Emits telemetry describing what was created or skipped

Guarantees:
- Never modifies code
- Never runs automatically
- Safe to re-run at any time

---

## Enforcement Engine

Responds to GitHub issue events using configuration-driven rules.

Capabilities:
- Issue lifecycle enforcement
- Label and milestone hygiene
- Deterministic state correction

Behavior:
- Triggered only by relevant GitHub events
- Applies **only** explicitly configured rules
- Skips all actions if configuration is invalid
- Emits telemetry for every enforcement decision

Guarantees:
- No speculative mutations
- No cross-repository access
- No silent behavior

---

## Dashboard Engine

Builds read-only observability artifacts from telemetry.

Capabilities:
- Aggregates telemetry into dashboards
- Produces derived, read-only artifacts

Behavior:
- Runs as part of self-test workflows
- Runs on a scheduled basis
- Reads telemetry only
- Never mutates monitored repositories

---

## Telemetry Emission (Shared Component)

All engines emit structured telemetry using a shared, audited mechanism.

Capabilities:
- Immutable, append-only records
- Run-scoped correlation
- Cross-repository storage using GitHub App identity

Behavior:
- Writes telemetry to a dedicated telemetry repository
- Never writes to monitored repositories
- Does not influence execution outcomes

---

## Explicit Non-Behaviors

Task Assistant runtime components **do not**:

- Execute arbitrary code
- Modify repository source code
- Create pull requests
- Run local scripts
- Require developer machines
- Cross organization boundaries
- Self-install or self-update

---

## Summary

Task Assistant runtime behavior is:

- Explicit
- Deterministic
- Manually gated for mutations
- Fully auditable via telemetry
- Safe for GitHub Marketplace distribution

No hidden engines exist.
No undocumented behavior exists.
