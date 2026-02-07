---
# yamllint disable rule:truthy
# Engine Interaction Spec — Task Assistant / Codex Execution Suite

Version: 1.0.0  
Last Updated: 2026-01-08  
Status: Draft (Implementation-Ready)

## Purpose

This document defines the **full interaction contract** between:

- **Core Task Engines (7)**: the engines that perform development and testing work
- **Internal Support Engines (6)**: the engines that make execution safe, deterministic, auditable, and recoverable

The spec is designed for:
- deterministic behavior
- explainable decisions
- audit-ready evidence trails
- Marketplace-safe defaults (execution is opt-in)

---

## Definitions

### Task Run
A single execution instance bound to:
- one repo
- one trigger (issue/comment/dispatch)
- one `correlation_id`

### Artifact
A structured output (JSON, diff, logs) produced by an engine and consumed by later engines.

### Evidence
Pointers to inputs/outputs used to justify decisions (files, commands, logs, diffs).

---

## Engine Set

### Core Task Engines (7)

| ID | Name | Primary Responsibility |
|---|---|---|
| INTAKE | Intent Intake | Parse user intent into a structured Task Intent |
| CONTEXT | Context Assembly | Build repo + codebase context required to plan and act |
| PLAN | Change Planning | Produce a safe, testable change plan with risk assessment |
| MODIFY | Code Modification | Apply changes strictly according to the plan |
| TEST | Build & Test Execution | Run build/lint/tests as configured |
| EVAL | Result Evaluation | Determine outcome from results + acceptance criteria |
| DELIVER | Delivery & Reporting | PR creation, issue reporting, labels, evidence linking |

### Internal Support Engines (6)

| ID | Name | Primary Responsibility |
|---|---|---|
| CONFIG | Configuration Validation | Validate and resolve repo config and defaults |
| GATE | Permission & Capability Gate | Resolve what actions are allowed for this run |
| POLICY | Policy & Safety | Enforce guardrails; deny unsafe/prohibited actions |
| ORCH | Execution Orchestration | Enforce phase order, concurrency control, retries |
| TELEM | Telemetry & Evidence | Append-only event stream + evidence index |
| RECOVERY | Failure Analysis & Recovery | Classify failures; recommend retry/abort/adjust |

**Hard rule:** only **MODIFY** may change repository content.

---

## Execution Model

### Phase State Machine

Each run progresses in strict order:

1. RECEIVED
2. CONFIG_VALIDATED
3. CAPABILITIES_RESOLVED
4. INTENT_PARSED
5. CONTEXT_BUILT
6. PLAN_CREATED
7. PLAN_APPROVED (optional gate; recommended default)
8. CHANGES_APPLIED (optional; only if permitted)
9. TESTS_EXECUTED (optional; only if configured)
10. RESULT_EVALUATED
11. DELIVERED
12. Terminal: SUCCESS | PARTIAL | FAILED | BLOCKED | ABORTED

**Guarantee:** ORCH prevents skipping phases.

---

## Canonical Artifacts

These are the canonical per-run artifacts (names may be adjusted, but meaning must remain consistent):

- `task_intent.json`
- `context_bundle.json`
- `change_plan.json`
- `execution_plan.json`
- `patchset.diff`
- `modified_files_manifest.json`
- `test_results.json`
- `evaluation.json`
- `delivery_report.json`
- `telemetry/events/*.json`
- `telemetry/evidence_index.json`
- `run_state.json`
- `capabilities.json`
- `policy_decisions.json`
- `config_report.json`
- `recovery_plan.json` (if failures)

### Artifact Integrity
Every JSON artifact MUST include:
- `schema_version`
- `correlation_id`
- `engine_id`
- `created_at`
- `inputs_hash`
- `artifact_hash`

ORCH MUST treat mismatches as **tamper** and ABORT.

---

## Support Engine Contracts

### CONFIG — Configuration Validation

**Inputs**
- repo config (e.g., `.github/task-assistant.yml`)
- trigger payload
- repository metadata (default branch, languages)

**Outputs**
- `config_report.json`:
  - schema validity
  - resolved defaults
  - detected toolchain summary

**Failure Modes**
- BLOCKED if config invalid and policy disallows fallback
- PARTIAL if defaults applied safely

**Telemetry**
- `config.validation.started`
- `config.validation.result`

---

### GATE — Permission & Capability Gate

**Inputs**
- GitHub App installation permissions
- tier (Core/Pro/Enterprise)
- config_report

**Outputs**
- `capabilities.json` (capability matrix)
  - examples:
    - `can_read_repo`
    - `can_write_repo`
    - `can_create_branch`
    - `can_open_pr`
    - `can_run_actions`
    - `can_write_workflow_files` (default false)
    - `requires_human_approval_for_modify`
    - `allowed_paths`
    - `blocked_paths`

**Failure Modes**
- BLOCKED if requested actions exceed allowed capabilities

**Telemetry**
- `gate.capabilities.resolved`

---

### POLICY — Policy & Safety

**Inputs (by checkpoint)**
- after INTAKE: task_intent + capabilities
- after PLAN: change_plan + risk signals + capabilities
- after MODIFY: modified_files_manifest + diff summary (optional)

**Outputs**
- `policy_decisions.json`:
  - allow/deny/require approval
  - prohibited operations list (if any)
  - redaction requirements (logs)

**Failure Modes**
- BLOCKED on policy denial
- ABORTED on tamper detection

**Telemetry**
- `policy.checkpoint`
- `policy.denied` (if denied)

---

### ORCH — Execution Orchestration

**Inputs**
- trigger payload
- config_report
- capabilities
- policy_decisions

**Outputs**
- `run_state.json` (authoritative state + timestamps)
- `engine_invocations.json` (ordered list of steps)
- concurrency lock record (lease)

**Failure Modes**
- ABORTED on concurrency lock denial (unless queued mode exists)
- FAILED on unexpected runtime crash

**Telemetry**
- `orch.phase.entered`
- `orch.phase.exited`
- `orch.concurrency.lock_acquired|lock_denied`

---

### TELEM — Telemetry & Evidence

**Inputs**
- all artifacts and engine status transitions
- command logs, test logs, diffs, evidence pointers

**Outputs**
- append-only `telemetry/events/*.json`
- `telemetry/evidence_index.json`

**Failure Modes**
- Recommended: do not block execution; mark run PARTIAL if TELEM fails
- Enterprise option: policy can require TELEM and BLOCK on failure

**Telemetry**
- `telem.write.ok|error`

---

### RECOVERY — Failure Analysis & Recovery

**Inputs**
- failures from any phase
- exit codes, logs, stderr, context

**Outputs**
- `recovery_plan.json`:
  - class: CONFIG | PERMISSION | POLICY | INFRA | BUILD | LINT | TEST | LOGIC
  - recommended action: retry | adjust_plan | request_info | abort
  - retry limits/backoff (if enabled)

**Failure Modes**
- RECOVERY should not block; it advises ORCH

**Telemetry**
- `recovery.classified`
- `recovery.action.recommended`

---

## Core Engine Contracts

### INTAKE — Intent Intake

**Preconditions**
- CONFIG validated
- GATE resolves read permissions

**Inputs**
- issue body/comments/labels
- task templates (optional)

**Outputs**
- `task_intent.json`:
  - `task_type`
  - `acceptance_criteria[]`
  - `constraints[]`
  - `ambiguities[]`
  - `files_hint[]` (optional)
  - `tests_expected` (optional)

**Failure Modes**
- BLOCKED if ambiguity exists and config requires clarification
- PARTIAL if ambiguity exists but safe fallback allowed (e.g., docs-only)

**Telemetry**
- `intake.parsed`
- `intake.ambiguity.detected` (if any)

---

### CONTEXT — Context Assembly

**Preconditions**
- task_intent exists
- `capabilities.can_read_repo == true`

**Inputs**
- repo tree + targeted file reads
- search results within repo

**Outputs**
- `context_bundle.json`:
  - stack/toolchain detection
  - test framework detection
  - relevant files list + rationale
  - risks: migrations/secrets/workflows flags

**Failure Modes**
- FAILED if repo cannot be read
- PARTIAL if partial checkout prevents full context

**Telemetry**
- `context.built`

---

### PLAN — Change Planning

**Preconditions**
- context_bundle exists

**Inputs**
- task_intent
- context_bundle
- config constraints + capabilities

**Outputs**
- `change_plan.json`:
  - ordered `plan_steps[]`
  - `files_to_change[]` with rationale
  - `tests_to_run[]`
  - `risk_level` + `risk_reasons[]`
  - `rollback_strategy`
  - `requires_approval` boolean

**Failure Modes**
- BLOCKED if plan touches prohibited paths
- FAILED if no viable plan exists

**Telemetry**
- `plan.created`

---

### MODIFY — Code Modification

**Preconditions**
- change_plan exists
- `capabilities.can_write_repo == true`
- POLICY allows modification
- (optional) approval satisfied

**Inputs**
- change_plan
- repo working copy
- formatting/lint constraints

**Outputs**
- `patchset.diff`
- `modified_files_manifest.json` (hashes + counts)
- `work_branch_ref`

**Failure Modes**
- BLOCKED if gate denies write
- FAILED if patch cannot apply cleanly
- ABORTED on tamper/hash mismatch

**Telemetry**
- `modify.started`
- `modify.completed`

---

### TEST — Build & Test Execution

**Preconditions**
- execution_plan exists
- (optional) patch applied if testing code changes

**Inputs**
- `execution_plan.json`:
  - install command
  - lint command
  - unit test command
  - integration test command

**Outputs**
- `test_results.json`:
  - commands + exit codes
  - stdout/stderr references
  - durations
  - rerun/flaky signals (if enabled)

**Failure Modes**
- FAILED on build/lint/test failure
- PARTIAL if suites skipped by policy/tier

**Telemetry**
- `test.command.started|finished`
- `test.summary`

---

### EVAL — Result Evaluation

**Preconditions**
- tests executed OR explicitly skipped (with reason)

**Inputs**
- test_results
- acceptance_criteria
- plan + diff summary
- policy thresholds

**Outputs**
- `evaluation.json`:
  - outcome: SUCCESS | PARTIAL | FAILED | BLOCKED
  - reason_codes[]
  - evidence_refs[]
  - next_actions[] (optional)

**Failure Modes**
- FAILED if evaluation cannot be produced

**Telemetry**
- `eval.outcome`

---

### DELIVER — Delivery & Reporting

**Preconditions**
- evaluation exists
- capabilities allow delivery actions

**Inputs**
- evaluation
- branch ref + patchset
- evidence index

**Outputs**
- PR created/updated OR skipped with reason
- issue comment posted (structured)
- labels applied: SUCCESS/PARTIAL/FAILED/BLOCKED
- `delivery_report.json` (URLs/IDs if available)

**Failure Modes**
- PARTIAL if PR creation fails but comment succeeds
- FAILED if no delivery actions possible

**Telemetry**
- `deliver.pr.created|updated|skipped`
- `deliver.issue.commented`
- `deliver.labels.applied`

---

## Happy Path Sequence (Default Safe)

1. ORCH: RECEIVED
2. CONFIG: CONFIG_VALIDATED
3. GATE: CAPABILITIES_RESOLVED
4. POLICY: checkpoint (pre-intake)
5. INTAKE: INTENT_PARSED
6. POLICY: checkpoint (post-intake)
7. CONTEXT: CONTEXT_BUILT
8. PLAN: PLAN_CREATED
9. POLICY: checkpoint (post-plan) → may require PLAN_APPROVED
10. MODIFY: CHANGES_APPLIED (if enabled)
11. TEST: TESTS_EXECUTED (if enabled)
12. EVAL: RESULT_EVALUATED
13. DELIVER: DELIVERED
14. ORCH: terminal status

---

## Gates and Approval

### Mandatory Gates (recommended)
- before MODIFY:
  - `capabilities.can_write_repo == true`
  - `policy.allow_modify == true`
- before DELIVER:
  - `capabilities.can_open_pr` or `capabilities.can_comment_issue`

### Human Approval Gate (recommended default)
If `risk_level >= medium` OR config requires:
- ORCH pauses at PLAN_APPROVED
- requires explicit approval signal:
  - label (e.g., `approve:plan`) OR
  - comment directive OR
  - checkbox completion

---

## Failure Handling Rules

### Classification (RECOVERY)
- CONFIG
- PERMISSION
- POLICY
- INFRA
- BUILD
- LINT
- TEST
- LOGIC

### Retry Strategy (example defaults)
- INFRA: retry up to 2
- FLAKY_TEST: rerun failing tests once
- BUILD/LINT/LOGIC: no retry unless plan adjusted
- PERMISSION/POLICY: never retry (external fix required)

### Outcome Mapping
- Policy/permission denial → BLOCKED
- Test failure after changes → FAILED
- Delivery failures with green tests → PARTIAL

---

## Determinism Constraints

1. ORCH enforces strict phase ordering.
2. Only MODIFY mutates repo content.
3. All outputs are artifacted and hashed.
4. TELEM is append-only.
5. Any artifact tamper/mismatch → ABORTED.

---

## v1.0 “Marketplace-Safe” Profile

### Always ON (Core)
- ORCH, CONFIG, GATE, TELEM
- INTAKE, CONTEXT, PLAN, EVAL, DELIVER (report-only)

### Opt-in (Pro / Add-on)
- MODIFY
- TEST
- RECOVERY advanced retries

---

## Change Log
- 1.0.0 (2026-01-08): Initial full interaction spec
