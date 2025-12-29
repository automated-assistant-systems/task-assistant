# Validation Philosophy

## Purpose

Task Assistant validation is designed to **discover the full behavioral surface** of the system, not merely to gate releases.

Validation prioritizes:
- Exhaustive signal collection
- Deterministic reproduction
- Explicit acknowledgment of known gaps

Early termination is considered harmful to this goal.

---

## Core Principles

### 1. Non-Blocking Execution
All validation scenarios must be attempted, even after failures are detected.

- Assertions **must not throw**
- Failures are recorded, not escalated immediately
- Execution continues to completion

This ensures a complete view of system behavior in a single run.

---

### 2. Evidence Is the Source of Truth
The validation run produces a structured evidence artifact that captures:
- All executed scenarios
- All failures (with reasons)
- Final aggregate status

Human judgment is applied **after** evidence is produced — never during execution.

---

### 3. Exit Status Reflects Aggregate Outcome
Process exit codes signal overall health without interrupting execution.

- `process.exitCode = 1` indicates failures were observed
- Execution is never aborted due to a single failing scenario

---

### 4. Determinism Over Convenience
Validation runners are designed to:
- Avoid implicit retries
- Avoid hidden state mutation
- Prefer clarity over performance

This makes failures explainable, reproducible, and actionable.

---

## Non-Goals

Validation is **not** intended to:
- Enforce correctness at scale (stress testing)
- Mask known deficiencies
- Auto-remediate system behavior

Those concerns are addressed in later phases.
