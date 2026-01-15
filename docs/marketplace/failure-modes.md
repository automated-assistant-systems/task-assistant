# Failure Modes & Safety Behavior

Task Assistant is designed to fail safely.

---

## Missing Configuration

- Enforcement does not run
- Validation errors are surfaced
- No repository mutations occur

---

## Empty Telemetry

- Dashboard generation exits cleanly
- No artifacts are fabricated
- No errors propagate to monitored repositories

---

## Malformed Telemetry

- Raw telemetry remains untouched
- A per-repository dashboard is generated with status "error"
- Diagnostics are recorded in the dashboard artifact

---

## Workflow Failures

- Visible only via GitHub Actions logs
- No user-facing notifications
- No enforcement behavior is altered

---

## Crash Containment

- Failures are isolated per repository
- No cascading side effects
- Deterministic retry behavior
