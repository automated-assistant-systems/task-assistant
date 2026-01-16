#!/usr/bin/env node
/**
 * Task Assistant — Dashboard Builder (Registry-Driven)
 *
 * Phase: 3.4
 *
 * Guarantees:
 * - No repo discovery
 * - No scanning GitHub
 * - Registry is authoritative
 * - Customer telemetry repos only
 * - Deterministic output paths
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/* ──────────────────────────────
   CLI
   ────────────────────────────── */

const args = process.argv.slice(2);
const registryArg = args[args.indexOf("--registry") + 1];

if (!registryArg) {
  console.error(
    "Usage: build-dashboards.js --registry <path-to-telemetry-registry.json>"
  );
  process.exit(1);
}

if (!fs.existsSync(registryArg)) {
  console.error(`[dashboard] Registry not found: ${registryArg}`);
  process.exit(1);
}

/* ──────────────────────────────
   Load Registry
   ────────────────────────────── */

let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryArg, "utf8"));
} catch (err) {
  console.error("[dashboard] Invalid registry JSON");
  console.error(err.message);
  process.exit(1);
}

if (!Array.isArray(registry.orgs)) {
  console.error("[dashboard] Registry missing 'orgs' array");
  process.exit(1);
}

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function run(cmd) {
  return execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim();
}

function writeDashboard(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}

/* ──────────────────────────────
   Main
   ────────────────────────────── */

for (const org of registry.orgs) {
  const { owner, telemetry_repo, repos } = org;

  if (!owner || !telemetry_repo || !Array.isArray(repos)) {
    console.warn("[dashboard] Skipping invalid org entry:", org);
    continue;
  }

  console.log(`[dashboard] Processing org: ${owner}`);

  // Clone telemetry repo
  const tmp = fs.mkdtempSync(
    path.join(process.cwd(), ".tmp-dashboard-")
  );
  const cloneDir = path.join(tmp, "telemetry");

  try {
    run(
      `git clone https://github.com/${telemetry_repo}.git "${cloneDir}"`
    );
  } catch (err) {
    console.error(
      `[dashboard] Failed to clone telemetry repo: ${telemetry_repo}`
    );
    continue;
  }

  for (const repo of repos) {
    const telemetryRoot = path.join(
      cloneDir,
      "telemetry",
      "v1",
      "repos",
      repo
    );

    const dashboardFile = path.join(
      cloneDir,
      "telemetry",
      "v1",
      "dashboards",
      repo,
      "dashboard.json"
    );

    try {
      if (!fs.existsSync(telemetryRoot)) {
        writeDashboard(
          dashboardFile,
          emptyDashboard(owner, repo)
        );
        continue;
      }

      const jsonlFiles = fs
        .readdirSync(telemetryRoot)
        .filter(f => f.endsWith(".jsonl"))
        .sort();

      if (jsonlFiles.length === 0) {
        writeDashboard(
          dashboardFile,
          emptyDashboard(owner, repo)
        );
        continue;
      }

      let totalEvents = 0;
      for (const file of jsonlFiles) {
        const lines = fs
          .readFileSync(path.join(telemetryRoot, file), "utf8")
          .split("\n")
          .filter(Boolean);
        totalEvents += lines.length;
      }

      writeDashboard(
        dashboardFile,
        successDashboard({
          owner,
          repo,
          first: jsonlFiles[0],
          last: jsonlFiles.at(-1),
          days: jsonlFiles.length,
          totalEvents,
        })
      );
    } catch (err) {
      writeDashboard(
        dashboardFile,
        errorDashboard(owner, repo, err)
      );
      console.error(
        `[dashboard] Failed for ${owner}/${repo}: ${err.message}`
      );
    }
  }

  // Commit & push dashboards
  try {
    run(`git -C "${cloneDir}" add telemetry/v1/dashboards`);
    run(
      `git -C "${cloneDir}" commit --allow-empty -m "dashboard: rebuild"`
    );
    run(`git -C "${cloneDir}" push`);
  } catch (err) {
    console.error(
      `[dashboard] Push failed for ${telemetry_repo}`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ──────────────────────────────
   Dashboard Models
   ────────────────────────────── */

function emptyDashboard(owner, repo) {
  return {
    schema_version: "dashboard.v1",
    repo,
    owner,
    telemetry_version: "v1",
    generated_at: new Date().toISOString(),
    coverage: {
      first_record: null,
      last_record: null,
      days_present: 0,
    },
    summary: {
      total_events: 0,
      status: "no-telemetry",
    },
    diagnostics: {
      warnings: ["No telemetry records found"],
      errors: [],
      notes: [],
    },
  };
}

function successDashboard({
  owner,
  repo,
  first,
  last,
  days,
  totalEvents,
}) {
  return {
    schema_version: "dashboard.v1",
    repo,
    owner,
    telemetry_version: "v1",
    generated_at: new Date().toISOString(),
    coverage: {
      first_record: first.replace(".jsonl", ""),
      last_record: last.replace(".jsonl", ""),
      days_present: days,
    },
    summary: {
      total_events: totalEvents,
      status: "healthy",
    },
    diagnostics: {
      warnings: [],
      errors: [],
      notes: ["No destructive actions taken"],
    },
  };
}

function errorDashboard(owner, repo, err) {
  return {
    schema_version: "dashboard.v1",
    repo,
    owner,
    telemetry_version: "v1",
    generated_at: new Date().toISOString(),
    summary: {
      total_events: 0,
      status: "error",
    },
    diagnostics: {
      warnings: [],
      errors: [err.message],
      notes: [],
    },
  };
}
