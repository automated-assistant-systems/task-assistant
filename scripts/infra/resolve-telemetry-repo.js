#!/usr/bin/env node
import { resolveInfraForRepo } from "../../lib/infra.js";
async function main() {
    const targetRepo = process.argv[2];
    const githubToken = process.env.GITHUB_TOKEN;
    if (!targetRepo) {
        console.error("Usage: resolve-telemetry-repo <owner/repo>");
        process.exit(1);
    }
    if (!githubToken) {
        console.error("GITHUB_TOKEN is required");
        process.exit(1);
    }
    const infra = await resolveInfraForRepo({
        githubToken,
        targetRepo,
    });
    if (!infra.telemetryRepo) {
        console.error(`Telemetry repo unresolved for ${targetRepo}: ${infra.outcomeCode}`);
        process.exit(2);
    }
    // stdout is intentionally machine-readable
    console.log(infra.telemetryRepo);
}
main().catch((err) => {
    console.error(err);
    process.exit(3);
});
