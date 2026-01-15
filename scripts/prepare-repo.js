#!/usr/bin/env node
/**
 * Task Assistant — Repository Preparation Script
 *
 * Phase 3.3
 * - Core config errors: FAIL
 * - Enforcement config errors: WARN
 * - Repo hygiene remains authoritative
 * - No telemetry emitted here
 */

import fs from "fs";
import { execSync } from "child_process";
import yaml from "yaml";
import os from "os";
import path from "path";
import { validateConfig } from "./config/validate-config.js";

/* ──────────────────────────────
   CLI
   ────────────────────────────── */

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const dryRun = args.includes("--dry-run");
const repo = args.find(a => !a.startsWith("--"));

if (!repo) {
  console.error("Usage: prepare-repo <owner/repo> [--dry-run] [--json]");
  process.exit(1);
}

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function run(cmd) {
  return execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8"
  }).trim();
}

/* ──────────────────────────────
   Result model
   ────────────────────────────── */

const result = {
  tool: "prepare-repo",
  version: "1.0",
  repo,
  mode: dryRun ? "dry-run" : "apply",
  ok: true,
  summary: "",
  checks: [],
  labels: { created: [], updated: [], skipped: [] },
  milestones: { created: [], skipped: [] }
};

function check(id, outcome, details = null) {
  result.checks.push({ id, outcome, details });
  if (outcome === "FAIL") result.ok = false;
}

/* ──────────────────────────────
   Load config
   ────────────────────────────── */

let config;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task-assistant-prepare-"));
const cloneDir = path.join(tmp, "repo");

try {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GH_TOKEN is required");

  run(
    `git clone https://x-access-token:${token}@github.com/${repo}.git "${cloneDir}"`
  );

  const configPath = path.join(
    cloneDir,
    ".github",
    "task-assistant.yml"
  );

  if (!fs.existsSync(configPath)) {
    check("config.load", "FAIL", "Missing .github/task-assistant.yml");
    finalize();
  }

  const raw = fs.readFileSync(configPath, "utf8");
  config = yaml.parse(raw);
  check("config.load", "PASS");
} catch (err) {
  check("config.load", "FAIL", err.message);
  finalize();
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ──────────────────────────────
   Validate config
   ────────────────────────────── */

const validation = validateConfig(config);

/* Enforcement warnings */
for (const err of validation.enforcementErrors) {
  check("config.enforcement", "WARN", err.message);
}

/* Core failures */
if (!validation.ok) {
  for (const err of validation.coreErrors) {
    check("config.schema", "FAIL", err.message);
  }
  finalize();
}

/* Required sections (shape) */
for (const section of ["tracks", "labels", "milestones"]) {
  check(`config.section.${section}`, "PASS");
}

/* ──────────────────────────────
   Existing labels
   ────────────────────────────── */

const existingLabels = JSON.parse(
  run(`gh label list --repo ${repo} --json name,color,description --limit 100`)
);

/* ──────────────────────────────
   Track labels
   ────────────────────────────── */

for (const track of config.tracks) {
  if (!track.label) {
    check(`track.${track.id}`, "FAIL", "Missing label");
    continue;
  }

  const found = existingLabels.find(l => l.name === track.label);

  if (!found) {
    result.labels.created.push(track.label);
    check(`track.${track.id}`, dryRun ? "WARN" : "PASS", "Missing");
    if (!dryRun) {
      run(
        `gh label create "${track.label}" --repo ${repo} ` +
        `--color "C5DEF5" --description "${track.description || ""}"`
      );
    }
  } else {
    check(`track.${track.id}`, "PASS");
  }
}

/* ──────────────────────────────
   Labels
   ────────────────────────────── */

for (const label of config.labels) {
  const found = existingLabels.find(l => l.name === label.name);

  if (!found) {
    result.labels.created.push(label.name);
    check(`label.${label.name}`, dryRun ? "WARN" : "PASS", "Missing");
    if (!dryRun) {
      run(
        `gh label create "${label.name}" --repo ${repo} ` +
        `--color "${label.color}" --description "${label.description || ""}"`
      );
    }
  } else if (
    found.color !== label.color ||
    (found.description || "") !== (label.description || "")
  ) {
    result.labels.updated.push(label.name);
    check(`label.${label.name}`, dryRun ? "WARN" : "PASS", "Mismatch");
    if (!dryRun) {
      run(
        `gh label edit "${label.name}" --repo ${repo} ` +
        `--color "${label.color}" --description "${label.description || ""}"`
      );
    }
  } else {
    result.labels.skipped.push(label.name);
    check(`label.${label.name}`, "PASS");
  }
}

/* ──────────────────────────────
   Milestones
   ────────────────────────────── */

const existingMilestones = JSON.parse(
  run(`gh api repos/${repo}/milestones --paginate`)
);

for (const m of config.milestones) {
  const exists = existingMilestones.find(x => x.title === m.title);
  if (!exists) {
    result.milestones.created.push(m.title);
    check(`milestone.${m.title}`, dryRun ? "WARN" : "PASS", "Missing");
    if (!dryRun) {
      run(`gh api repos/${repo}/milestones -f title="${m.title}" -f state="open"`);
    }
  } else {
    result.milestones.skipped.push(m.title);
    check(`milestone.${m.title}`, "PASS");
  }
}

/* ──────────────────────────────
   Finalize
   ────────────────────────────── */

function finalize() {
  result.summary = result.ok
    ? "Repository is compliant"
    : "Repository requires preparation";

  if (jsonMode) {
    process.stdout.write(JSON.stringify(result));
  }

  process.exit(result.ok ? 0 : 1);
}

finalize();
