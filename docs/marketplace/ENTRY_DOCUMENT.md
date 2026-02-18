# Task Assistant — Marketplace Reviewer Entry Document

Status: Canonical
Applies To: GitHub Marketplace Review
Phase: 3.5 Runtime Model (Hardened)

## 1. What This App Is

Task Assistant is a GitHub App that enforces repository hygiene using deterministic, configuration-driven engines.

It operates under a strict runtime model:

Dispatcher → Preflight → Engine(s) → Telemetry

All automation is:

* Version-pinned
* Preflight-validated
* Installation-scoped
* Fully auditable
* Non-destructive by default

## 2. What It Does

Task Assistant can:

* Validate repository configuration
* Create missing labels or milestones (manual invocation only)
* Enforce explicit issue rules (label hygiene, milestone mapping)
* Emit immutable telemetry for every engine invocation
* Generate read-only dashboards derived from telemetry

All enforcement behavior must be explicitly declared in configuration.

No implicit automation exists.

## 3. What It Does NOT Do

Task Assistant does not:

* Modify repository source code
* Create pull requests
* Delete issues, PRs, or branches
* Execute arbitrary repository code
* Run hidden background tasks
* Aggregate data across organizations
* Escalate privileges
* Use Personal Access Tokens (PATs)

All behavior is explicitly defined and auditable.

## 4. Runtime Architecture (Non-Negotiable)

Each execution follows this sequence:

1. Dispatcher receives GitHub event.
2. Dispatcher selects version-pinned engine_ref.
3. Preflight validates:
    * App installation
    * Repository eligibility
    * Telemetry repository access
4. Engines execute deterministically.
5. Each engine emits exactly one telemetry record.

No engine runs before preflight succeeds.

## 5. Authentication Model

All runtime operations use:

* GitHub App installation tokens
* Installation-scoped permissions
* No user credentials
* No PATs

Authentication is validated during preflight.

Permissions follow least-privilege principles.

## 6. Telemetry Model

Telemetry is:

* Written only to a dedicated telemetry repository
* Immutable
* One JSON file per engine invocation
* Partitioned by repository, date, and correlation
* Version-attributed via engine_ref

Monitored repositories never store telemetry.

Every mutation-capable engine invocation produces exactly one immutable audit record.

## 7. Dashboard Model

Dashboards are:

* Derived from telemetry only
* Deterministic projections
* Fully regenerable
* Read-only
* Non-authoritative

Dashboard generation does not modify monitored repositories.

## 8. Determinism & Reproducibility

Task Assistant guarantees:

* One dispatcher run → one correlation_id
* One engine invocation → one telemetry file
* All engines in a run share the same engine_ref
* No floating branches in Marketplace mode
* No silent mutation paths

Given identical inputs and engine_ref, outcomes are reproducible.

## 9. Failure Behavior

If validation fails:

* Execution halts
* No mutation occurs
* Telemetry records failure state

Failures:

* Do not cascade
* Do not affect unrelated repositories
* Do not produce hidden side effects

All failures are visible via GitHub Actions logs and telemetry.

## 10. Security Posture

Task Assistant is secure by construction:

* Preflight-gated execution
* Installation-scoped authentication
* No cross-organization access
* No dynamic privilege escalation
* Immutable audit log
* Explicit engine boundaries
* Strict separation between enforcement and observability

The system is intentionally conservative and Marketplace-safe.

## 11. Summary Statement

Task Assistant is a deterministic, version-pinned GitHub App that enforces repository hygiene using explicit configuration. All behavior is preflight-validated, installation-scoped, and recorded as immutable telemetry in a dedicated repository. Dashboards are derived projections and do not influence enforcement. No hidden automation or cross-organization access exists.
