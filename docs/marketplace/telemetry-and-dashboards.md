# Telemetry & Dashboards

Task Assistant emits telemetry for auditability and operator visibility.

Telemetry and dashboards are strictly separated from enforcement behavior.

---

## Telemetry Storage

Telemetry is written to a dedicated, operator-owned repository.

Data types:

### Raw Telemetry
Path:
telemetry/v1/repos/<owner_repo>/*.jsonl

Properties:
- Append-only
- Immutable
- Never rewritten or corrected
- Canonical source of truth

---

## Dashboard Generation

Dashboards are derived artifacts generated from raw telemetry.

Path:
telemetry/v1/dashboards/<owner_repo>/dashboard.json

Properties:
- Fully regenerable
- Deterministic
- Overwrite allowed
- No effect on enforcement behavior

---

## Dashboard Workflow

- Runs as a scheduled GitHub Actions workflow
- Authenticates using a GitHub App installation token
- Reads raw telemetry
- Writes derived dashboards back to the telemetry repository only

---

## Update Cadence

- Scheduled: Hourly
- Manual: On-demand
- Consistency model: Eventually consistent (≤ 1 hour)

---

## Safety Guarantees

- No telemetry is written to monitored repositories
- No dashboards are written to monitored repositories
- No observability component affects enforcement
