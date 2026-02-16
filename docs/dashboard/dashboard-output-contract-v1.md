📊 Task Assistant — Dashboard Output Contract v1.0

Status: Locked
Applies To: All dashboard reducers (build-dashboards.js)
Effective Since: Phase 3.5
Contract Version: 1.0

1️⃣ Purpose

The Dashboard Output Contract defines the canonical JSON structure emitted by the Dashboard Reducer.

It guarantees:

Deterministic structure

Stable field naming

Consumer safety

No schema drift without version bump

Compatibility with future UI and SaaS layers

The dashboard reducer MUST emit exactly one JSON document to stdout.

2️⃣ Output Format

Encoding: UTF-8

Format: Single JSON object

No logs to stdout

No multiple JSON objects

No trailing commas

The reducer MUST exit with:

0 on successful execution (even if no telemetry)

>0 on structural failure

3️⃣ Required Top-Level Envelope

Every dashboard output MUST contain:

{
  "dashboard_version": "1.0",
  "repo": "string",
  "generated_at": "ISO-8601 UTC timestamp",
  "status": "healthy|no-telemetry|invalid-telemetry",
  "summary": "string",
  "metrics": { ... },
  "coverage": { ... }
}


All fields are required unless otherwise specified.

4️⃣ Field Definitions
4.1 dashboard_version

Type: string
Required: Yes
Value: "1.0"

Any structural change requires a version bump.

4.2 repo

Type: string
Required: Yes

Must equal the <repo> partition in:

telemetry/v1/repos/<repo>/


Must NOT include owner/org.

4.3 generated_at

Type: string
Format: ISO-8601 UTC
Example:

2026-02-16T01:03:42Z


Represents reducer execution time.

4.4 status

Type: enum
Required: Yes

Allowed values:

Value	Meaning
healthy	Telemetry valid and dashboard built
no-telemetry	Repo has no telemetry
invalid-telemetry	Telemetry validation failed

Dashboard MUST NOT silently succeed if telemetry validation fails.

4.5 summary

Type: string
Required: Yes

Human-readable status description.

Examples:

"Dashboard rebuilt"

"No telemetry present"

"Telemetry validation failed"

5️⃣ metrics Object

Represents quantitative data.

"metrics": {
  "total_runs": 12,
  "total_events": 48,
  "engines_seen": ["preflight", "validate", "enforce"]
}

Required Fields
Field	Type	Description
total_runs	integer	Number of correlation_id directories
total_events	integer	Total engine JSON files found
engines_seen	array<string>	Unique event.category values

Rules:

total_runs >= 0

total_events >= 0

engines_seen sorted alphabetically

No duplicates allowed

6️⃣ coverage Object

Represents temporal coverage.

"coverage": {
  "first_day": "2026-02-10",
  "last_day": "2026-02-16",
  "days_present": 7
}

Required Fields
Field	Type	Description
first_day	string	null
last_day	string	null
days_present	integer	Number of date directories

Rules:

If no telemetry:

first_day = null

last_day = null

days_present = 0

7️⃣ Structural Rules

The reducer MUST:

Only read from TELEMETRY_ROOT

Only traverse:

telemetry/v1/repos/<repo>/<YYYY-MM-DD>/<correlation_id>/*.json


The reducer MUST NOT:

Modify files

Write files

Perform git operations

Depend on branch state

Infer owner/org from path

Read other repos

8️⃣ Determinism Requirements

Given identical telemetry input, reducer output MUST be identical except for:

generated_at

Order guarantees:

engines_seen sorted

Days sorted ascending

Runs counted deterministically

9️⃣ Error Semantics

If telemetry validation fails:

{
  "dashboard_version": "1.0",
  "repo": "ta-sandbox",
  "generated_at": "...",
  "status": "invalid-telemetry",
  "summary": "Telemetry validation failed",
  "metrics": {
    "total_runs": 0,
    "total_events": 0,
    "engines_seen": []
  },
  "coverage": {
    "first_day": null,
    "last_day": null,
    "days_present": 0
  }
}


The reducer MUST NOT partially build dashboards from invalid telemetry.

🔟 Backwards Compatibility Policy

Minor additions allowed without version bump:

New optional metrics fields

New coverage fields

New status values (non-breaking)

Breaking changes require:

dashboard_version increment

New authoritative contract document

11️⃣ Example — Healthy Output
{
  "dashboard_version": "1.0",
  "repo": "ta-sandbox",
  "generated_at": "2026-02-16T01:14:22Z",
  "status": "healthy",
  "summary": "Dashboard rebuilt",
  "metrics": {
    "total_runs": 14,
    "total_events": 62,
    "engines_seen": ["dashboard", "enforce", "preflight", "validate"]
  },
  "coverage": {
    "first_day": "2026-02-10",
    "last_day": "2026-02-16",
    "days_present": 7
  }
}

12️⃣ Governance Declaration

Dashboard Output Contract v1.0 is:

Stable

Deterministic

Telemetry-aligned

Reducer-safe

Marketplace-safe

SaaS-ready

Breaking changes require:

Explicit version bump

Updated documentation

Consumer notification
