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
 *
 * Telemetry layout (v1, Phase 3.4):
 * telemetry/v1/repos/<repo>/<YYYY-MM-DD>/<correlation_id>/<engine>.json
 */

import fs from "fs";
import path from "path";

const [, , repo] = process.argv;

if (!repo) {
  console.error("[dashboard] Repo name required");
  process.exit(1);
}

const TELEMETRY_ROOT = process.env.TELEMETRY_ROOT;
if (!TELEMETRY_ROOT) {
  console.error("[dashboard] TELEMETRY_ROOT is required");
  process.exit(1);
}

const repoRoot = path.join(TELEMETRY_ROOT, repo);

if (!fs.existsSync(repoRoot)) {
  console.log(JSON.stringify(emptyDashboard(repo)));
  process.exit(0);
}

const dayDirs = fs
  .readdirSync(repoRoot, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

if (dayDirs.length === 0) {
  console.log(JSON.stringify(emptyDashboard(repo)));
  process.exit(0);
}

let totalRuns = 0;
let totalEvents = 0;
const engines = new Set();

for (const day of dayDirs) {
  const dayPath = path.join(repoRoot, day);

  const runDirs = fs
    .readdirSync(dayPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const run of runDirs) {
    totalRuns += 1;
    const runPath = path.join(dayPath, run);

    const engineFiles = fs
      .readdirSync(runPath)
      .filter(f => f.endsWith(".json"));

    for (const file of engineFiles) {
      totalEvents += 1;
      engines.add(file.replace(".json", ""));
    }
  }
}

console.log(JSON.stringify(successDashboard({
  repo,
  firstDay: dayDirs[0],
  lastDay: dayDirs.at(-1),
  days: dayDirs.length,
  totalRuns,
  totalEvents,
  engines: Array.from(engines).sort(),
})));



/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function emptyDashboard(repo) {
  return {
    ok: true,
    repo,
    summary: "No telemetry present",
    total_runs: 0,
    total_events: 0,
    coverage: {
      first_day: null,
      last_day: null,
      days_present: 0,
      engines_seen: [],
    },
    status: "no-telemetry",
  };
}

function successDashboard({
  repo,
  firstDay,
  lastDay,
  days,
  totalRuns,
  totalEvents,
  engines,
}) {
  return {
    ok: true,
    repo,
    summary: "Dashboard rebuilt",
    total_runs: totalRuns,
    total_events: totalEvents,
    coverage: {
      first_day: firstDay,
      last_day: lastDay,
      days_present: days,
      engines_seen: engines,
    },
    status: "healthy",
  };
}
