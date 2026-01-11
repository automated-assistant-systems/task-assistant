#!/usr/bin/env node
import fs from "fs";
import path from "path";

const telemetryRoot = process.env.TELEMETRY_ROOT;
const dashboardRoot = process.env.DASHBOARD_ROOT;

if (!telemetryRoot || !dashboardRoot) {
  console.error("Missing TELEMETRY_ROOT or DASHBOARD_ROOT");
  process.exit(1);
}

const repoDirs = fs.readdirSync(telemetryRoot, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const repoKey of repoDirs) {
  const repoTelemetryPath = path.join(telemetryRoot, repoKey);
  const dashboardDir = path.join(dashboardRoot, repoKey);
  const dashboardFile = path.join(dashboardDir, "dashboard.json");

  fs.mkdirSync(dashboardDir, { recursive: true });

  const jsonlFiles = fs.readdirSync(repoTelemetryPath)
    .filter(f => f.endsWith(".jsonl"))
    .sort();

  if (jsonlFiles.length === 0) {
    writeDashboard(dashboardFile, {
      schema_version: "dashboard.v1",
      repo: repoKey.replace("_", "/"),
      generated_at: new Date().toISOString(),
      summary: { status: "no-telemetry" },
      diagnostics: {
        warnings: ["No telemetry records found"],
        errors: []
      }
    });
    continue;
  }

  let totalEvents = 0;

  for (const file of jsonlFiles) {
    const lines = fs.readFileSync(
      path.join(repoTelemetryPath, file),
      "utf8"
    ).split("\n").filter(Boolean);
    totalEvents += lines.length;
  }

  writeDashboard(dashboardFile, {
    schema_version: "dashboard.v1",
    repo: repoKey.replace("_", "/"),
    telemetry_version: "v1",
    generated_at: new Date().toISOString(),
    coverage: {
      first_record: jsonlFiles[0].replace(".jsonl", ""),
      last_record: jsonlFiles.at(-1).replace(".jsonl", ""),
      days_present: jsonlFiles.length
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
  });
}

function writeDashboard(file, payload) {
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}
