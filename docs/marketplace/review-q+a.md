🧠 Task Assistant — Pre-emptive Marketplace Reviewer Q&A
Q1. Does this app modify repository code?

Answer:
No. Task Assistant never modifies source code, creates pull requests, or changes branches. All enforcement actions are limited to metadata (e.g., labels, milestones, issue state) and only occur when explicitly configured.

Q2. Does the app perform any destructive actions?

Answer:
No destructive actions occur by default. Any action that could be considered disruptive (such as closing or relabeling issues) requires explicit, declarative configuration by the repository owner. There is no speculative or self-healing behavior.

Q3. What runs automatically after installation?

Answer:
Only three runtime components execute automatically:

Repository configuration validation

Event-driven enforcement logic (when configured)

Telemetry emission for auditability

No operator tooling, reset scripts, or certification scripts execute automatically.

Q4. Why does the app require write permissions to another repository?

Answer:
Write permissions are required only for a dedicated, operator-owned telemetry repository. This repository stores immutable telemetry and derived dashboard artifacts. No monitored repository receives telemetry or dashboards.

Q5. Is user data stored outside GitHub?

Answer:
Telemetry is stored in a GitHub repository owned by the app operator. No third-party services are used. Telemetry contains only operational metadata (repository identifiers, event categories, outcomes) and no source code, secrets, or personal data.

Q6. Can the app affect repositories without user configuration?

Answer:
No. Without a valid configuration file, enforcement does not run. Validation errors are surfaced, but no repository mutations occur.

Q7. How does the app authenticate across repositories?

Answer:
All automation authenticates using a GitHub App installation token. No Personal Access Tokens (PATs) or user credentials are used. Permissions are repository-scoped, auditable, and revocable.

Q8. What happens if telemetry data is missing or malformed?

Answer:

Missing telemetry: dashboard generation exits cleanly without producing artifacts

Malformed telemetry: dashboards report an error state without modifying raw telemetry

Enforcement behavior is unaffected in all cases

Failures are visible only to operators via GitHub Actions logs.

Q9. Can dashboards modify or influence enforcement behavior?

Answer:
No. Dashboards are derived, read-only artifacts generated from telemetry. They are not authoritative and do not feed back into enforcement logic.

Q10. Why are dashboards generated in a separate repository?

Answer:
This separation prevents contamination of monitored repositories, preserves audit boundaries, and ensures observability tooling cannot affect enforcement behavior. It also simplifies Marketplace safety review.

Q11. Does the app aggregate data across organizations?

Answer:
No. Dashboards are generated per repository only. There are no organization-level or cross-organization aggregations.

Q12. Are users required to run scripts manually?

Answer:
No. Marketplace users are not required to run any scripts. The repository contains operator-only tooling for development and testing, which is explicitly out of scope for Marketplace usage.

Q13. What happens if a workflow fails?

Answer:
Workflow failures are contained:

Visible only via GitHub Actions logs

Do not notify monitored repositories

Do not trigger enforcement changes

Do not alter repository state

Q14. Is behavior deterministic and auditable?

Answer:
Yes. Enforcement outcomes are deterministic based on configuration. All automated behavior is recorded as immutable telemetry, enabling traceability and replay.

Q15. How often is dashboard data updated?

Answer:
Dashboards are regenerated hourly and can also be rebuilt manually. They are fully recomputed from raw telemetry to ensure consistency.

Q16. Does the app introduce background automation outside GitHub events?

Answer:
No. All automation is triggered by GitHub events or scheduled workflows defined in the repository. There are no external schedulers or hidden processes.

Q17. Why should this app be considered Marketplace-safe?

Answer:
Because it:

Uses least-privilege permissions

Avoids code modification

Requires explicit configuration for enforcement

Separates enforcement, telemetry, and observability

Fails safely and predictably

Is fully auditable

Reviewer Summary Statement (Optional Closing)

Task Assistant enforces repository hygiene using explicit configuration and emits immutable telemetry to a dedicated repository. Derived dashboards are generated separately as read-only artifacts and never modify monitored repositories. All behavior is deterministic, auditable, and aligned with GitHub Marketplace safety standards.
