Marketplace Submission Form — Mapped Answers
1️⃣ App Description (Short)

Marketplace field:

Short description of what your app does

Use this (≤ 140 chars):

Enforces repository hygiene using explicit configuration and emits immutable telemetry for auditability and operator visibility.

Source:

docs/marketplace/README.md

One-page reviewer summary (Overview)

2️⃣ App Description (Long)

Marketplace field:

Detailed description of your app

Use this (paragraph form):

Task Assistant is a GitHub App that enforces repository hygiene using deterministic, configuration-driven rules. It validates repository state, applies explicitly configured enforcement actions, and emits structured telemetry for auditability. Telemetry and observability are handled in a dedicated repository and never modify monitored repositories. All behavior is non-destructive by default, auditable, and designed to meet GitHub Marketplace safety standards.

Source:

docs/marketplace/README.md

One-page reviewer summary

3️⃣ What Does This App Do Automatically?

Marketplace field:

Describe what actions your app performs automatically

Use this (bullet list):

Task Assistant automatically:

Validates repository configuration and hygiene

Responds to repository events using explicit, deterministic rules

Applies enforcement actions only when explicitly configured

Emits structured, append-only telemetry describing system behavior

Task Assistant does not modify code, create pull requests, or perform destructive actions without explicit configuration.

Source:

docs/marketplace/runtime-components.md

non-behaviors.md

4️⃣ Permissions Justification

Marketplace field:

Explain why each permission is required

Use this structured explanation:

Repository Metadata (read)

Used to inspect repository state, issues, labels, and milestones for validation and enforcement.

Issues (read/write — optional)

Used only when enforcement actions are explicitly configured by the operator.

Contents (read)

Used to read declarative configuration files.

Contents (write — telemetry repository only)

Used to write immutable telemetry and derived dashboard artifacts to an operator-owned telemetry repository.

Task Assistant never writes to monitored repositories beyond explicitly configured enforcement actions.

Source:

docs/marketplace/permissions-and-auth.md

5️⃣ Authentication Model

Marketplace field:

How does your app authenticate?

Use this:

Task Assistant authenticates using a GitHub App installation token. No Personal Access Tokens (PATs) or user credentials are used. All authentication scopes are repository-scoped, auditable, and revocable.

Source:

permissions-and-auth.md

One-page reviewer summary

6️⃣ Data Storage & External Services

Marketplace field:

Does your app store data outside GitHub?

Use this (explicit and safe):

Yes. Task Assistant stores telemetry in a dedicated, operator-owned GitHub repository.

Raw telemetry is append-only and immutable

Derived dashboards are regenerable artifacts

No data is written to monitored repositories

No third-party services are used

Source:

telemetry-and-dashboards.md

7️⃣ User Data Handling

Marketplace field:

How do you handle user data?

Use this:

Task Assistant records only operational metadata (e.g., repository identifiers, event categories, enforcement outcomes). No source code, secrets, or personal data are collected. All telemetry is immutable, auditable, and stored in GitHub-owned infrastructure.

Source:

One-page reviewer summary

telemetry-and-dashboards.md

8️⃣ Failure Behavior

Marketplace field:

What happens when something goes wrong?

Use this:

Task Assistant fails safely. Missing configuration prevents enforcement from running. Empty or malformed telemetry does not affect monitored repositories. Workflow failures are visible only via GitHub Actions logs and do not trigger enforcement changes.

Source:

failure-modes.md

9️⃣ Does the App Modify Code?

Marketplace field:

Does your app modify repository code?

Use this (very important):

No. Task Assistant never modifies repository code, creates pull requests, or deletes content.

Source:

non-behaviors.md

One-page reviewer summary

🔟 Setup & Onboarding

Marketplace field:

What setup is required?

Use this:

Installation consists of installing the GitHub App and providing a declarative configuration file. No scripts need to be run by Marketplace users. Optional operator tooling exists for development and testing but is not part of the Marketplace offering.

Source:

operator-tooling.md

runtime-components.md

1️⃣1️⃣ Security Statement (Optional but Recommended)

Marketplace field:

Security or safety notes

Use this:

Task Assistant follows least-privilege principles, performs no speculative automation, and separates enforcement, telemetry, and observability into distinct trust boundaries. All automated behavior is deterministic and auditable.

Source:

One-page reviewer summary

Final Cross-Reference Table (For You)
Marketplace Field	Source Doc
Short description	README.md
Long description	README.md
Automatic actions	runtime-components.md
Permissions	permissions-and-auth.md
Authentication	permissions-and-auth.md
Data storage	telemetry-and-dashboards.md
Failure behavior	failure-modes.md
Non-behaviors	non-behaviors.md
Operator tooling	operator-tooling.md
Reviewer summary	One-page summary
