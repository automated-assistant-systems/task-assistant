Codex Intent Block Specification

Version: 1.1
Status: Authoritative
Applies to: Task Assistant / Codex execution engine

1. Purpose

This document defines the canonical Codex intent block format used by the Task Assistant Codex execution engine.

The intent block is the sole machine-readable contract by which Codex determines:

Whether an issue is executable

Which task to run

How to validate results

How to classify outcomes (SUCCESS / PARTIAL / BLOCKED / FAILED)

Any issue lacking a valid intent block must not be executed.

2. Intent Block Location & Format

Codex intent must be provided as a fenced Markdown code block using the language identifier codex.

Required format
```codex
{
  "version": "1.1",
  "task": "<task-id>",
  "instructions": [
    "<imperative instruction>",
    "<imperative instruction>"
  ],
  "constraints": [
    "<optional constraint>"
  ],
  "validation": {
    "commands": [
      "<optional validation command>"
    ],
    "notes": [
      "<optional human-readable note>"
    ]
  }
}


---

## 3. Parsing Rules

- Exactly **one** ` ```codex ` block is permitted per issue
- The block **must contain valid JSON**
- Markdown outside the block **must not alter intent**
- Inline YAML, free text, or partial JSON is **not allowed**

Failure to meet any rule results in **BLOCKED**.

---

## 4. Field Definitions

### 4.1 `version` (required)

**Type:** string  
**Allowed values:** `"1.1"`

Used to lock schema semantics and enable forward compatibility.

```json
"version": "1.1"


If missing or unsupported → BLOCKED

4.2 task (required)

Type: string
Purpose: Task dispatch selector

Must exactly match a registered Codex task ID.

"task": "repo-prepare"


Rules:

Case-sensitive

One task per issue

Unknown task → BLOCKED

4.3 instructions (required)

Type: array of strings
Purpose: Deterministic execution plan

Rules:

Must be a non-empty array

Each entry must be:

Imperative

Actionable

Independent

Good

"instructions": [
  "Validate task-assistant.yml against schema v1",
  "Emit all validation failures to the telemetry repo",
  "Do not write telemetry to the host repository"
]


Bad

"instructions": [
  "Fix things",
  "Improve telemetry"
]


Missing or invalid → BLOCKED

4.4 constraints (optional)

Type: array of strings
Purpose: Safety and scope boundaries

Used to explicitly restrict Codex behavior.

"constraints": [
  "Do not modify unrelated workflows",
  "No local telemetry writes",
  "Preserve backward compatibility"
]


Constraints are hard requirements, not suggestions.

4.5 validation (optional)

Defines how Codex determines SUCCESS vs PARTIAL.

4.5.1 validation.commands

Type: array of strings
Purpose: Post-execution validation

Each command is executed after changes are applied.

Rules:

Any command failure → PARTIAL

Absence of validation ≠ failure

"commands": [
  "node scripts/prepare-repo.js --dry-run"
]

4.5.2 validation.notes

Type: array of strings
Purpose: Human-readable context for validation

"notes": [
  "Dry-run must complete without warnings"
]


Notes do not affect execution status.

5. Outcome Classification (Normative)
Condition	Outcome	Label
Missing codex block	BLOCKED	BLOCKED
Invalid JSON	BLOCKED	BLOCKED
Unsupported version	BLOCKED	BLOCKED
Unknown task	BLOCKED	BLOCKED
Task execution error	FAILED	FAILED
PR opened, validation fails	PARTIAL	PARTIAL
PR opened, validation passes	SUCCESS	SUCCESS
No changes required	SUCCESS	SUCCESS
6. Execution Guarantees

When a valid intent block is present:

Codex must not guess

Codex must not infer intent

Codex must emit telemetry

Codex must apply exactly one terminal status label

Silent failure paths are forbidden.

7. Compatibility & Evolution

This specification is locked for Phase 3

Future changes require a version increment

Older versions may be rejected or handled via explicit compatibility layers

8. Reference Implementation

The authoritative implementation of this spec lives in:

scripts/codex/run.js


Any deviation between documentation and runtime behavior is considered a bug.

9. Summary

The Codex intent block is:

Deterministic

Auditable

Marketplace-safe

Human-authorable

Machine-verifiable

It is the single source of truth for Codex execution.
