#!/usr/bin/env node
/**
 * Task Assistant — Repository Preparation Script
 *
 * Responsibilities:
 * - Validate .github/task-assistant.yml
 * - Ensure required labels exist (tracks, system, managed)
 * - Ensure required milestones exist
 * - Emit telemetry for:
 *   - validation
 *   - label reconciliation
 *   - milestone reconciliation
 *
 * Telemetry:
 * - MUST be written to telemetry repo
 * - MUST NOT write locally
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import crypto from "crypto";
import yaml from "yaml";

/* ──────────────────────────────
   CLI parsing
   ────────────────────────────── */

const args = process.argv.slice(2);
const repo = args.find(a => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!repo) {
  console.error("Usage: prepare-repo <owner/repo> [--dry-run]");
  process.exit(1);
}

/* ──────────────────────────────
   Utilities
   ────────────────────────────── */

function run(cmd) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}

function now() {
  return new Date().toISOString();
}

function correlationId() {
  return crypto.randomUUID();
}

/* ──────────────────────────────
   Telemetry
   ────────────────────────────── */

if (!process.env.TELEMETRY_REPO) {
  console.error(`
TELEMETRY_REPO env var is required.

Expected:
- Organization variable TELEMETRY_REPO
- Typically set by bootstrap-codex-app-secrets.sh

Example:
export TELEMETRY_REPO=automated-assistant-systems/task-assistant-telemetry
`);
  process.exit(1);
}

const TELEMETRY_REPO = process.env.TELEMETRY_REPO;

const TELEMETRY = {
  schema_version: "1.0",
  generated_at: now(),
  correlation_id: correlationId(),
  actor: "prepare-repo",
  action: "repo.prepare",
  entity: {
    type: "repository",
    repo
  },
  outcome: "UNKNOWN",
  reason: null,
  validation: [],
  labels: {
    created: [],
    updated: [],
    skipped: []
  },
  milestones: {
    created: [],
    skipped: []
  },
  execution: {
    started_at: now(),
    finished_at: null,
    dry_run: dryRun
  }
};

function emitTelemetryAndExit(code) {
  TELEMETRY.execution.finished_at = now();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ta-telemetry-"));
  run(`git clone https://github.com/${TELEMETRY_REPO}.git ${tmpDir}`);

  run(`git -C ${tmpDir} config user.name "task-assistant[bot]"`);
  run(`git -C ${tmpDir} config user.email "task-assistant[bot]@users.noreply.github.com"`);

  const outDir = path.join(tmpDir, "prepare-repo");
  fs.mkdirSync(outDir, { recursive: true });

  const file = path.join(
    outDir,
    `${TELEMETRY.generated_at.replace(/[:.]/g, "-")}-${TELEMETRY.correlation_id}.json`
  );

  fs.writeFileSync(file, JSON.stringify(TELEMETRY, null, 2));

  run(`git -C ${tmpDir} add .`);
  run(`git -C ${tmpDir} commit -m "telemetry: repo.prepare ${TELEMETRY.correlation_id}"`);
  run(`git -C ${tmpDir} push`);

  process.exit(code);
}

/* ──────────────────────────────
   Load + Validate Config
   ────────────────────────────── */

let config;
const configPath = ".github/task-assistant.yml";

try {
  const raw = fs.readFileSync(configPath, "utf8");
  config = yaml.parse(raw);
} catch (err) {
  TELEMETRY.outcome = "BLOCKED";
  TELEMETRY.reason = "Missing or invalid .github/task-assistant.yml";
  TELEMETRY.validation.push({
    level: "error",
    message: err.message
  });
  emitTelemetryAndExit(1);
}

/* Required top-level sections */
const REQUIRED_SECTIONS = ["tracks", "labels", "milestones"];

for (const section of REQUIRED_SECTIONS) {
  if (!Array.isArray(config[section])) {
    TELEMETRY.validation.push({
      level: "error",
      message: `Missing or invalid '${section}' section`
    });
  }
}

if (TELEMETRY.validation.length) {
  TELEMETRY.outcome = "BLOCKED";
  TELEMETRY.reason = "Config validation failed";
  emitTelemetryAndExit(1);
}

/* ──────────────────────────────
   Labels
   ────────────────────────────── */

const existingLabels = JSON.parse(
  run(`gh label list --repo ${repo} --json name,color,description --limit 100`)
);

for (const label of config.labels) {
  const match = existingLabels.find(l => l.name === label.name);

  if (!match) {
    TELEMETRY.labels.created.push(label.name);
    if (!dryRun) {
      run(
        `gh label create "${label.name}" --repo ${repo} --color "${label.color}" --description "${label.description}"`
      );
    }
  } else if (
    match.color !== label.color ||
    (match.description || "") !== (label.description || "")
  ) {
    TELEMETRY.labels.updated.push(label.name);
    if (!dryRun) {
      run(
        `gh label edit "${label.name}" --repo ${repo} --color "${label.color}" --description "${label.description}"`
      );
    }
  } else {
    TELEMETRY.labels.skipped.push(label.name);
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
    TELEMETRY.milestones.created.push(m.title);
    if (!dryRun) {
      run(
        `gh api repos/${repo}/milestones -f title="${m.title}" -f state="open"`
      );
    }
  } else {
    TELEMETRY.milestones.skipped.push(m.title);
  }
}

/* ──────────────────────────────
   Final Outcome
   ────────────────────────────── */

TELEMETRY.outcome = "SUCCESS";
emitTelemetryAndExit(0);
