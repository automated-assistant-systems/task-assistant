#!/usr/bin/env node

/**
 * Resolve telemetry repo for a target repository using infra
 *
 * This is a thin JS wrapper around lib/infra.ts.
 * It exists so shell scripts can resolve telemetry routing
 * without reimplementing infra logic.
 *
 * Usage:
 *   GITHUB_TOKEN=... node resolve-telemetry-repo.js <owner/repo>
 */

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

  if (!infra || !infra.telemetryRepo) {
    console.error(
      `Telemetry repo unresolved for ${targetRepo}: ${infra?.outcomeCode || "UNKNOWN"}`
    );
    process.exit(2);
  }

  // IMPORTANT:
  // stdout is intentionally machine-readable
  // do not add logging here
  console.log(infra.telemetryRepo);
}

main().catch((err) => {
  console.error("Failed to resolve telemetry repo");
  console.error(err);
  process.exit(3);
});
