#!/usr/bin/env node
import fs from "fs";
import path from "path";

const telemetryRoot = process.env.TELEMETRY_ROOT;
const dashboardRoot = process.env.DASHBOARD_ROOT;

if (!telemetryRoot || !dashboardRoot) {
  console.error("[dashboard] Missing TELEMETRY_ROOT or DASHBOARD_ROOT");
  process.exit(1);
}

// ---- Guard: empty telemetry state (Marketplace-safe) ----
if (!fs.existsSync(telemetryRoot)) {
  console.log(`[dashboard] Telemetry root not found: ${telemetryRoot}`);
  console.log("[dashboard] No dashboards generated (empty telemetry state)");
  process.exit(0);
}

fs.mkdirSync(dashboardRoot, { recursive: true });

const repoDirs = fs.readdirSync(telemetryRoot, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const repoKey of repoDirs) {
  const repoTelemetryPath = path.join(telemetryRoot, repoKey);
  const repoDashboardPath = path.join(dashboardRoot, repoKey);
  const dashboardFile = path.join(repoDashboardPath, "dashboard.json");

  fs.mkdirSync(repoDashboardPath, { recursive: true });

  try {
    const jsonlFiles = fs.readdirSync(repoTelemetryPath)
      .filter(f => f.endsWith(".jsonl"))
      .sort();

    if (jsonlFiles.length === 0) {
      writeDashboard(dashboardFile, emptyDashboard(repoKey));
      continue;
    }

    let totalEvents = 0;

    for (const file of jsonlFiles) {
      const fullPath = path.join(repoTelemetryPath, file);
      const lines = fs.readFileSync(fullPath, "utf8")
        .split("\n")
        .filter(Boolean);
      totalEvents += lines.length;
    }

    writeDashboard(dashboardFile, successDashboard({
      repoKey,
      first: jsonlFiles[0],
      last: jsonlFiles.at(-1),
      days: jsonlFiles.length,
      totalEvents
    }));

  } catch (err) {
    // ---- Per-repo failure isolation ----
    writeDashboard(
      dashboardFile,
      errorDashboard(repoKey, err)
    );
    console.error(`[dashboard] Failed for ${repoKey}: ${err.message}`);
  }
}

// ---------- Helpers ----------

function writeDashboard(file, payload) {
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}

function emptyDashboard(repoKey) {
  return {
    schema_version: "dashboard.v1",
    repo: repoKey.replace("_", "/"),
    generated_at: new Date().toISOString(),
    status: "no-telemetry",
    diagnostics: {
      warnings: ["No telemetry records found"],
      errors: []
    }
  };
}

function successDashboard({ repoKey, first, last, days, totalEvents }) {
  return {
    schema_version: "dashboard.v1",
    repo: repoKey.replace("_", "/"),
    telemetry_version: "v1",
    generated_at: new Date().toISOString(),
    coverage: {
      first_record: first.replace(".jsonl", ""),
      last_record: last.replace(".jsonl", ""),
      days_present: days
    },
    summary: {
      total_events: totalEvents,
      status: "healthy"
    },
    diagnostics: {
      warnings: [],
      errors: [],
      notes: ["No destructive actions taken"]
    }
  };
}

function errorDashboard(repoKey, err) {
  return {
    schema_version: "dashboard.v1",
    repo: repoKey.replace("_", "/"),
    generated_at: new Date().toISOString(),
    status: "error",
    diagnostics: {
      warnings: [],
      errors: [err.message]
    }
  };
}
