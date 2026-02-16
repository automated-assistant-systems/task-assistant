#!/usr/bin/env node
/**
 * Task Assistant — Dashboard Reducer (Repo-Scoped) — Hardened (ESM-safe)
 *
 * Emits exactly ONE JSON object to stdout.
 * No top-level return statements.
 */

import fs from "fs";
import path from "path";

/* ──────────────────────────────
   CLI + ENV
   ────────────────────────────── */

const [, , repo] = process.argv;

const TELEMETRY_ROOT = process.env.TELEMETRY_ROOT;
const FAIL_ON_INVALID = process.env.DASHBOARD_FAIL_ON_INVALID === "true";
const PARSE_JSON = process.env.DASHBOARD_PARSE_JSON !== "false";

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function nowUtcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function emit(obj, code = 0) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(code);
}

function err(msg) {
  process.stderr.write(`${msg}\n`);
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function listDirNames(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return null;
  }
}

function listJsonFiles(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith(".json"))
      .map(d => d.name);
  } catch {
    return null;
  }
}

function isDayDirName(name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) return false;
  return true;
}

function isValidCorrelationId(name) {
  if (!name || typeof name !== "string") return false;
  if (name.includes("/") || name.includes("\\")) return false;
  return true;
}

function safeReadJsonFile(fp) {
  if (!isFile(fp)) return { ok: false, error: "Not a file" };

  const raw = fs.readFileSync(fp, "utf8");
  if (!raw || !raw.trim()) return { ok: false, error: "Empty JSON file" };

  if (!PARSE_JSON) return { ok: true };

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "JSON must be object" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e.message}` };
  }
}

function emptyDashboard(repoName) {
  return {
    dashboard_version: "1.0",
    repo: repoName,
    generated_at: nowUtcIso(),
    status: "no-telemetry",
    summary: "No telemetry present",
    metrics: {
      total_runs: 0,
      total_events: 0,
      engines_seen: [],
    },
    coverage: {
      first_day: null,
      last_day: null,
      days_present: 0,
    },
  };
}

function successDashboard(data) {
  return {
    dashboard_version: "1.0",
    repo: data.repo,
    generated_at: nowUtcIso(),
    status: "healthy",
    summary: "Dashboard rebuilt",
    metrics: {
      total_runs: data.totalRuns,
      total_events: data.totalEvents,
      engines_seen: data.engines,
    },
    coverage: {
      first_day: data.firstDay,
      last_day: data.lastDay,
      days_present: data.days,
    },
  };
}

function invalidDashboard(repoName, summary) {
  return {
    dashboard_version: "1.0",
    repo: repoName,
    generated_at: nowUtcIso(),
    status: "invalid-telemetry",
    summary,
    metrics: {
      total_runs: 0,
      total_events: 0,
      engines_seen: [],
    },
    coverage: {
      first_day: null,
      last_day: null,
      days_present: 0,
    },
  };
}

/* ──────────────────────────────
   Main
   ────────────────────────────── */

function main() {
  if (!repo) {
    err("[dashboard] Repo argument required");
    emit(invalidDashboard("unknown", "Missing repo argument"), 1);
  }

  if (!TELEMETRY_ROOT) {
    err("[dashboard] TELEMETRY_ROOT required");
    emit(invalidDashboard(repo, "Missing TELEMETRY_ROOT"), 1);
  }

  const repoRoot = path.join(TELEMETRY_ROOT, repo);

  if (!isDir(repoRoot)) {
    emit(emptyDashboard(repo), 0);
  }

  const rawDayDirs = listDirNames(repoRoot);
  if (rawDayDirs === null) {
    emit(invalidDashboard(repo, "Unable to read telemetry directory"), FAIL_ON_INVALID ? 1 : 0);
  }

  const dayDirs = rawDayDirs.filter(isDayDirName).sort();

  if (rawDayDirs.length > 0 && dayDirs.length === 0) {
    emit(invalidDashboard(repo, "No valid YYYY-MM-DD directories"), FAIL_ON_INVALID ? 1 : 0);
  }

  if (dayDirs.length === 0) {
    emit(emptyDashboard(repo), 0);
  }

  let totalRuns = 0;
  let totalEvents = 0;
  const engines = new Set();

  for (const day of dayDirs) {
    const dayPath = path.join(repoRoot, day);
    const runDirs = listDirNames(dayPath) || [];

    for (const run of runDirs.filter(isValidCorrelationId)) {
      const runPath = path.join(dayPath, run);
      if (!isDir(runPath)) continue;

      totalRuns++;

      const files = listJsonFiles(runPath) || [];

      for (const file of files) {
        const fp = path.join(runPath, file);
        const check = safeReadJsonFile(fp);
        if (!check.ok) {
          emit(
            invalidDashboard(repo, `Invalid telemetry file: ${file}`),
            FAIL_ON_INVALID ? 1 : 0
          );
        }

        totalEvents++;
        engines.add(file.replace(".json", ""));
      }
    }
  }

  emit(
    successDashboard({
      repo,
      firstDay: dayDirs[0] || null,
      lastDay: dayDirs.at(-1) || null,
      days: dayDirs.length,
      totalRuns,
      totalEvents,
      engines: Array.from(engines).sort(),
    }),
    0
  );
}

main();
