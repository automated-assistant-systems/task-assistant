# Phase 2 Telemetry Enhancements — Design Notes

## Status
**Phase:** Post–Phase 2 Functional Validation  
**State:** Design captured, implementation deferred  
**Audience:** Task Assistant core, validation tooling, future marketplace release

---

## Context

Phase 2 functional validation successfully exercised the Task Assistant
across real GitHub events using a config-driven validation runner.

The objective of Phase 2 was **behavioral discovery**, not strict enforcement.
As a result, several failures were **intentionally allowed and recorded**
to surface gaps in telemetry clarity and policy enforcement.

These findings now inform a coherent telemetry enhancement phase.

---

## Goals

1. Preserve full functional evidence across repos
2. Avoid premature enforcement that would block rollout
3. Enable multi-repo installation before optimization
4. Batch telemetry and policy fixes into planned enhancement sprint(s)
5. Make Task Assistant behavior fully explainable via telemetry

---

## Non-Goals (Explicitly Deferred)

- Stress testing
- Performance benchmarking
- Marketplace-scale concurrency assumptions
- Auto-migration of historical issues
- Hard enforcement without telemetry justification

These will be addressed **after initial rollout** or post-marketplace release.

---

## Current Telemetry Model (As-Is)

### Evidence Structure
- Scenario-based execution log
- Timestamped entries
- PASS / FAIL outcomes per scenario
- Assertions recorded as failures without aborting execution
- Final run status derived from accumulated failures

### Characteristics
- Deterministic, sequential execution
- Non-fatal assertion failures
- Full run completion regardless of failure count
- Evidence JSON serves as canonical validation artifact

---

## Observed Gaps (Phase 2 Findings)

The following failures were **expected and accepted** in Phase 2:

### 1. Milestone Enforcement Gap
- Applying a milestone-enabled track label does **not** automatically enforce a milestone
- Enforcement currently occurs only via explicit user action or separate workflows

### 2. Track Switch Reconciliation
- Switching from a non-milestone track to a milestone track does not retroactively enforce a milestone
- Telemetry captures the outcome but policy is not applied

### 3. Parent → Child Inheritance
- Child issues do not inherit milestone-track context from parent issues
- Current system has no encoded inheritance semantics

### 4. Label Hygiene
- Multiple `track/*` labels can coexist
- No normalization or invariant enforcement is currently applied

### 5. Telemetry Ambiguity
- Failures are detected correctly
- Telemetry does not yet explain *why* enforcement did not occur (policy vs omission)

---

## Intended Enhancements (To-Be)

These enhancements are **design targets**, not yet implemented.

### Telemetry Enhancements
- Explicit decision logging for:
  - Milestone enforcement evaluation
  - Track switch reconciliation
  - Label normalization decisions
  - Inheritance resolution
- Distinguish between:
  - “Policy evaluated and skipped”
  - “Policy not implemented”
  - “Policy applied successfully”

### Policy Enhancements
- Single-track invariant enforcement
- Optional milestone enforcement on track assignment
- Track-switch reconciliation logic
- Configurable inheritance semantics (explicit, not implicit)

### Validation Enhancements
- Phase-3 validation suite asserting *explainability*, not just outcomes
- Telemetry-first assertions (decision paths visible in evidence)

---

## Rollout Strategy

1. **Current State**
   - Accept Phase 2 failures as known gaps
   - Preserve evidence as authoritative

2. **Multi-Repo Installation**
   - Install Task Assistant on:
     - task-assistant
     - validation repo
     - work assistant repo
     - book repo

3. **Discovery Consolidation**
   - Observe additional gaps surfaced by real usage
   - Avoid one-off fixes

4. **Enhancement Sprint(s)**
   - Implement telemetry + policy improvements together
   - Update validation suite accordingly

5. **Stress Testing**
   - Perform only when behavior is finalized
   - May occur post-release due to low initial adoption risk

---

## Acceptance Criteria (Future Phase)

Telemetry enhancement phase is considered complete when:

- All policy decisions are explicitly logged
- Validation failures are explainable via telemetry alone
- Phase-3 functional validation passes
- No ambiguous “silent behavior” remains

---

## Canonical References

- Phase 2 Functional Evidence JSON (validation repo)
- `run-phase-2-functional.js`
- Task Assistant workflow definitions
- `.github/task-assistant.yml` track configuration

---

## Summary

Phase 2 successfully validated **what the system does today**.
This document defines **what the system is intended to explain and enforce next**.

No further Phase 2 work is required.
All findings are captured and ready for enhancement planning.
