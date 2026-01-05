Contract (v1.0)

Record identity

Each emitted telemetry record is one JSON document.

It MUST include a globally unique correlation_id.

Required fields

{
  "schema_version": "1.0",
  "generated_at": "ISO-8601 UTC timestamp",
  "correlation_id": "uuid",
  "actor": "string",
  "action": "string",
  "entity": {
    "type": "repository|issue|pull_request|workflow_run|job",
    "repo": "owner/name",
    "number": 123
  },
  "outcome": "success|partial|blocked|failed",
  "reason": "string|null",
  "execution": {
    "started_at": "ISO-8601 UTC timestamp|null",
    "finished_at": "ISO-8601 UTC timestamp|null",
    "runner": "string|null"
  }
}


Field semantics

schema_version: must be "1.0" for v1 records.

generated_at: when the record was emitted.

correlation_id: ties together all records for a single logical execution path.

actor: prepare-repo | codex | workflow:<name> | task-assistant

action: namespaced verb, e.g. config.validate, repo.prepare.labels.reconcile, codex.execute, telemetry.write

entity: the object affected

repo is always required

number required for issue / pull_request

outcome: canonical status set

success = completed as intended

partial = completed but remediation required

blocked = no-op because inputs invalid/ambiguous

failed = execution error

reason: required when outcome != success (may be null when success)

execution: timing + runner reference (may be null for very small events)

Optional fields (allowed extensions)
These MAY be present, and consumers MUST ignore unknown optional keys:

decisions: array of decision records (see below)

artifacts: array of artifact pointers

inputs: sanitized key/value inputs

metrics: numeric metrics (counts, durations)

links: URLs (issue, PR, run, docs)

This is the “explainability atom” — can be embedded in decisions[].
{
  "id": "string",
  "kind": "validation|enforcement|mutation|routing",
  "rule": "string",
  "subject": "string",
  "decision": "allow|deny|create|update|skip|route",
  "outcome": "success|partial|blocked|failed",
  "reason": "string|null",
  "evidence": [
    { "key": "string", "value": "string" }
  ]
}

Rules:

decisions[].id must be unique within the telemetry record.

evidence must not contain secrets.

If any decision is deny with blocked, the parent record outcome should be blocked unless overridden explicitly.

