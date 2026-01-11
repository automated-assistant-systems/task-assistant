# Operator Constraints — Task Assistant

**Status:** Canonical

This document defines *hard constraints and operational guardrails* for anyone operating, scripting, or extending the Task Assistant system.

These constraints are not preferences.
They exist to prevent repeat failures, non-determinism, and environment-specific breakage.

If a change conflicts with this document, the change is wrong.

---

## 1. Purpose

The purpose of this document is to:

* Encode known operational gotchas
* Prevent repeated tooling mistakes
* Ensure long-term script portability
* Preserve Phase 3.1–3.3 guarantees
* Standardize assumptions across operators and environments

This document applies to:

* Shell scripts
* Certification harnesses
* GitHub Actions workflows
* GH CLI automation
* Local operator execution

---

## 2. GitHub CLI Constraints (Critical)

### 2.1 Unsupported Flags

The following usage is **forbidden**:

```bash
gh issue create --json ...
```

Reason:

* `gh issue create` does **not** support `--json` in many stable CLI versions
* This causes hard failures in local and CI environments

### 2.2 Approved Patterns

Use indirect inspection instead:

```bash
gh issue create ...
gh issue list --repo <repo> --limit 1 --json number -q '.[0].number'
```

Supported `--json` commands:

* `gh issue list`
* `gh issue view`
* `gh run list`
* `gh run view`

Mutating commands must **not** assume JSON output support.

---

## 3. Workflow Trigger Constraints

### 3.1 Event-Driven Workflows

The following workflows **must never** be triggered via `workflow_dispatch`:

* `task-assistant-issue-events.yml`

Reason:

* These workflows are bound to real GitHub domain events
* Dispatching them breaks production semantics

### 3.2 Correct Triggering Model

| Workflow      | Allowed Trigger                           |
| ------------- | ----------------------------------------- |
| issue-events  | Issue creation / label / milestone events |
| self-test     | `workflow_dispatch`                       |
| nightly-sweep | `workflow_dispatch`                       |

Certification scripts must simulate **real domain activity**, not fake dispatches.

---

## 4. Bash Scripting Rules

### 4.1 Shell Compatibility

All scripts must be compatible with:

* `bash` on Ubuntu GitHub runners
* Standard POSIX tooling

### 4.2 Forbidden Constructs

Do **not** use:

* Bash associative arrays
* Implicit control flow via `set -e` alone
* Unbalanced `if / for / case` blocks
* Reliance on shell parsing of human-readable CLI output

### 4.3 Required Practices

* Always guard mutations:

```bash
if git diff --quiet; then
  echo "Mutation failed"
  exit 1
fi
```

* Register `trap` handlers **before** risky operations
* Explicitly handle failure paths

---

## 5. Tooling Dependency Rules

### 5.1 External Tools

Certification and validation scripts must **not** depend on:

* `yq`
* non-core GNU utilities
* version-specific features

Allowed by default:

* `sed`
* `awk`
* `grep`
* `printf`
* `cat`

If a non-core tool is required, it must be:

* explicitly installed
* explicitly version-pinned
* justified in documentation

---

## 6. Configuration Validation Semantics

### 6.1 Hard Failures

The following conditions **must fail**:

* Missing required config sections
* Malformed YAML
* Unknown top-level keys
* Structural ambiguity

These failures apply to:

* self-test
* nightly-sweep
* issue-events

### 6.2 Soft Failures (Warnings)

The following conditions **must warn but continue**:

* `config.enforcement` schema errors
* Non-critical enforcement configuration issues

Behavior:

| Workflow      | Outcome     |
| ------------- | ----------- |
| self-test     | PASS + WARN |
| nightly-sweep | PASS + WARN |
| issue-events  | FAIL        |

This distinction is intentional and must not be blurred.

---

## 7. Certification Script Requirements

Phase-level certification scripts must:

* Hard-reset the sandbox at the start
* Run one failure mode per test case
* Encode expected outcomes explicitly
* Never rely on shared state between cases
* Restore or isolate state deterministically

Scripts that do not meet these requirements are not certification-grade.

---

## 8. Change Control

Any change that:

* violates this document
* weakens constraints
* introduces implicit behavior

**must be rejected or escalated**.

This document is authoritative until superseded by a newer version.

---

## 9. Operator Reminder

If you find yourself saying:

> “This should probably work”

Stop.

Task Assistant is designed to be:

* deterministic
* inspectable
* certifiable
* boring in the best possible way

Operators should never guess.
