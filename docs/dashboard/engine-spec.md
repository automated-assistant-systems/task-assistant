Task Assistant — Dashboard Engine (v1)
Purpose

Generate per-repository dashboards for a single organization, based solely on that organization’s telemetry data.

Code Location
automated-assistant-systems/task-assistant

Execution Scope (Hard Boundary)
Dimension	Rule
Org scope	Exactly one org per run
Telemetry source	<owner>/task-assistant-telemetry
Dashboard output	Same telemetry repo
Cross-org access	Forbidden
Inputs (Environment / Workflow Inputs)
Name	Description
OWNER	GitHub org/user
TELEMETRY_REPO	<owner>/task-assistant-telemetry
CORRELATION_ID	Trace identifier
Filesystem Contract (Immutable)

Reads only:

telemetry/v1/repos/<repo-name>/*.jsonl


Writes only:

telemetry/v1/dashboards/<repo-name>/dashboard.json

Registry Interaction

Registry is read by scheduler, not engine

Engine does not discover orgs

Engine assumes inputs are valid

Scheduling Model

Daily schedule triggers fan-out

One job per org

Jobs may run in parallel

Failure in one org does not affect others

Failure Isolation

Per-repo dashboard failures are isolated

Per-org failures do not block other orgs

Engine must be idempotent

Telemetry

Engine emits:

dashboard.start

dashboard.success

dashboard.failure

Telemetry written to same org telemetry repo

Explicit Non-Responsibilities

The dashboard engine must not:

Aggregate dashboards across orgs

Write to infra repo

Read another org’s telemetry

Modify registry

Assume global state

Why This Model Is Correct (Engineering Rationale)

Marketplace-safe permissions

Tenant isolation by construction

Linear scalability with org count

Future-proof for Core orchestration

Auditable and deterministic

