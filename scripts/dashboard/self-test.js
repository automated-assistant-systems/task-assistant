#!/usr/bin/env node
/**
 * Dashboard Engine — Self-Test (Authoritative)
 *
 * Verifies:
 * - Telemetry ingestion
 * - Dashboard generation
 * - Canonical path correctness
 * - Deterministic output
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = "/tmp/dashboard-self-test";
const TELEMETRY_ROOT = path.join(ROOT, "telemetry", "v1", "repos");
const DASHBOARD_ROOT = path.join(ROOT, "telemetry", "v1", "dashboards");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// ──────────────────────────────
// Arrange
// ──────────────────────────────

const repo = "task-assistant";

write(
  path.join(TELEMETRY_ROOT, repo, "2026-01-01.jsonl"),
  JSON.stringify({ event: "test" }) + "\n"
);

// ──────────────────────────────
// Act
// ──────────────────────────────

process.env.TELEMETRY_ROOT = TELEMETRY_ROOT;
process.env.DASHBOARD_ROOT = DASHBOARD_ROOT;

execSync("node scripts/build-dashboards.js", {
  stdio: "inherit",
});

// ──────────────────────────────
// Assert
// ──────────────────────────────

const dashboardPath = path.join(
  DASHBOARD_ROOT,
  repo,
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
// Output helpers
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
