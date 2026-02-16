#!/usr/bin/env node
import fs from "fs";
import path from "path";

const [, , repo] = process.argv;
const TELEMETRY_ROOT = process.env.TELEMETRY_ROOT;

if (!repo) {
  console.error("Repo required");
  process.exit(1);
}

if (!TELEMETRY_ROOT) {
  console.error("TELEMETRY_ROOT required");
  process.exit(1);
}

const repoRoot = path.join(TELEMETRY_ROOT, repo);

if (!fs.existsSync(repoRoot)) {
  console.log(JSON.stringify(empty(repo)));
  process.exit(0);
}

const dayDirs = fs.readdirSync(repoRoot, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

let totalRuns = 0;
let totalEvents = 0;
const engines = new Set();

for (const day of dayDirs) {
  const dayPath = path.join(repoRoot, day);

  const runDirs = fs.readdirSync(dayPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const run of runDirs) {
    totalRuns++;
    const runPath = path.join(dayPath, run);

    const files = fs.readdirSync(runPath)
      .filter(f => f !== ".keep");

    for (const file of files) {
      if (!file.endsWith(".json")) {
        throw new Error(`Invalid file type: ${file}`);
      }

      const full = path.join(runPath, file);
      const raw = fs.readFileSync(full, "utf8").trim();

      if (!raw) {
        throw new Error(`Empty telemetry file: ${full}`);
      }

      let record;
      try {
        record = JSON.parse(raw);
      } catch {
        throw new Error(`Invalid JSON: ${full}`);
      }

      if (record.schema_version !== "1.0") {
        throw new Error(`Unsupported schema version: ${full}`);
      }

      if (record.entity?.repo !== repo) {
        throw new Error(`Repo mismatch in ${full}`);
      }

      if (record.correlation_id !== run) {
        throw new Error(`Correlation mismatch in ${full}`);
      }

      if (record.event?.category !== file.replace(".json", "")) {
        throw new Error(`Category mismatch in ${full}`);
      }

      totalEvents++;
      engines.add(record.event.category);
    }
  }
}

console.log(JSON.stringify({
  ok: true,
  repo,
  total_runs: totalRuns,
  total_events: totalEvents,
  engines_seen: Array.from(engines).sort(),
  status: "healthy"
}));

function empty(repo) {
  return {
    ok: true,
    repo,
    total_runs: 0,
    total_events: 0,
    engines_seen: [],
    status: "no-telemetry"
  };
}
