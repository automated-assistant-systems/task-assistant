# Phase 3.4 — Test 03: Multi-Org Concurrent Enforcement

## Purpose

This test validates that **Task Assistant enforcement behaves correctly when multiple repositories in different GitHub organizations are processed concurrently**.

Specifically, it proves that:

- Enforcement logic is **event-driven and deterministic**
- No shared state or race conditions exist across organizations
- Telemetry is **correctly isolated per organization**
- Enforcement does **not destabilize repository configuration**

This test is a **core Marketplace readiness requirement**.

---

## Repositories Under Test

| Organization | Repository |
|-------------|------------|
| automated-assistant-systems | `task-assistant-sandbox` |
| garybayes | `ta-marketplace-install-test` |

Each repository:
- Is registered in **infra v2**
- Has its **own telemetry repository**
- Is marked as `sandbox` and `enabled`

---

## Test Strategy

### Why This Test Is Operator-Driven

This test is intentionally **not executed as a GitHub Actions matrix**.

Reason:
- Marketplace-installed GitHub Apps have **restricted permissions** when triggering cross-org issue mutation from CI
- Resetting repositories and installing apps are **mutating operations** that must be serialized

To preserve correctness, the test is split into two phases:

---

### Phase A — Operator Preparation (Serial)

Performed locally by the operator:

1. Reset sandbox state (issues, labels, milestones, telemetry)
2. Install Task Assistant
3. Prepare repo (labels + milestones)
4. Run self-test and validate to confirm readiness

This guarantees that **both repositories start from a clean, equivalent baseline**.

---

### Phase B — Concurrent Enforcement (Parallel)

Performed via **separate command-line executions**, one per repository:

scripts/validation/run-enforcement-only.sh test-03-multi-org <owner/repo>

Each invocation:

Creates an intentionally invalid issue

Applies conflicting phase labels

Waits for enforcement to resolve the conflict

Verifies the final issue state

Runs post-enforcement validation

Collects telemetry evidence

These executions run concurrently and independently.

What Is Being Proven
1. Enforcement Correctness

For each repository:

Conflicting labels (phase-3.4 + phase-3.5) are applied

Enforcement removes invalid state deterministically

Milestones are synchronized correctly

Final issue state is valid

2. Multi-Org Isolation

Each repository writes telemetry only to its own org’s telemetry repo

No shared paths or collisions occur

Correlation IDs are independent

This confirms no cross-org state leakage.

3. Post-Enforcement Hygiene

After enforcement:

engine-validate is dispatched

Repository configuration remains valid

No unintended side effects are introduced

This confirms enforcement is safe and non-destructive.

Evidence Artifacts
File
automated-assistant-systems-task-assistant-sandbox.json
garybayes-ta-marketplace-install-test.json

Each file contains:

Preflight events

Self-test results

Enforcement execution

Validation confirmation

Telemetry metadata

Correlation IDs

Outcome

✅ PASS

Task Assistant successfully enforces rules concurrently across multiple organizations with:

Deterministic behavior

Correct isolation

Valid telemetry

Stable repository state

This test satisfies the multi-org concurrency requirement for Phase 3.4 Marketplace readiness.

Notes

Concurrency is validated through simultaneous execution, not shared workflows

This approach mirrors real-world Marketplace usage more accurately than CI-based mutation

The same enforcement runner is reused for Tests 06 and 07
