/* lib/infra.ts
 *
 * Phase 3.4 infra resolver
 * - v2 preferred
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
     * Hard failure — telemetry cannot be resolved
     * ------------------------------------------------------------ */
    reasons.push("repository not registered in infra v2");
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
        registrySha: v2?.sha ?? "",
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
    }
    return entries;
}
