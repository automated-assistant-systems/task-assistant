#!/usr/bin/env node
/**
 * Task Assistant — Issue Events Enforcement
 *
 * Phase 3.2 baseline:
 * - Deterministic enforcement engine
 * - Structured JSON output (stdout) in --json mode
 * - No telemetry writes (workflow emits via scripts/telemetry/emit.js)
 */

import fs from "fs";
import yaml from "yaml";
import { execSync } from "child_process";

/* ──────────────────────────────
   CLI
   ────────────────────────────── */

const args = process.argv.slice(2);
const repo = args[args.indexOf("--repo") + 1];
const issueNumber = args[args.indexOf("--issue") + 1];
const eventType = args[args.indexOf("--event") + 1] || "unknown";
const jsonMode = args.includes("--json");

if (!repo || !issueNumber) {
  const msg = "Usage: issue-events.js --repo <owner/repo> --issue <number> [--event <type>] [--json]";
  if (jsonMode) {
    process.stdout.write(
      JSON.stringify({ ok: false, summary: msg, error: msg })
    );
  } else {
    console.error(msg);
  }
  process.exit(1);
}

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function run(cmd) {
  // In json mode: keep stdout clean (no logs)
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
}

function ghApi(path) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GH_TOKEN is required");

  // gh automatically uses GH_TOKEN; keep output as JSON
  return JSON.parse(run(`gh api ${path}`));
}

function ghIssueEditMilestone(ownerRepo, number, title) {
  run(`gh issue edit ${number} --repo ${ownerRepo} --milestone "${title}"`);
}

/* ──────────────────────────────
   Output model
   ────────────────────────────── */

const result = {
  tool: "issue-events",
  version: "1.0",
  repo,
  issue: { number: Number(issueNumber) },
  event: { type: eventType },
  mode: "apply",
  ok: true,
  summary: "No changes required",
  checks: [],
  actions: [],
};

function fail(summary, details = null) {
  result.ok = false;
  result.summary = summary;
  result.checks.push({
    id: "engine.failure",
    outcome: "FAIL",
    details: details || summary,
  });
}

function pass(id, details = null) {
  result.checks.push({ id, outcome: "PASS", details });
}

function warn(id, details = null) {
  result.checks.push({ id, outcome: "WARN", details });
}

/* ──────────────────────────────
   Enforcement rules (baseline)
   ────────────────────────────── */

function phaseMilestoneForLabel(label) {
  // Minimal Phase 3.x mapping (extend later as needed)
  const map = {
    "phase-3.1": "Phase 3.1 – Telemetry Enhancements",
    "phase-3.2": "Phase 3.2 – Hygiene & Enforcement",
    "phase-3.3": "Phase 3.3 – UX & Config Experience",
    "phase-3.4": "Phase 3.4 – Marketplace Readiness",
    "phase-3.5": "Phase 3.5 – Post-Release Hardening",
  };
  return map[label] || null;
}

async function main() {
  // Load config (required)
  const configPath = ".github/task-assistant.yml";
  let config;
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    config = yaml.parse(raw);
    pass("config.load");
  } catch (err) {
    fail("Missing or invalid .github/task-assistant.yml", err.message);
    return;
  }

  if (!Array.isArray(config?.labels) || !Array.isArray(config?.milestones)) {
    fail("Invalid task-assistant.yml: expected arrays for labels and milestones");
    return;
  }
  pass("config.shape");

  // Read issue
  const [owner, name] = repo.split("/");
  const issue = ghApi(`/repos/${owner}/${name}/issues/${issueNumber}`);
  const labels = (issue.labels || []).map(l => (typeof l === "string" ? l : l.name));
  const currentMilestone = issue.milestone?.title || null;

  pass("issue.load", { labels_count: labels.length, milestone: currentMilestone });

  // Rule: if phase label present, enforce matching milestone
  const phaseLabels = labels.filter(l => l.startsWith("phase-3."));
  if (phaseLabels.length === 0) {
    pass("phase.label.present", "no phase label");
  } else {
    pass("phase.label.present", phaseLabels);

    // If multiple phase labels exist, pick the most specific (highest)
    // (You can tighten this later to FAIL if multiple)
    const chosen = phaseLabels.sort().slice(-1)[0];
    const expected = phaseMilestoneForLabel(chosen);

    if (!expected) {
      warn("phase.milestone.map", `no mapping for ${chosen}`);
    } else if (currentMilestone === expected) {
      pass("phase.milestone.match", expected);
    } else {
      // Apply fix
      try {
        ghIssueEditMilestone(repo, issueNumber, expected);
        result.actions.push({
          id: "issue.milestone.set",
          from: currentMilestone,
          to: expected,
          reason: `phase label ${chosen}`,
        });
        result.summary = `Milestone set to match ${chosen}`;
        pass("phase.milestone.enforced", expected);
      } catch (err) {
        fail("Failed to enforce milestone", err.message);
      }
    }
  }

  // Future Phase 3.2 extensions live here:
  // - track label exclusivity
  // - stale/pinned interactions
  // - label hygiene rules
  // - terminal state transitions
}

await main();

// Emit structured JSON only
process.stdout.write(JSON.stringify(result));
process.exit(result.ok ? 0 : 1);
