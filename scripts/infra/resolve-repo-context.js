#!/usr/bin/env node
import { resolveInfraForRepo } from "../../lib/infra.js";
async function main() {
    const targetRepo = process.argv[2];
    const githubToken = process.env.GITHUB_TOKEN;
    if (!targetRepo) {
        console.error("Usage: resolve-repo-context <owner/repo>");
        process.exit(1);
    }
    if (!githubToken) {
        console.error("GITHUB_TOKEN required");
        process.exit(1);
    }
    const infra = await resolveInfraForRepo({ githubToken, targetRepo });
    // machine-readable, one-line JSON
    console.log(JSON.stringify({
        context: infra.repoContext,
        state: infra.repoState,
        outcome: infra.outcomeCode,
    }));
}
main().catch(err => {
    console.error(err);
    process.exit(2);
});
