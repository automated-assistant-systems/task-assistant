1️⃣ Bootstrap → Prepare-Repo Contract (Authoritative)

This contract is now locked for Phase 3 and Marketplace readiness.

Installation & Execution Order
Phase A — Organization Bootstrap (One-Time, Admin-Only)

Tool: scripts/bootstrap-codex-app-secrets.sh
Scope: GitHub Organization
Executed by: Org owner / admin

Responsibilities

Create organization variables

TELEMETRY_REPO

Create organization secrets

CODEX_APP_ID

CODEX_PRIVATE_KEY

Ensure Task Assistant / Codex GitHub App is installed

Grant required permissions:

Contents: read/write

Issues: read/write

Pull requests: read/write

Metadata: read

Outcome

Telemetry infrastructure exists

App authentication infrastructure exists

No repositories modified

⚠️ This step is mandatory before any repo-level automation runs.

Phase B — Repository Preparation (Per-Repo)

Tool: scripts/prepare-repo.js
Scope: Single repository
Executed by: Operator, CI, or Codex

Hard Prerequisites

TELEMETRY_REPO present in environment

.github/task-assistant.yml present in repo

Responsibilities

Validate full configuration schema

Validate semantic correctness (labels, tracks, milestones)

Create / update labels

Create milestones

Emit all telemetry to telemetry repo

Never write local telemetry

Failure Semantics

Condition	Outcome
Missing TELEMETRY_REPO	BLOCKED
Invalid config	BLOCKED
Runtime error	FAILED
Valid + changes applied	SUCCESS
Dry-run valid	SUCCESS

Guarantees

Host repo remains clean

Telemetry is deterministic

Behavior is explainable and auditable

Phase C — Codex Execution (Ongoing)

Tool: scripts/codex/run.js
Scope: Issues / PRs
Executed by: GitHub App

Responsibilities

Dispatch tasks

Apply changes via task engines

Validate results

Open PRs

Apply labels

Comment remediation hints

Observe (not emit) domain telemetry

Explicit Non-Responsibilities

❌ No local file writes

❌ No telemetry emission

❌ No infrastructure creation

Contract Summary (One-Line Rule)

prepare-repo consumes infrastructure created by bootstrap; it never creates or infers infrastructure.

This contract is now enforced by code and verified by Issue #32.
