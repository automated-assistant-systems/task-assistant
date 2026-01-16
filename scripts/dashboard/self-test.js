#!/usr/bin/env node
/**
 * Dashboard Engine — Self-Test
 *
 * Guarantees:
 * - Registry parsing
 * - Telemetry ingestion
 * - Dashboard generation
 * - Canonical path correctness
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = "/tmp/dashboard-self-test";
const REGISTRY = path.join(ROOT, "registry.json");
const TELEMETRY = path.join(ROOT, "telemetry");
const DASHBOARDS = path.join(ROOT, "dashboards");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// ──────────────────────────────
// Arrange
// ──────────────────────────────

write(REGISTRY, JSON.stringify({
  registry_version: "1.0",
  orgs: [{
    owner: "automated-assistant-systems",
    telemetry_repo: "automated-assistant-systems/task-assistant-telemetry",
    repos: ["task-assistant"]
  }]
}, null, 2));

const repoKey = "automated-assistant-systems_task-assistant";
write(
  path.join(TELEMETRY, repoKey, "2026-01-01.jsonl"),
  JSON.stringify({ event: "test" }) + "\n"
);

// ──────────────────────────────
// Act
// ──────────────────────────────

process.env.TELEMETRY_ROOT = TELEMETRY;
process.env.DASHBOARD_ROOT = DASHBOARDS;

execSync("node scripts/build-dashboards.js", {
  stdio: "inherit"
});

// ──────────────────────────────
// Assert
// ──────────────────────────────

const dashboardPath = path.join(
  DASHBOARDS,
  repoKey,
  "dashboard.json"
);

if (!fs.existsSync(dashboardPath)) {
  fail("Dashboard file not generated");
}

const dashboard = JSON.parse(
  fs.readFileSync(dashboardPath, "utf8")
);

if (dashboard.schema_version !== "dashboard.v1") {
  fail("Invalid dashboard schema_version");
}

if (dashboard.summary?.total_events !== 1) {
  fail("Incorrect event count");
}

pass();

// ──────────────────────────────
// Output
// ──────────────────────────────

function pass() {
  console.log(JSON.stringify({
    tool: "dashboard-self-test",
    version: "1.0",
    ok: true,
    summary: "Dashboard engine self-test passed"
  }));
  process.exit(0);
}

function fail(reason) {
  console.error(JSON.stringify({
    tool: "dashboard-self-test",
    version: "1.0",
    ok: false,
    summary: reason
  }));
  process.exit(1);
}

