# Task Assistant GitHub App — Architecture (Authoritative)

Status: Canonical  
Phase: 3.5 — Runtime Hardening Complete  
Scope: GitHub App identity, dispatcher runtime, engine orchestration  

---

## 1. Purpose & Scope

Task Assistant is a GitHub-native automation platform distributed via the GitHub Marketplace.

Install Task Assistant →  
Repository is governed by deterministic, version-pinned engines →  
Immutable telemetry is written to a dedicated telemetry repository →  
Dashboards and governance artifacts are derived from that telemetry.

The GitHub App is the installation and identity mechanism.
The dispatcher + engines perform all automation logic.

---

## 2. High-Level Architecture

### 2.1 Core Runtime Components

**GitHub App (Identity Layer)**  
- Installed via Marketplace  
- Provides authentication and installation context  
- Verifies webhooks  
- Creates installation-scoped tokens  
- Dispatches events into runtime  

**Dispatcher (Orchestration Layer)**  
Dispatcher is a workflow in the monitored repository (Marketplace runtime surface), invoked by events / workflow_dispatch.
- Interprets GitHub events  
- Generates correlation_id  
- Selects engine_ref  
- Invokes preflight  
- Sequences engines  
- Halts on validation failure  
- Implemented as a workflow in the monitored repository, which calls version-pinned engines via workflow_call

**Preflight (Mandatory Validation Stage)**  
- Validates repository eligibility  
- Resolves telemetry repository  
- Confirms authentication scope  
- Emits preflight telemetry  
- Prevents mutation before validation  

**Engines (Execution Units)**  
Stateless, deterministic units that:
- Operate under engine_ref  
- Receive target_repo, telemetry_repo, correlation_id  
- Perform classification, validation, enforcement, dashboard builds  
- Emit exactly one telemetry record via emit-engine  

**emit-engine (Telemetry Authority)**  
- Generates canonical telemetry envelope  
- Includes engine_ref and ok  
- Writes immutable record to telemetry repository  
- Enforces single-record-per-engine guarantee  

**Dedicated Telemetry Repository**  
Stores telemetry under:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/<category>.json

Host repositories never store telemetry.

---

## 3. Execution Flow

Runtime model:

Dispatcher → Preflight → Engine(s) → emit-engine → Telemetry Repository

### 3.1 Issue Event Flow

Trigger:
Issue opened / edited / labeled.

Flow:

1. GitHub sends webhook to App.
2. App verifies signature.
3. Dispatcher:
   - Normalizes correlation_id.
   - Selects engine_ref (tag/SHA).
4. Preflight executes:
   - Validates repository + telemetry repo.
   - Emits preflight.json.
5. Engine(s) execute:
   - validate
   - enforce (if applicable)
   - self-test (if triggered)
6. Each engine emits exactly one telemetry file.
7. Execution ends.

No telemetry is written to the host repository.

---

### 3.2 Self-Test Flow

Trigger:
Manual dispatcher invocation.

Flow:

- Preflight executes.
- self-test engine runs.
- dashboard engine may run under same correlation_id.
- Telemetry written to telemetry repo.
- No host repo mutation required.

---

### 3.3 Dashboard Flow

Dashboard engine:

- Reads telemetry repository only.
- Aggregates correlation-partitioned telemetry.
- Emits dashboard.json to telemetry repository.
- Does not read host repository for historical state.

---

## 4. Version Pinning Model

All runtime execution is version-pinned via engine_ref.

Rules:

- Selected by dispatcher.
- Must be tag or SHA in Marketplace mode.
- Identical across all engines in a dispatcher run.
- Recorded in every telemetry record.

Host repositories do not select engine versions.

This guarantees reproducibility and auditability.

---

## 5. Authentication Model

All operations use:

- GitHub App installation tokens
- Installation-scoped permissions
- No PATs
- No user tokens

Authentication validated during preflight.

Engines do not manage authentication directly.

---

## 6. Permission Model (Minimum Required)

Repository permissions:

- Issues: Read & Write
- Contents: Read (Write only if enforcement requires it)
- Metadata: Read
- Pull Requests: Read (future expansion)

Telemetry repository:

- Write access required
- No access outside namespace

Engines do not escalate permissions.

---

## 7. Storage Model

Telemetry repository layout:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/<category>.json

Partitioned by:

- Repository
- Date (UTC)
- Correlation
- Engine category

One file per engine per correlation.

Immutable once written.

---

## 8. Determinism Guarantees

Task Assistant guarantees:

- One dispatcher run → one correlation_id
- One engine invocation → one telemetry file
- Preflight executes first
- No mutation before validation
- No dynamic code loading from monitored repository
- No direct engine telemetry writes
- Version-pinned execution

This model is Marketplace-safe and audit-friendly.

---

## 9. Development vs Production

Local development is an implementation detail.

The architecture is defined by:

- Dispatcher
- Preflight
- Engines
- emit-engine
- Telemetry repository

Server framework choice does not alter runtime invariants.

---

## 10. Future Expansion

Future SaaS capabilities may:

- Consume telemetry repository
- Subscribe to App webhooks
- Provide cross-repo dashboards
- Offer org-level analytics

These extend the architecture without altering runtime guarantees.

---

## 11. Architecture Summary (Single Paragraph)

Task Assistant is a dispatcher-controlled GitHub App that executes version-pinned engines under a mandatory preflight validation stage. Engines are stateless and deterministic, emitting exactly one immutable telemetry record per invocation via emit-engine. Telemetry is written exclusively to a dedicated repository partitioned by repository, date, and correlation. The runtime model guarantees reproducibility, auditability, and strict separation between orchestration, execution, and observability.

---

## 12. Canonical Declaration

This document supersedes all prior architecture descriptions referencing repo-local telemetry, core-as-action patterns, or non-version-pinned execution. Task Assistant operates under a preflight-gated, engine_ref–pinned, single-writer telemetry model enforced by dispatcher authority.
