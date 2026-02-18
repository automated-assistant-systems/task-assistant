# Telemetry & Dashboards (Authoritative)

Task Assistant emits immutable telemetry to provide auditability, reproducibility, and operator visibility.

Telemetry and dashboards are strictly separated from enforcement behavior.

---

## 1. Telemetry Storage

Telemetry is written exclusively to a dedicated telemetry repository.

Monitored repositories never store telemetry.

### Storage Layout

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/<category>.json


Properties:

- One file per engine invocation
- Exactly one JSON object per file
- Immutable once written
- Partitioned by repository, date, and correlation
- Written only via emit-engine

Each record includes:

- engine_name
- engine_ref
- correlation_id
- ok
- Canonical envelope structure

Raw telemetry is the canonical source of truth.

---

## 2. Raw Telemetry Properties

Raw telemetry is:

- Deterministic
- Version-pinned
- Immutable
- Audit-grade
- Fully attributable to engine_ref

---

## 3. Dashboard Generation

Dashboards are derived artifacts generated from raw telemetry.

The Dashboard Engine:

- Reads telemetry repository only
- Emits exactly one dashboard telemetry record
- Produces a deterministic JSON projection
- Does not modify raw telemetry
- Does not modify monitored repositories

---

## 4. Dashboard Storage (Derived Only)

The dashboard reducer emits JSON to stdout.

A wrapper workflow MAY persist the artifact to:

telemetry/v1/repos/<repo>/dashboard/dashboard.json


Properties:

- Fully regenerable
- Deterministic
- Overwrite allowed
- Not correlation-scoped
- No mutation of raw telemetry files

Dashboard artifacts must never be written inside correlation directories.

---

## 5. Update Cadence

Dashboard execution is externally scheduled via dispatcher.

Consistency model:

- Eventually consistent
- Deterministic per telemetry state
- No background mutation loops

---

## 6. Safety Guarantees

- No telemetry written to monitored repositories
- No dashboards written to monitored repositories
- No observability component affects enforcement
- All telemetry includes engine_ref for traceability

---

## 7. Audit Guarantees

Every engine invocation produces:

- One immutable telemetry file
- With version attribution
- With success indicator
- Under a correlation-scoped directory

This enables full forensic reconstruction of any run.

Dashboards are projections and do not alter audit history.

