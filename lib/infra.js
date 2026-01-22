/* lib/infra.ts
 *
 * Phase 3.4 infra resolver
 * - v2 preferred
 * - v1 fallback
 * - execution allowed if telemetry resolves
 * - infra is NOT an execution gate
 */
async function fetchJsonFile(token, owner, repo, path) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });
    if (!res.ok)
        return null;
    const data = (await res.json());
    const decoded = Buffer.from(data.content, "base64").toString("utf8");
    return { json: JSON.parse(decoded), sha: data.sha };
}
export async function resolveInfra(params) {
    const { githubToken, targetRepo } = params;
    const [orgOwner, targetRepoName] = targetRepo.split("/");
    const warnings = [];
    const reasons = [];
    /* ------------------------------------------------------------
     * Attempt v2 registry (preferred)
     * ------------------------------------------------------------ */
    const v2 = await fetchJsonFile(githubToken, "automated-assistant-systems", "task-assistant-infra", "infra/telemetry-registry.v2.json");
    if (v2?.json?.orgs?.[orgOwner]) {
        const org = v2.json.orgs[orgOwner];
        const repo = org.repos?.[targetRepoName];
        const telemetryRepo = org.telemetry_repo;
        if (!telemetryRepo) {
            throw new Error("Infra error: v2 org exists but telemetry_repo missing");
        }
        if (repo) {
            return {
                orgOwner,
                targetRepoName,
                telemetryRepo,
                repoContext: repo.context ?? "unknown",
                repoState: repo.state,
                dashboard: {
                    enabled: repo.state === "enabled",
                    public: false,
                },
                warnings,
                reasons,
                versionUsed: "v2",
                registrySha: v2.sha,
                outcomeCode: "INFRA_OK",
            };
        }
        // repo not registered in v2 — allow execution
        warnings.push("repo not explicitly registered in infra v2; using org-level telemetry routing");
        return {
            orgOwner,
            targetRepoName,
            telemetryRepo,
            repoContext: "unknown",
            repoState: "absent",
            dashboard: {
                enabled: false,
                public: false,
            },
            warnings,
            reasons,
            versionUsed: "v2",
            registrySha: v2.sha,
            outcomeCode: "INFRA_REPO_UNREGISTERED",
        };
    }
    /* ------------------------------------------------------------
     * Fallback to v1 registry
     * ------------------------------------------------------------ */
    const v1 = await fetchJsonFile(githubToken, "automated-assistant-systems", "task-assistant-infra", "telemetry-registry.json");
    const v1Org = v1?.json?.organizations?.find((o) => o.owner === orgOwner);
    if (v1Org) {
        const repo = v1Org.repositories?.find((r) => r.name === targetRepoName && r.enabled);
        if (repo) {
            warnings.push("resolved via legacy v1 infra; migrate to v2 required");
            return {
                orgOwner,
                targetRepoName,
                telemetryRepo: v1Org.telemetry_repo,
                repoContext: "unknown",
                repoState: "enabled",
                dashboard: {
                    enabled: false,
                    public: false,
                },
                warnings,
                reasons,
                versionUsed: "v1-fallback",
                registrySha: v1.sha,
                outcomeCode: "INFRA_OK",
            };
        }
    }
    /* ------------------------------------------------------------
     * Hard failure — telemetry cannot be resolved
     * ------------------------------------------------------------ */
    reasons.push("repository not registered in infra v1 or v2");
    return {
        orgOwner,
        targetRepoName,
        telemetryRepo: "",
        repoContext: "unknown",
        repoState: "absent",
        dashboard: {
            enabled: false,
            public: false,
        },
        warnings,
        reasons,
        versionUsed: "v2",
        registrySha: v2?.sha ?? v1?.sha ?? "",
        outcomeCode: "INFRA_TELEMETRY_UNRESOLVABLE",
    };
}
// Backwards-compatible alias (Phase 3.4)
export const resolveInfraForRepo = resolveInfra;
export async function listDashboardEligibleRepos(params) {
    const { githubToken, allowV1Fallback } = params;
    const entries = [];
    // ─────────────────────────────────────────────
    // Load v2 registry (preferred)
    // ─────────────────────────────────────────────
    const v2 = await fetchJsonFile(githubToken, "automated-assistant-systems", "task-assistant-infra", "infra/telemetry-registry.v2.json");
    if (v2?.json?.orgs) {
        for (const [owner, org] of Object.entries(v2.json.orgs)) {
            if (!org.telemetry_repo || !org.repos)
                continue;
            for (const [repo, meta] of Object.entries(org.repos)) {
                if (meta.state !== "enabled")
                    continue;
                entries.push({
                    owner,
                    repo,
                    telemetryRepo: org.telemetry_repo,
                    versionUsed: "v2",
                });
            }
        }
        return entries;
    }
    // ─────────────────────────────────────────────
    // Fallback to v1 registry (optional)
    // ─────────────────────────────────────────────
    if (!allowV1Fallback)
        return entries;
    const v1 = await fetchJsonFile(githubToken, "automated-assistant-systems", "task-assistant-infra", "telemetry-registry.json");
    if (!v1?.json?.organizations)
        return entries;
    for (const org of v1.json.organizations) {
        if (!org.telemetry_repo || !Array.isArray(org.repositories))
            continue;
        for (const repo of org.repositories) {
            if (!repo.enabled)
                continue;
            entries.push({
                owner: org.owner,
                repo: repo.name,
                telemetryRepo: org.telemetry_repo,
                versionUsed: "v1-fallback",
            });
        }
    }
    return entries;
}
