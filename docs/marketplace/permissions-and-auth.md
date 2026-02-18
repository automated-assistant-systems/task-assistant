# Permissions & Authentication Model (Authoritative)

Task Assistant follows the principle of least privilege under a preflight-gated, version-pinned runtime model.

---

## 1. Authentication

All runtime behavior uses:

- GitHub App installation tokens
- Repository-scoped permissions
- No Personal Access Tokens (PATs)
- No user credentials

The dispatcher creates installation-scoped tokens per execution.

Authentication is validated during preflight before any mutation-capable engine runs.

---

## 2. Identity Characteristics

- Repository-scoped
- Explicitly granted by installation
- Auditable and revocable
- Version-pinned execution (engine_ref)

No alternate credentials are used.

---

## 3. Permission Usage

### Repository Metadata (read)
Used to inspect repository state.

### Issues (read/write)
Used only when enforcement is explicitly configured.

### Contents (read)
Used to read `.github/task-assistant.yml`.

### Contents (write — telemetry repository only)
Used exclusively to write telemetry and derived dashboards.

Monitored repositories never receive telemetry writes.

---

## 4. Enforcement Guardrails

Mutation requires:

- Valid installation
- Successful preflight
- Valid configuration
- Explicit engine invocation
- engine_ref pinning

If any condition fails:

- No mutation occurs
- Telemetry is emitted with ok=false

---

## 5. Explicit Restrictions

Task Assistant does not:

- Modify repository source code
- Create pull requests
- Execute repository code
- Escalate privileges
- Cross organization boundaries
- Override engine_ref
- Perform autonomous actions

All execution is dispatcher-controlled and auditable.
