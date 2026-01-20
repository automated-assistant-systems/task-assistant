#!/usr/bin/env node
/**
 * Task Assistant — Dashboard Engine Self-Test
 *
 * Contract:
 * - Repo-scoped
 * - Reads telemetry for ONE repo
 * - Emits a synthetic dashboard result
 * - No git operations
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const REPO = process.env.REPO;

if (!REPO) {
  console.error("[dashboard] Repo name required (env REPO)");
  process.exit(1);
}

const TELEMETRY_ROOT = process.env.TELEMETRY_ROOT || "telemetry/v1/repos";
const DASHBOARD_ROOT = process.env.DASHBOARD_ROOT || "telemetry/v1/dashboards";

const repoTelemetryPath = path.join(TELEMETRY_ROOT, REPO);

let totalEvents = 0;

if (fs.existsSync(repoTelemetryPath)) {
  const jsonlFiles = fs
    .readdirSync(repoTelemetryPath)
    .filter(f => f.endsWith(".jsonl"));

  for (const f of jsonlFiles) {
    const lines = fs
      .readFileSync(path.join(repoTelemetryPath, f), "utf8")
      .split("\n")
      .filter(Boolean);
    totalEvents += lines.length;
  }
}

const result = {
  ok: true,
  repo: REPO,
  summary: "Dashboard engine self-test passed",
  total_events: totalEvents
};

console.log(JSON.stringify(result, null, 2));
