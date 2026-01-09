#!/usr/bin/env node
/**
 * Task Assistant — Repository Preparation Script
 *
 * Phase 3.2 (Authoritative)
 * --------------------------------------------------
 * Responsibilities:
 * - Validate .github/task-assistant.yml (structure + schema)
 * - Ensure required labels exist
 * - Ensure required milestones exist
 *
 * Design guarantees:
 * - NO telemetry emission
 * - Deterministic behavior
 * - Structured result object
 * - Exit code is authoritative
 * - Optional --json output
 */

import fs from "fs";
import { execSync } from "child_process";
import yaml from "yaml";
import { validateConfig } from "./config/validate-config.js";

/* ──────────────────────────────
   CLI parsing
   ────────────────────────────── */

const args = process.argv.slice(2);
const repo = args.find(a => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const jsonMode = args.includes("--json");

if (!repo) {
  console.error("Usage: prepare-repo <owner/repo> [--dry-run] [--json]");
  process.exit(1);
}

/* ──────────────────────────────
   Utilities
   ────────────────────────────── */

function run(cmd) {
  if (!jsonMode) {
    console.log(`$ ${cmd}`);
  }
  return execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim();
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
    skipped: [],
  },
  milestones: {
    created: [],
    skipped: [],
  },
};

function check(id, outcome, details = null) {
  result.checks.push({ id, outcome, details });
  if (outcome === "FAIL") {
    result.ok = false;
  }
}

/* ──────────────────────────────
   Load + Validate Config
   ────────────────────────────── */

const CONFIG_PATH = ".github/task-assistant.yml";
let config;

try {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  config = yaml.parse(raw);
  check("config.load", "PASS");
} catch (err) {
  check("config.load", "FAIL", err.message);
  return finalize();
}

/* Required top-level arrays */
for (const key of ["tracks", "labels", "milestones"]) {
  if (!Array.isArray(config?.[key])) {
    check(
      `config.section.${key}`,
      "FAIL",
      `Expected '${key}' to be an array`
    );
  } else {
    check(`config.section.${key}`, "PASS");
  }
}

if (!result.ok) {
  return finalize();
}

/* Schema validation (Phase 3.2 hardening) */
const schema = validateConfig(config);

if (!schema.ok) {
  schema.errors.forEach(err =>
    check("config.schema", "FAIL", err)
  );
  return finalize();
}

check("config.schema", "PASS");

/* ──────────────────────────────
   Labels
   ────────────────────────────── */

const existingLabels = JSON.parse(
  run(
    `gh label list --repo ${repo} --json name,color,description --limit 100`
  )
);

for (const spec of config.labels) {
  const found = existingLabels.find(l => l.name === spec.name);

  if (!found) {
    result.labels.created.push(spec.name);
    check(
      `label.${spec.name}`,
      dryRun ? "WARN" : "PASS",
      "Label missing"
    );

    if (!dryRun) {
      run(
        `gh label create "${spec.name}" ` +
          `--repo ${repo} ` +
          `--color "${spec.color}" ` +
          `--description "${spec.description || ""}"`
      );
    }
  } else if (
    found.color !== spec.color ||
    (found.description || "") !== (spec.description || "")
  ) {
    result.labels.updated.push(spec.name);
    check(
      `label.${spec.name}`,
      dryRun ? "WARN" : "PASS",
      "Label differs from spec"
    );

    if (!dryRun) {
      run(
        `gh label edit "${spec.name}" ` +
          `--repo ${repo} ` +
          `--color "${spec.color}" ` +
          `--description "${spec.description || ""}"`
      );
    }
  } else {
    result.labels.skipped.push(spec.name);
    check(`label.${spec.name}`, "PASS");
  }
}

/* ──────────────────────────────
   Milestones
   ────────────────────────────── */

const existingMilestones = JSON.parse(
  run(`gh api repos/${repo}/milestones --paginate`)
);

for (const spec of config.milestones) {
  const exists = existingMilestones.find(m => m.title === spec.title);

  if (!exists) {
    result.milestones.created.push(spec.title);
    check(
      `milestone.${spec.title}`,
      dryRun ? "WARN" : "PASS",
      "Milestone missing"
    );

    if (!dryRun) {
      run(
        `gh api repos/${repo}/milestones ` +
          `-f title="${spec.title}" ` +
          `-f state="open"`
      );
    }
  } else {
    result.milestones.skipped.push(spec.title);
    check(`milestone.${spec.title}`, "PASS");
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
