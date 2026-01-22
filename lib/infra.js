// lib/infra.ts
// Phase 3.4a — Authoritative infra registry reader (read-only)
import { Buffer } from "buffer";
/* ─────────────────────────────────────────────────────────────
 * Internal helpers
 * ──────────────────────────────────────────────────────────── */
const DEFAULT_INFRA_REPO = "automated-assistant-systems/task-assistant-infra";
const DEFAULT_INFRA_REF = "main";
const DEFAULT_V2_PATH = "infra/telemetry-registry.v2.json";
const DEFAULT_V1_PATH = "telemetry-registry.json";
const registryCache = new Map();
function cacheKey(repo, ref, path) {
    return `${repo}@${ref}:${path}`;
}
async function fetchJsonFromRepo(repo, ref, path, token) {
    const key = cacheKey(repo, ref, path);
    if (registryCache.has(key)) {
        return registryCache.get(key);
    }
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });
    if (!res.ok) {
        throw new Error(`Unable to read infra registry (${res.status})`);
    }
    const body = await res.json();
    const decoded = Buffer.from(body.content, "base64").toString("utf8");
    const json = JSON.parse(decoded);
    const entry = { sha: body.sha, json };
    registryCache.set(key, entry);
    return entry;
}
function splitRepo(targetRepo) {
    const parts = targetRepo.split("/");
    if (parts.length !== 2) {
        throw new Error(`Invalid targetRepo: ${targetRepo}`);
    }
    return { owner: parts[0], repo: parts[1] };
}
/* ─────────────────────────────────────────────────────────────
 * Validators (minimal, defensive)
 * ──────────────────────────────────────────────────────────── */
function validateV2(json) {
    const errors = [];
    if (json.schema_version !== "2.0") {
        errors.push("schema_version must be 2.0");
    }
    if (!json.orgs || typeof json.orgs !== "object") {
        errors.push("missing or invalid orgs");
    }
    return errors;
}
function validateV1(json) {
    const errors = [];
    if (json.schema_version !== "1.0") {
        errors.push("schema_version must be 1.0");
    }
    if (!Array.isArray(json.organizations)) {
        errors.push("organizations must be an array");
    }
    return errors;
}
/* ─────────────────────────────────────────────────────────────
 * Core resolver
 * ──────────────────────────────────────────────────────────── */
export async function resolveInfraForRepo(opts) {
    const { targetRepo, githubToken, infraRepo = DEFAULT_INFRA_REPO, infraRef = DEFAULT_INFRA_REF, infraPathV2 = DEFAULT_V2_PATH, infraPathV1 = DEFAULT_V1_PATH, allowV1Fallback = true, requireRepoEnabled = true, } = opts;
    const { owner, repo } = splitRepo(targetRepo);
    const baseResolution = {
        orgOwner: owner,
        targetRepoName: repo,
        repoContext: "unknown",
        dashboard: { enabled: false, public: false },
        reasons: [],
        warnings: [],
    };
    /* ───── Try v2 first ───── */
    try {
        const v2 = await fetchJsonFromRepo(infraRepo, infraRef, infraPathV2, githubToken);
        const v2Errors = validateV2(v2.json);
        if (v2Errors.length) {
            throw new Error(`Invalid v2 registry: ${v2Errors.join(", ")}`);
        }
        const org = v2.json.orgs?.[owner];
        if (!org) {
            return {
                ...baseResolution,
                versionUsed: "v2",
                registrySha: v2.sha,
                repoState: "absent",
                outcomeCode: "INFRA_ORG_ABSENT",
                reasons: ["organization not registered in infra v2"],
            };
        }
        if (!org.telemetry_repo) {
            return {
                ...baseResolution,
                versionUsed: "v2",
                registrySha: v2.sha,
                repoState: "absent",
                outcomeCode: "INFRA_REGISTRY_INVALID",
                reasons: ["org.telemetry_repo missing in infra v2"],
            };
        }
        const repoEntry = org.repos?.[repo];
        if (!repoEntry) {
            return {
                ...baseResolution,
                versionUsed: "v2",
                registrySha: v2.sha,
                telemetryRepo: org.telemetry_repo,
                repoState: "absent",
                outcomeCode: "INFRA_REPO_ABSENT",
                reasons: ["repository not registered in infra v2"],
            };
        }
        if (repoEntry.state !== "enabled") {
            return {
                ...baseResolution,
                versionUsed: "v2",
                registrySha: v2.sha,
                telemetryRepo: org.telemetry_repo,
                repoState: "disabled",
                repoContext: repoEntry.context ?? "unknown",
                outcomeCode: "INFRA_REPO_DISABLED",
                reasons: ["repository disabled in infra v2"],
            };
        }
        return {
            ...baseResolution,
            versionUsed: "v2",
            registrySha: v2.sha,
            telemetryRepo: org.telemetry_repo,
            repoState: "enabled",
            repoContext: repoEntry.context ?? "unknown",
            outcomeCode: "INFRA_OK_V2",
            reasons: ["resolved via infra v2"],
        };
    }
    catch (err) {
        if (!allowV1Fallback) {
            return {
                ...baseResolution,
                versionUsed: "v2",
                registrySha: "",
                repoState: "absent",
                outcomeCode: "INFRA_REGISTRY_UNREADABLE",
                reasons: [err.message],
            };
        }
    }
    /* ───── v1 fallback ───── */
    try {
        const v1 = await fetchJsonFromRepo(infraRepo, infraRef, infraPathV1, githubToken);
        const v1Errors = validateV1(v1.json);
        if (v1Errors.length) {
            throw new Error(`Invalid v1 registry: ${v1Errors.join(", ")}`);
        }
        const org = v1.json.organizations.find((o) => o.owner === owner);
        if (!org) {
            return {
                ...baseResolution,
                versionUsed: "v1",
                registrySha: v1.sha,
                repoState: "absent",
                outcomeCode: "INFRA_ORG_ABSENT",
                warnings: ["v1 fallback used"],
            };
        }
        const repoEntry = org.repositories.find((r) => r.name === repo);
        if (!repoEntry) {
            return {
                ...baseResolution,
                versionUsed: "v1",
                registrySha: v1.sha,
                telemetryRepo: org.telemetry_repo,
                repoState: "absent",
                outcomeCode: "INFRA_REPO_ABSENT",
                warnings: ["v1 fallback used"],
            };
        }
        if (!repoEntry.enabled && requireRepoEnabled) {
            return {
                ...baseResolution,
                versionUsed: "v1",
                registrySha: v1.sha,
                telemetryRepo: org.telemetry_repo,
                repoState: "disabled",
                outcomeCode: "INFRA_REPO_DISABLED",
                warnings: ["v1 fallback used"],
            };
        }
        return {
            ...baseResolution,
            versionUsed: "v1",
            registrySha: v1.sha,
            telemetryRepo: org.telemetry_repo,
            repoState: "enabled",
            outcomeCode: "INFRA_OK_V1_FALLBACK",
            warnings: ["resolved via infra v1 fallback"],
        };
    }
    catch (err) {
        return {
            ...baseResolution,
            versionUsed: "v1",
            registrySha: "",
            repoState: "absent",
            outcomeCode: "INFRA_REGISTRY_UNREADABLE",
            reasons: [err.message],
        };
    }
}
