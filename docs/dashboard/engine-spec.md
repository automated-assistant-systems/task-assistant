# Task Assistant — Dashboard Engine (Authoritative)

Status: Canonical  
Phase: 3.5 Runtime Model  

---

## 1. Purpose

The Dashboard Engine generates a deterministic, read-only projection of telemetry for a single repository.

It:

- Reads immutable telemetry
- Emits exactly one telemetry record (category: "dashboard")
- Produces a derived dashboard JSON document
- Does not mutate monitored repositories
- Does not modify raw telemetry files

The dashboard is a projection layer, not a source of truth.

---

## 2. Execution Scope (Hard Boundary)

| Dimension        | Rule |
|------------------|------|
| Repository scope | Exactly one repository per invocation |
| Telemetry source | Dedicated telemetry repository only |
| Cross-org access | Forbidden |
| Cross-repo access| Forbidden |
| Mutation ability | None (read-only aggregation) |

The engine operates only on telemetry belonging to the provided `target_repo`.

---

## 3. Inputs

Provided by dispatcher:

- `target_repo`
- `telemetry_repo`
- `correlation_id`
- `engine_ref`

The engine must not discover repositories.

---

## 4. Telemetry Read Contract

Reads exclusively:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/*.json


Rules:

- Exactly one JSON object per file
- No JSONL streaming
- No mutation of source files
- Must validate schema_version = "1.0"

---

## 5. Dashboard Output

The dashboard reducer:

- Emits exactly one JSON object to stdout
- Must conform to `dashboard-output-contract-v1.md`
- Must not write files directly

A wrapper workflow MAY persist the reducer output to:

telemetry/v1/repos/<repo>/dashboard/dashboard.json


Derived artifacts:

- Are fully regenerable
- May be overwritten
- Must never modify raw telemetry

Dashboard artifacts must not be stored inside correlation directories.

---

## 6. Telemetry Emission

The Dashboard Engine emits exactly one telemetry record via emit-engine:

- `event.category = "dashboard"`
- `ok = true | false`
- `engine_ref` included

The engine must not emit multiple telemetry records.

---

## 7. Determinism Guarantee

Given identical telemetry input and identical `engine_ref`, output must be identical (except generated_at).

The Dashboard Engine is read-only, deterministic, and auditable.

