Telemetry Registry Schema (Authoritative v1)

This schema must be boring, explicit, deterministic, and extensible. No magic. No inference.

File name (locked)
telemetry-registry.json


(Do not use YAML here — JSON avoids parser drift and makes automation safer.)

Schema: telemetry-registry.json (v1)
{
  "schema_version": "1.0",
  "generated_at": "2026-01-16T00:00:00Z",
  "registrar": {
    "system": "task-assistant",
    "purpose": "dashboard-aggregation"
  },
  "telemetry_repos": [
    {
      "org": "automated-assistant-systems",
      "repo": "task-assistant-telemetry",
      "visibility": "public",
      "status": "active",
      "added_at": "2026-01-10T14:22:00Z",
      "added_by": "system",
      "notes": "Primary production org"
    },
    {
      "org": "garybayes",
      "repo": "task-assistant-telemetry",
      "visibility": "public",
      "status": "active",
      "added_at": "2026-01-12T09:41:00Z",
      "added_by": "manual",
      "notes": "Personal testing org"
    }
  ]
}

Field-by-field justification (why each exists)
Top-level
Field	Why it exists
schema_version	Hard gate for backward compatibility
generated_at	Auditing & debugging
registrar.system	Prevents registry reuse ambiguity
registrar.purpose	Locks intent (dashboard aggregation only)
telemetry_repos[]
Field	Why
org	Explicit ownership boundary
repo	No string parsing later
visibility	Future dashboards may filter private
status	Allows soft-disable without deletion
added_at	Audit trail
added_by	Distinguishes automation vs manual
notes	Human context (optional, ignored by engine)
Engine consumption rules (non-negotiable)

The dashboard engine MUST:

❌ ignore unknown fields

❌ ignore entries with status != "active"

❌ never infer repos

❌ never query GitHub to “discover”

✅ only consume this registry

This makes the system provably deterministic.
