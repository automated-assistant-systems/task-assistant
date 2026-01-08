#!/usr/bin/env node
/**
 * Task Assistant — Repository Preparation Script
 *
 * Responsibilities:
 * - Validate .github/task-assistant.yml
 * - Ensure required labels exist
 * - Ensure required milestones exist
 *
 * Design (Phase 3.2):
 * - NO telemetry emission
 * - Structured result object
 * - Exit code remains authoritative
 * - Optional machine-readable JSON output
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import yaml from "yaml";
try {
  await import("yaml");
} catch {
  console.error("Missing dependency: yaml");
  process.exit(1);
}

/* ──────────────────────────────
   CLI parsing
   ────────────────────────────── */

const args = process.argv.slice(2);
const repo = args.find(a => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const jsonOut = args.includes("--json");

if (!repo) {
  console.error("Usage: prepare-repo <owner/repo> [--dry-run] [--json]");
  process.exit(1);
}

/* ──────────────────────────────
   Utilities
   ────────────────────────────── */

function run(cmd) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}

/* ──────────────────────────────
   Structured Result
   ────────────────────────────── */

const result = {
  tool: "prepare-repo",
  version: "1.0",
  repo,
  mode: dryRun ? "dry-run" : "apply",
  ok: true,
  summary: "",
  checks: [],
  labels: {
    created: [],
    updated: [],
    skipped: []
  },
  milestones: {
    created: [],
    skipped: []
  }
};

function recordCheck(id, outcome, details = null) {
  result.checks.push({
    id,
    outcome, // PASS | FAIL | WARN
    details
  });
  if (outcome === "FAIL") {
    result.ok = false;
  }
}

/* ──────────────────────────────
   Load + Validate Config
   ────────────────────────────── */

const configPath = ".github/task-assistant.yml";
let config;

try {
  const raw = fs.readFileSync(configPath, "utf8");
  config = yaml.parse(raw);
  recordCheck("config.load", "PASS");
} catch (err) {
  recordCheck("config.load", "FAIL", err.message);
  finalizeAndExit();
}

/* Required sections */
const REQUIRED_SECTIONS = ["tracks", "labels", "milestones"];

for (const section of REQUIRED_SECTIONS) {
  if (!Array.isArray(config[section])) {
    recordCheck(
      `config.section.${section}`,
      "FAIL",
      `Missing or invalid '${section}' section`
    );
  } else {
    recordCheck(`config.section.${section}`, "PASS");
  }
}

if (!result.ok) {
  finalizeAndExit();
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
    result.labels.created.push(label.name);
    recordCheck(
      `label.${label.name}`,
      dryRun ? "WARN" : "PASS",
      "Label missing"
    );
    if (!dryRun) {
      run(
        `gh label create "${label.name}" --repo ${repo} ` +
        `--color "${label.color}" --description "${label.description}"`
      );
    }
  } else if (
    match.color !== label.color ||
    (match.description || "") !== (label.description || "")
  ) {
    result.labels.updated.push(label.name);
    recordCheck(
      `label.${label.name}`,
      dryRun ? "WARN" : "PASS",
      "Label differs from spec"
    );
    if (!dryRun) {
      run(
        `gh label edit "${label.name}" --repo ${repo} ` +
        `--color "${label.color}" --description "${label.description}"`
      );
    }
  } else {
    result.labels.skipped.push(label.name);
    recordCheck(`label.${label.name}`, "PASS");
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
    recordCheck(
      `milestone.${m.title}`,
      dryRun ? "WARN" : "PASS",
      "Milestone missing"
    );
    if (!dryRun) {
      run(
        `gh api repos/${repo}/milestones -f title="${m.title}" -f state="open"`
      );
    }
  } else {
    result.milestones.skipped.push(m.title);
    recordCheck(`milestone.${m.title}`, "PASS");
  }
}

/* ──────────────────────────────
   Finalize
   ────────────────────────────── */

function finalizeAndExit() {
  result.summary = result.ok
    ? "Repository is compliant"
    : "Repository requires preparation";

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(result.ok ? 0 : 1);
}

finalizeAndExit();
