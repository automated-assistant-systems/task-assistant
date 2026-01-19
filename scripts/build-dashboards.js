#!/usr/bin/env node
/**
 * Task Assistant — Dashboard Reducer (Repo-Scoped)
 *
 * Phase: 3.4
 *
 * Contract:
 * - Reads repo telemetry only
 * - No filesystem writes
 * - No git operations
 * - Emits JSON to stdout ONLY
 */

import fs from "fs";
import path from "path";

const [,, repo] = process.argv;

if (!repo) {
  console.error("[dashboard] Repo name required");
  process.exit(1);
}

const TELEMETRY_ROOT = process.env.TELEMETRY_ROOT;

if (!TELEMETRY_ROOT) {
  console.error("[dashboard] TELEMETRY_ROOT is required");
  process.exit(1);
}

const repoTelemetryPath = path.join(TELEMETRY_ROOT, repo);

if (!fs.existsSync(repoTelemetryPath)) {
  console.log(JSON.stringify(emptyDashboard(repo)));
  process.exit(0);
}

const jsonlFiles = fs
  .readdirSync(repoTelemetryPath)
  .filter(f => f.endsWith(".jsonl"))
  .sort();

if (jsonlFiles.length === 0) {
  console.log(JSON.stringify(emptyDashboard(repo)));
  process.exit(0);
}

let totalEvents = 0;

for (const file of jsonlFiles) {
  const lines = fs
    .readFileSync(path.join(repoTelemetryPath, file), "utf8")
    .split("\n")
    .filter(Boolean);

  totalEvents += lines.length;
}

console.log(JSON.stringify(successDashboard({
  repo,
  first: jsonlFiles[0],
  last: jsonlFiles.at(-1),
  days: jsonlFiles.length,
  totalEvents,
})));

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function emptyDashboard(repo) {
  return {
    ok: true,
    repo,
    summary: "No telemetry present",
    total_events: 0,
    coverage: {
      first_record: null,
      last_record: null,
      days_present: 0,
    },
    status: "no-telemetry",
  };
}

function successDashboard({ repo, first, last, days, totalEvents }) {
  return {
    ok: true,
    repo,
    summary: "Dashboard rebuilt",
    total_events: totalEvents,
    coverage: {
      first_record: first.replace(".jsonl", ""),
      last_record: last.replace(".jsonl", ""),
      days_present: days,
    },
    status: "healthy",
  };
}
