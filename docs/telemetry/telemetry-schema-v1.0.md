Task Assistant — Telemetry Schema v1.0 (Authoritative)

Status: Locked
Applies To: All engines emitting telemetry
Effective Since: schema_version "1.0"
Phase: 3.5 Hardening

1. Purpose

This document defines the canonical telemetry contract for Task Assistant.

Telemetry events:

Are written as JSON objects (one per line) to JSONL files

Are deterministic

Are append-only

Must conform to this schema

Must not drift without version change

Telemetry is the system’s durable audit log and governance backbone.

2. File Format

Encoding: UTF-8

Format: JSON Lines (JSONL)

One event per line

No trailing commas

No comments

Each record must conform to the envelope defined below.

3. Required Top-Level Envelope

Every telemetry record MUST contain:

{
  "schema_version": "1.0",
  "generated_at": "2026-02-05T01:16:34Z",
  "correlation_id": "21694922610-1",
  "source": { ... },
  "entity": { ... },
  "event": { ... },
  "details": { ... }
}


All fields are required unless otherwise specified.

4. Field Definitions
4.1 schema_version

Type: string
Required: Yes
Value: "1.0"

Indicates the telemetry schema version.
Any structural change requires version bump.

4.2 generated_at

Type: string
Format: ISO-8601 UTC timestamp
Example:

2026-02-05T01:16:34Z


Must always be UTC and include Z.

4.3 correlation_id

Type: string
Required: Yes

Used to group all engine emits belonging to a single dispatcher execution.

Rules:

All engine events triggered by one dispatch MUST share the same correlation_id.

correlation_id MUST be non-null.

correlation_id MUST be deterministic within a dispatch.

Format is implementation-defined but must be string.

4.4 source

Describes where the event originated.

"source": {
  "workflow": "engine-preflight",
  "job": "preflight"
}

Required Fields:
Field	Type	Description
workflow	string	GitHub workflow name
job	string	GitHub job name

4.5 entity

Describes the primary subject of the event.

"entity": {
  "type": "repository",
  "owner": "garybayes",
  "repo": "ta-sandbox"
}

Required Fields:
Field	Type	Description
type	string	Currently "repository"
owner	string	Repository owner
repo	string	Repository name
Governance Rule

entity.owner + entity.repo is canonical repository identity.
Other repo references in details must not contradict this.

4.6 event

Describes the high-level outcome.

"event": {
  "category": "preflight",
  "action": "success",
  "reason": null
}

Required Fields:
Field	Type	Description
category	string	Engine category
action	string	High-level result
reason	string or null	Explanation for failure

5. Allowed Event Categories

The following categories are allowed in v1.0:

preflight

self-test

materialize

validate

enforce

dashboard

release

Adding a new category does NOT require version bump.
Removing or renaming a category does.

6. Allowed Event Actions

event.action MUST be one of:

success

failure

If action = "failure":

reason MUST be non-null

details.ok SHOULD be false (if applicable)

7. details Object

The details object contains engine-specific payload data.

Structure varies by engine but MUST:

Be a JSON object

Never overwrite top-level keys

Avoid naming collisions with top-level keys

8. Common details Fields

The following fields are standardized where applicable:

Field	Type	Description
ok	boolean	Engine result indicator
summary	string	Human-readable summary
tool	string	Underlying tool name
tool_version	string	Tool semantic version
mode	string	e.g. apply, dry-run
checks	array	Validation checks
actions	array	Actions performed

9. Validation Checks Structure

When present:

"checks": [
  {
    "id": "config.load",
    "outcome": "PASS",
    "details": null
  }
]

Allowed outcome values:

PASS

WARN

FAIL

Checks represent diagnostic granularity.
They do NOT override top-level event.action.

10. Nested Event Naming Rule

To prevent ambiguity:

Top-level key:

event


MUST NOT be reused inside details.

For example, enforce engine must use:

"issue_event": {
  "type": "labeled"
}


NOT:

"event": { ... }


This prevents flattening collisions and dashboard ambiguity.

11. Repository Identity Duplication Rule

entity.owner + entity.repo is canonical.

If details.repo or details.target_repo is included:

It must match canonical identity unless explicitly operating on a different repository.

Drift is considered a schema violation.

12. Dashboard Engine Subtypes

Dashboard events may represent different operational modes.

When applicable:

"details": {
  "kind": "self-test" | "health",
  ...
}


If omitted, behavior is inferred but discouraged in future revisions.

13. Failure Semantics

If event.action = "failure":

reason must describe cause

details.ok should be false

checks may contain FAIL

Failure must never be represented solely by check outcome.

14. Append-Only Guarantee

Telemetry files:

Must never be rewritten

Must never mutate prior records

Must never reorder records

Must never delete records (except via explicit prune mechanics)

Prune operations must be auditable.

15. Backwards Compatibility Policy

Minor additions allowed without version bump:

New optional fields in details

New event categories

New check IDs

Breaking changes require:

schema_version increment

New authoritative schema document

16. Versioning Rules

schema_version changes required for:

Removing a top-level field

Renaming a top-level field

Changing allowed enum values

Changing structural shape

17. Example Minimal Event
{
  "schema_version": "1.0",
  "generated_at": "2026-02-05T01:16:34Z",
  "correlation_id": "21694922610-1",
  "source": {
    "workflow": "engine-preflight",
    "job": "preflight"
  },
  "entity": {
    "type": "repository",
    "owner": "garybayes",
    "repo": "ta-sandbox"
  },
  "event": {
    "category": "preflight",
    "action": "success",
    "reason": null
  },
  "details": {
    "ok": true,
    "summary": "Preflight checks passed"
  }
}

18. Governance Declaration

Telemetry Schema v1.0 is considered:

Stable

Production-ready

Dashboard-safe

Marketplace-safe

SaaS-ready

Changes must be deliberate and versioned.

19. Telemetry Repository Storage Layout (Authoritative)

Telemetry MUST be written to a dedicated telemetry repository.

Host repositories MUST NOT store telemetry.

The telemetry repository owner/org is the namespace. Therefore, telemetry storage paths MUST NOT repeat <owner>.

19.1 Root Path

All telemetry data MUST reside under:

telemetry/v1/

v1 corresponds to telemetry schema major version.

Incompatible changes require a new root, e.g. telemetry/v2/.All telemetry events MUST be written to a dedicated telemetry repository.

Host repositories MUST NOT store telemetry.

19.2 Repository Partitioning

Telemetry MUST be partitioned by the host repository name:

telemetry/v1/repos/<repo>/

Example:

telemetry/v1/repos/ta-sandbox/

Rules:

<repo> MUST equal entity.repo

<repo> MUST NOT include owner/org (no owner/repo)

The telemetry repo owner/org provides the namespace

19.3 Date Partitioning

Within each repo directory:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/


Example:

telemetry/v1/repos/ta-sandbox/2026-02-05/


Rules:

Date derived from generated_at (UTC)

Format: YYYY-MM-DD

19.4 Correlation Partitioning

Within each date directory:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/


Example:

telemetry/v1/repos/ta-sandbox/2026-02-05/21694922610-1/


Rules:

Directory name MUST equal correlation_id

All events sharing that correlation_id MUST live in the same directory

19.5 Engine File Separation

Each engine MUST write to a separate JSON file inside the correlation directory:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/<category>.json


Examples:

telemetry/v1/repos/ta-sandbox/2026-02-05/21694922610-1/preflight.json
telemetry/v1/repos/ta-sandbox/2026-02-05/21694922610-1/self-test.json
telemetry/v1/repos/ta-sandbox/2026-02-05/21694922610-1/dashboard.json
telemetry/v1/repos/ta-sandbox/2026-02-05/21694922610-1/validate.json
telemetry/v1/repos/ta-sandbox/2026-02-05/21694922610-1/enforce.json


Rules:

Filename SHOULD match event.category

One engine execution MUST produce exactly one file

Files MUST contain exactly one telemetry record (one JSON object)

Engines MUST NOT write to the same file

19.6 Storage Guarantees

Telemetry storage MUST ensure:

No host repo contamination

No writes outside telemetry/v1/

No cross-correlation mixing

No cross-date mixing

No cross-engine overwrites

Repository Name Collision Policy (Cross-Org)

Because owner/org is not encoded in the path:

If you support multiple owners/orgs writing into the same telemetry repo in the future, you MUST introduce a collision-safe partitioning scheme (requires a version bump or v1 extension rule).

For v1.0, the telemetry repo is assumed to correspond to a single owner/org namespace.

19.7 Dashboard Contract

Dashboard builds MUST read exclusively from the telemetry repository and MUST traverse:

telemetry/v1/repos/*/*/*/*.json

Dashboard MUST NOT read host repositories.

19.8 Prune & Sweep Rules

Prune operations MAY delete:

Entire <yyyy-mm-dd>/ directories

Entire <correlation_id>/ directories

Prune operations MUST NOT:

Rewrite event contents

Modify individual JSON files

Prune must be auditable.

Telemetry MUST be partitioned by target repository:

telemetry/v1/repos/<repo>/


Example:

telemetry/v1/repos/ta-sandbox/

