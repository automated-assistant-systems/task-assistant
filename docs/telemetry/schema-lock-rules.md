# Task Assistant — Telemetry Schema Lock Rules

Status: Canonical  
Applies To: telemetry-schema-v1.0.md  
Phase: 3.5 Hardening  

---

## 1. Lock Declaration

Telemetry Schema v1.0 is considered locked.

The following fields are mandatory and may not be removed or renamed without a major version bump:

- schema_version
- generated_at
- correlation_id
- engine_name
- engine_ref
- source
- entity
- event
- ok
- details

Removing, renaming, or structurally altering any of the above requires:

- schema_version increment (e.g., "2.0")
- Migration notes
- Updated authoritative schema document
- Update to emit-engine specification

---

## 2. Breaking Change Definition

A breaking change includes:

- Removing a required field
- Renaming a required field
- Changing required field type
- Changing allowed enum values
- Changing envelope structure
- Altering storage layout rules
- Removing ok field
- Removing engine_ref field
- Allowing multiple records per engine file
- Allowing direct engine telemetry writes

Breaking changes require a new major schema version.

---

## 3. Allowed Non-Breaking Changes

The following may be introduced without version bump:

- New optional fields inside details
- New event categories
- New validation check IDs
- Additional optional top-level fields (if backward-compatible)

Consumers MUST ignore unknown fields.

---

## 4. Emission Authority Lock

Telemetry MUST be emitted exclusively via emit-engine.

Engines MUST NOT:

- Construct telemetry envelopes manually
- Write telemetry directly to GitHub
- Emit multiple telemetry records per invocation
- Modify previously written telemetry files

Changing emission authority requires:

- Major version bump
- Update to architecture/emit-engine.md
- Update to runtime-model.md

---

## 5. Single-Record Enforcement Lock

Each engine invocation MUST produce:

- Exactly one telemetry file
- Containing exactly one JSON object
- With filename matching event.category

Allowing multiple records per file or JSON streaming requires version bump.

---

## 6. Version Pinning Lock

The following are permanently required in v1.0:

- engine_ref must be present
- engine_ref must be identical across engines in a dispatcher run
- ok must be present and boolean
- correlation_id must group all engine records per dispatch

Removing engine_ref or ok requires major version bump.

---

## 7. Storage Layout Lock

The following storage rules are locked for v1.0:

Root:

telemetry/v1/

Partitioning:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/<category>.json

Changing:

- Root directory
- Partition hierarchy
- Owner encoding rules
- File naming conventions

requires major version bump.

---

## 8. Determinism Lock

Telemetry must remain:

- Deterministic under identical inputs and engine_ref
- Immutable once written
- Append-only at file level
- Correlation-isolated
- Engine-isolated

Relaxing determinism guarantees requires version bump.

---

## 9. Governance Rule

If any architectural document (runtime-model, engine-interface, emit-engine) is updated in a way that affects:

- Envelope structure
- Required fields
- Emission semantics
- Version pinning
- Storage layout

Then telemetry-schema-v1.0 MUST be reviewed and updated accordingly.

Schema drift is not permitted.

---

## Canonical Statement

Telemetry Schema v1.0 is a version-pinned, single-writer, deterministic contract enforced by emit-engine. It guarantees one immutable record per engine invocation, includes engine_ref for reproducibility, and partitions data by repository, date, and correlation. Structural drift requires a deliberate major version change.
