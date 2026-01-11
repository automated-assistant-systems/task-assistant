#!/usr/bin/env node
/**
 * Task Assistant — Repository Preparation Script
 *
 * Phase 3.2
 * - Config validation
 * - Label reconciliation
 * - Milestone reconciliation
 * - NO telemetry emission
 */

import fs from "fs";
import { execSync } from "child_process";
import yaml from "yaml";

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
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
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
try {
  const raw = fs.readFileSync(".github/task-assistant.yml", "utf8");
  config = yaml.parse(raw);
  check("config.load", "PASS");
} catch (err) {
  check("config.load", "FAIL", err.message);
  finalize();
}

const validation = validateConfig(config);

if (!validation.ok) {
  console.error("❌ Task Assistant configuration error\n");

  for (const e of validation.errors) {
    console.error(`Path: ${e.path}`);
    console.error(`Problem: ${e.problem}`);
    console.error(`Expected: ${e.expected}`);
    console.error(`How to fix: ${e.fix}\n`);
  }

  process.exit(1);
}

/* Required sections */
for (const section of ["tracks", "labels", "milestones"]) {
  if (!Array.isArray(config?.[section])) {
    check(`config.section.${section}`, "FAIL", "Missing or invalid section");
  } else {
    check(`config.section.${section}`, "PASS");
  }
}

if (!result.ok) {
  finalize();
}

/* ──────────────────────────────
   Load existing labels (shared)
   ────────────────────────────── */

const existingLabels = JSON.parse(
  run(`gh label list --repo ${repo} --json name,color,description --limit 100`)
);

/* ──────────────────────────────
   Track Labels (authoritative)
   ────────────────────────────── */

for (const track of config.tracks) {
  if (!track.label) {
    check(
      `track.${track.id}`,
      "FAIL",
      "Track missing required label field"
    );
    continue;
  }

  const found = existingLabels.find(l => l.name === track.label);

  if (!found) {
    result.labels.created.push(track.label);
    check(
      `track.${track.id}`,
      dryRun ? "WARN" : "PASS",
      "Track label missing"
    );

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
