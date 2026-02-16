Task Assistant — Dashboard Contract v1

Status: Locked
Applies To: All dashboard builds reading telemetry schema_version "1.0"
Effective Since: Phase 3.5 Hardening
Scope: Static dashboard builds from telemetry repository

1. Purpose

This document defines the formal contract between:

The Telemetry System (emitters + storage)

The Dashboard Builder (consumer)

The dashboard MUST treat telemetry as immutable audit data and MUST render deterministically from it.

The dashboard MUST NOT infer, mutate, or repair telemetry.

Telemetry is authoritative.
Dashboard is a pure projection layer.

2. Source of Truth

The dashboard MUST read exclusively from the telemetry repository.

It MUST traverse:

telemetry/v1/repos/*/*/*/*.json


It MUST NOT:

Read host repositories

Read workflow logs

Call GitHub APIs for reconciliation

Infer missing events

Telemetry repository is the only allowed data source.

3. Storage Layout Assumptions (v1.0)

Dashboard MUST assume the following structure:

telemetry/v1/repos/<repo>/<yyyy-mm-dd>/<correlation_id>/<category>.json


Where:

<repo> equals entity.repo

<yyyy-mm-dd> derived from generated_at

<correlation_id> equals record correlation_id

<category> equals event.category

Dashboard MUST validate these invariants.

4. Record Contract

Each JSON file MUST contain:

Exactly one JSON object

Valid UTF-8

No trailing content

schema_version = "1.0"

Dashboard MUST reject:

Empty files

Multiple JSON objects

Non-JSON files (except .keep)

schema_version != "1.0"

Rejection MUST fail the dashboard build.

5. Required Top-Level Fields

Each record MUST contain:

schema_version
generated_at
correlation_id
source
entity
event
details


If any are missing → build failure.

6. Identity Invariants

Dashboard MUST verify:

entity.repo matches <repo> directory

correlation_id matches correlation folder

event.category matches filename (without .json)

If any mismatch → build failure.

No silent tolerance.

7. Allowed Event Categories (v1.0)

Dashboard MUST recognize:

preflight

self-test

validate

materialize

enforce

dashboard

If a new category appears:

Dashboard MUST NOT crash

It MAY render as "unknown"

It MUST NOT assume schema drift

New categories are additive and allowed in v1.

8. Allowed event.action Values

For schema v1.0:

success

failure

Dashboard MUST treat any other value as invalid.

Failure events MUST contain non-null event.reason.

9. Partial Correlation Handling

A correlation directory MAY contain:

One engine file

Multiple engine files

A subset of expected engines

Dashboard MUST:

Display what exists

Never infer missing engines

Never treat absence as failure

Never treat absence as success

Telemetry reflects reality.

10. Deterministic Rendering Rules

Dashboard output MUST be deterministic for identical telemetry state.

Sorting MUST be:

Date descending (YYYY-MM-DD)

Correlation ID descending (numeric where possible)

Engine category lexicographically

Filesystem order MUST NOT be trusted.

11. Correlation Isolation

Dashboard MUST:

Treat each <correlation_id> directory as isolated

Never merge events across correlations

Never infer cross-correlation relationships

Each correlation represents one dispatcher execution path.

12. Corruption Containment

If corruption is detected:

Invalid JSON

Identity mismatch

Schema violation

Dashboard MUST:

Fail build

Emit clear error

NOT partially render corrupted state

Telemetry corruption must never silently degrade output.

13. Non-JSON Files

Dashboard MUST ignore:

.keep


Dashboard MUST reject any other unexpected file type.

14. Append-Only Assumption

Dashboard assumes telemetry is:

Append-only

Immutable per file

Correlation directories never modified

If historical files change unexpectedly, behavior is undefined and must be treated as potential tampering.

15. No Schema Inference

Dashboard MUST NOT:

Derive status from checks array

Infer failure from check FAIL unless event.action = failure

Guess meaning from details

Depend on optional fields

Top-level event is authoritative.

16. Dashboard Stability Guarantees

Given valid telemetry:

Dashboard guarantees:

Deterministic output

Schema v1 compliance

Correlation isolation

No host repo contamination

No implicit behavior

No side effects

17. Versioning Policy

Dashboard v1 is locked to:

schema_version: "1.0"


If telemetry schema_version increments:

Dashboard MUST reject incompatible major versions

Dashboard MUST require explicit upgrade

No silent forward compatibility beyond additive optional fields.

18. Failure Conditions (Hard Fail)

Dashboard build MUST fail if:

JSON parse error

schema_version mismatch

Missing required fields

Identity mismatch

Duplicate engine files in correlation

Duplicate correlation IDs under same date

Correlation directory contains conflicting repo identity

19. Allowed Soft Conditions (Non-Fatal)

Dashboard MAY continue if:

Correlation contains unknown event.category

Optional fields missing

Checks array missing

No telemetry exists for repo

In "no telemetry" case, dashboard MUST emit:

status: "no-telemetry"

20. Governance Declaration

Dashboard Contract v1 is:

Deterministic

Strict

Schema-locked

Marketplace-safe

SaaS-ready

Changes require:

Explicit version update

Telemetry schema alignment

Validation update

Documentation update
