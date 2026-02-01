# Permissions & Authentication Model

Task Assistant follows the principle of least privilege.

---

## Authentication

Task Assistant uses a GitHub App installation token for all runtime behavior.

Characteristics:
- Repository-scoped
- Explicitly granted by installation
- Auditable and revocable
- No Personal Access Tokens (PATs)

GitHub Actions workflows that perform cross-repository operations authenticate using the same GitHub App identity.

---

## Permissions Rationale

### Repository Metadata (read)
Used to inspect repository state, issues, labels, and milestones.

### Issues (read/write — optional)
Used only when enforcement actions are explicitly configured.

### Contents (read)
Used to read configuration files.

### Contents (write — telemetry repository only)
Used to write telemetry and derived dashboards to a dedicated operator-owned repository.

---

## Explicit Restrictions

Task Assistant does not:
- Modify repository code
- Create pull requests
- Delete issues, PRs, or branches
- Perform actions without explicit configuration
