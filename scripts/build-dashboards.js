#!/usr/bin/env node
/**
 * Task Assistant — Dashboard Builder (Org-Scoped)
 *
 * Phase: 3.4
 *
 * Contract:
 * - Operates on ONE telemetry repo only
 * - No registry access
 * - No git operations
 * - Deterministic filesystem output
 */

import fs from "fs";
import path from "path";

/* ──────────────────────────────
   Environment
   ────────────────────────────── */

const TELEMETRY_ROOT = process.env.TELEMETRY_ROOT;
const DASHBOARD_ROOT = process.env.DASHBOARD_ROOT;

if (!TELEMETRY_ROOT || !DASHBOARD_ROOT) {
  console.error(
    "[dashboard] TELEMETRY_ROOT and DASHBOARD_ROOT are required"
  );
  process.exit(1);
}

// Marketplace-safe: empty telemetry repo is valid
if (!fs.existsSync(TELEMETRY_ROOT)) {
  console.log("[dashboard] No telemetry root found — nothing to build");
  process.exit(0);
}

fs.mkdirSync(DASHBOARD_ROOT, { recursive: true });

/* ──────────────────────────────
   Main
   ────────────────────────────── */

const repoDirs = fs
  .readdirSync(TELEMETRY_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const repo of repoDirs) {
  const repoTelemetryPath = path.join(TELEMETRY_ROOT, repo);
  const repoDashboardPath = path.join(DASHBOARD_ROOT, repo);
  const dashboardFile = path.join(
    repoDashboardPath,
    "dashboard.json"
  );

  fs.mkdirSync(repoDashboardPath, { recursive: true });

  try {
    const jsonlFiles = fs
      .readdirSync(repoTelemetryPath)
      .filter(f => f.endsWith(".jsonl"))
      .sort();

    if (jsonlFiles.length === 0) {
      writeDashboard(dashboardFile, emptyDashboard(repo));
      continue;
    }

    let totalEvents = 0;

    for (const file of jsonlFiles) {
      const lines = fs
        .readFileSync(path.join(repoTelemetryPath, file), "utf8")
        .split("\n")
        .filter(Boolean);

      totalEvents += lines.length;
    }

    writeDashboard(
      dashboardFile,
      successDashboard({
        repo,
        first: jsonlFiles[0],
        last: jsonlFiles.at(-1),
        days: jsonlFiles.length,
        totalEvents,
      })
    );
  } catch (err) {
    writeDashboard(dashboardFile, errorDashboard(repo, err));
    console.error(
      `[dashboard] Failed for ${repo}: ${err.message}`
    );
  }
}

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function writeDashboard(file, payload) {
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}

function emptyDashboard(repo) {
  return {
    schema_version: "dashboard.v1",
    repo,
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
  repo,
  first,
  last,
  days,
  totalEvents,
}) {
  return {
    schema_version: "dashboard.v1",
    repo,
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

function errorDashboard(repo, err) {
  return {
    schema_version: "dashboard.v1",
    repo,
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
