# 📊 Phase 3.4 — Dashboard Refactor Specification
## Telemetry-Repo–Backed Dashboards (Marketplace-Ready)

**Status:** Authoritative  
**Phase:** 3.4 — Marketplace Readiness  
**Scope Type:** Read-path refactor only (no schema or enforcement changes)

---

## 0. Purpose

This document defines the **Phase 3.4 dashboard refactor**, aligning dashboards with the canonical telemetry repository while preserving all Phase 3.3 guarantees.

The refactor is required to:
- Eliminate all dashboard dependencies on host-repository telemetry directories
- Ensure Marketplace-safe, read-only dashboard behavior
- Clarify the separation between **raw telemetry emission** and **derived dashboard artifacts**

---

## 1. Non-Goals (Explicitly Out of Scope)

The following are **not** permitted in Phase 3.4:

- Telemetry schema changes
- Telemetry emission logic changes
- Enforcement logic changes
- Introduction of org-level or cross-repo dashboards
- User or role-based access control
- Writing derived artifacts back to the telemetry repository

---

## 2. Canonical Telemetry Repository Structure

### 2.1 Source of Truth

The telemetry repository is the **single source of truth** for all dashboards.

Dashboards **must not** read from:
- Host repositories
- `.task-assistant/telemetry`
- `.github/telemetry`
- Any legacy in-repo artifacts

---

### 2.2 Canonical Directory Layout (Phase 3.4)

telemetry/
└── v1/
└── repos/
└── owner_repo/
├── 2026-01-08.jsonl
├── 2026-01-09.jsonl
├── 2026-01-10.jsonl
└── 2026-01-11.jsonl

#### Notes
- `owner_repo` is the canonical identifier
- A separate `owner/` directory is intentionally **not used**
- Daily `.jsonl` files are **append-only raw telemetry**
- File contents may include mixed event types

---

## 3. Reserved / Future Directories

### 3.1 `events/` Directory

An `events/` subdirectory is **not currently implemented**.

If present in documentation or structure, it is:
- Reserved for potential future streaming/event-sharded telemetry
- Not required or referenced by dashboards in Phase 3.4
- Not promised as part of Marketplace functionality

Dashboards must not depend on this directory.

---

## 4. Telemetry Responsibilities (Critical Clarification)

### 4.1 Telemetry Emitters (Runtime)

The Task Assistant runtime is responsible for **writing raw facts only**.

**What emitters write**
- Daily `.jsonl` files
- Append-only telemetry records
- Evidence of actions, checks, and decisions

**What emitters do NOT write**
- Summaries
- Diagnostics
- Trend analyses
- Aggregations

---

### 4.2 Dashboard Builder (Derived Artifacts)

Dashboards are responsible for **deriving meaning** from raw telemetry at build time.

| Artifact | Written By | Persistence | Purpose |
|---|---|---|---|
| `summary.json` | Dashboard builder | Ephemeral | High-level repo state |
| `diagnostics.json` | Dashboard builder | Ephemeral | Warnings / blockers |
| `sweeps.json` | Dashboard builder | Optional | Trends over time |

> Derived artifacts must **not** be committed back to the telemetry repository in Phase 3.4.

---

## 5. Supported Dashboard Type (Phase 3.4)

### 5.1 Per-Repository Dashboard (Only)

| Property | Value |
|---|---|
| Scope | Single repository |
| Data source | `telemetry/v1/repos/{owner_repo}` |
| Access | Read-only |
| Aggregation | None |
| Marketplace promise | Yes |

Org-level or cross-repo dashboards are explicitly deferred.

---

## 6. Dashboard Data Access Contract

### 6.1 Input Contract

Dashboards may read:
- All `.jsonl` files under `repos/{owner_repo}/`

Dashboards must not:
- Infer missing data
- Create directories
- Modify telemetry files
- Read telemetry for other repositories

---

### 6.2 Missing or Partial Telemetry

| Condition | Required Behavior |
|---|---|
| No telemetry directory | Render “No telemetry available” |
| Missing days | Render partial data |
| Malformed JSONL | Render diagnostics warning |
| Permission denied | Fail safely, no retries |

---

## 7. Dashboard Build & Publish Flow

### 7.1 Build Trigger
- Triggered by telemetry merge or scheduled job
- Independent of host repository state

### 7.2 Build Steps
1. Resolve telemetry repository
2. Resolve `{owner_repo}` path
3. Read all available `.jsonl` files
4. Derive summary and diagnostics in memory
5. Generate static dashboard artifacts
6. Publish dashboard (read-only)

---

## 8. Output Guarantees

Dashboards must be:

- Static
- Deterministic
- Read-only
- Free of side effects
- Explicit about timestamp and data coverage

Each dashboard must display:
- Repository identity
- Telemetry version
- Last telemetry timestamp
- Diagnostics status
- Confirmation when no actions were taken

---

## 9. Security & Permissions Posture

### Required
- Read access to telemetry repository
- Write access only to dashboard publication target

### Prohibited
- Writing to telemetry repo
- Writing to host repos
- Cross-repo telemetry reads

---

## 10. Marketplace Reviewer Statement (Aligned)

> “Task Assistant publishes read-only diagnostics dashboards derived from raw telemetry stored in a dedicated telemetry repository. Dashboards do not modify monitored repositories and do not aggregate data across repositories by default.”

---

## 11. Phase 3.4 Compliance Checklist

- [ ] No host-repo telemetry reads
- [ ] Telemetry repo is sole data source
- [ ] Derived artifacts are ephemeral
- [ ] Per-repo dashboards only
- [ ] Read-only guarantees enforced
- [ ] Failure modes documented

---

## 12. Final Lock

This specification is **authoritative for Phase 3.4**.  
Any deviation requires Marketplace-blocking justification and explicit approval.


