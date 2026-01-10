#!/usr/bin/env node
/**
 * Task Assistant — Issue Events Enforcement
 *
 * Phase 3.2 — Hardened
 * - Config-driven exclusivity rules
 * - Deterministic enforcement
 * - Structured JSON output only
 * - No telemetry writes (workflow emits)
 */

import fs from "fs";
import yaml from "yaml";
import { execSync } from "child_process";
import { validateConfig } from "../config/validate-config.js";

/* ──────────────────────────────
   CLI
   ────────────────────────────── */

const args = process.argv.slice(2);
const repo = args[args.indexOf("--repo") + 1];
const issueNumber = args[args.indexOf("--issue") + 1];
const eventType = args[args.indexOf("--event") + 1] || "unknown";
const jsonMode = args.includes("--json");

if (!repo || !issueNumber) {
  const msg =
    "Usage: issue-events.js --repo <owner/repo> --issue <number> [--event <type>] [--json]";
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ ok: false, summary: msg }));
  } else {
    console.error(msg);
  }
  process.exit(1);
}

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function run(cmd) {
  return execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim();
}

function ghApi(path) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GH_TOKEN is required");
  return JSON.parse(run(`gh api ${path}`));
}

function ghIssueEditMilestone(ownerRepo, number, title) {
  run(`gh issue edit ${number} --repo ${ownerRepo} --milestone "${title}"`);
}

function ghIssueRemoveLabel(ownerRepo, number, label) {
  run(`gh issue edit ${number} --repo ${ownerRepo} --remove-label "${label}"`);
}

/* ──────────────────────────────
   Output Model
   ────────────────────────────── */

const result = {
  tool: "issue-events",
  version: "1.1",
  repo,
  issue: { number: Number(issueNumber) },
  event: { type: eventType },
  mode: "apply",
  ok: true,
  summary: "No changes required",
  checks: [],
  actions: [],
};

function pass(id, details = null) {
  result.checks.push({ id, outcome: "PASS", details });
}

function warn(id, details = null) {
  result.checks.push({ id, outcome: "WARN", details });
}

function fail(id, details = null) {
  result.ok = false;
  result.summary = id;
  result.checks.push({ id, outcome: "FAIL", details });
}

/* ──────────────────────────────
   Enforcement Utilities
   ────────────────────────────── */

function enforceExclusiveGroup({
  groupId,
  matches,
  mode,
  strategy = "highest",
  orderFn,
  terminal = [],
}) {
  if (matches.length <= 1) {
    pass(`${groupId}.exclusive`, "ok");
    return;
  }

  if (mode === "off") {
    pass(`${groupId}.exclusive`, "ignored");
    return;
  }

  const hasTerminal = matches.some(l => terminal.includes(l));
  if (hasTerminal) {
    warn(`${groupId}.terminal.present`, matches);
    return;
  }

  if (mode === "fail") {
    fail(`${groupId}.exclusive.violation`, matches);
    return;
  }

  if (mode === "warn") {
    warn(`${groupId}.exclusive.violation`, matches);
    return;
  }

  // enforce
  const sorted = orderFn ? matches.sort(orderFn) : matches;
  const keep = strategy === "highest" ? sorted.at(-1) : sorted[0];
  const remove = matches.filter(l => l !== keep);

  remove.forEach(label =>
    ghIssueRemoveLabel(repo, issueNumber, label)
  );

  result.actions.push({
    id: `${groupId}.labels.pruned`,
    kept: keep,
    removed: remove,
  });

  result.summary = `Resolved ${groupId} label exclusivity`;
  pass(`${groupId}.exclusive.enforced`, { kept: keep, removed: remove });
}

/* ──────────────────────────────
   Phase Helpers
   ────────────────────────────── */

function phaseNumber(label) {
  return Number(label.split("phase-")[1] || 0);
}

function phaseMilestoneForLabel(label) {
  const map = {
    "phase-3.1": "Phase 3.1 – Telemetry Enhancements",
    "phase-3.2": "Phase 3.2 – Hygiene & Enforcement",
    "phase-3.3": "Phase 3.3 – UX & Config Experience",
    "phase-3.4": "Phase 3.4 – Marketplace Readiness",
    "phase-3.5": "Phase 3.5 – Post-Release Hardening",
  };
  return map[label] || null;
}

/* ──────────────────────────────
   Main
   ────────────────────────────── */

async function main() {
  // Load config
  let config;
  try {
    const raw = fs.readFileSync(".github/task-assistant.yml", "utf8");
    config = yaml.parse(raw);
    pass("config.load");
  } catch (err) {
    fail("config.load", err.message);
    return;
  }

  const validation = validateConfig(config);

  if (!validation.ok) {
    validation.errors.forEach(err =>
      fail("config.schema", err)
    );
    return;
  }

  pass("config.schema.valid");

  const exclusivity = config?.enforcement?.exclusivity || {};
  pass("config.shape");

  // Load issue
  const [owner, name] = repo.split("/");
  const issue = ghApi(`/repos/${owner}/${name}/issues/${issueNumber}`);
  const labels = (issue.labels || []).map(l =>
    typeof l === "string" ? l : l.name
  );
  const currentMilestone = issue.milestone?.title || null;

  pass("issue.load", {
    labels_count: labels.length,
    milestone: currentMilestone,
  });

  /* ───────── Phase Exclusivity + Milestone ───────── */

  const phaseLabels = labels.filter(l => l.startsWith("phase-"));
  const phaseCfg = exclusivity.phase || { mode: "enforce", strategy: "highest" };

  enforceExclusiveGroup({
    groupId: "phase",
    matches: phaseLabels,
    mode: phaseCfg.mode,
    strategy: phaseCfg.strategy,
    orderFn: (a, b) => phaseNumber(a) - phaseNumber(b),
  });

  const finalPhase = phaseLabels.sort((a, b) => phaseNumber(a) - phaseNumber(b)).at(-1);
  if (finalPhase) {
    const expected = phaseMilestoneForLabel(finalPhase);
    if (!expected) {
      warn("phase.milestone.map", finalPhase);
    } else if (currentMilestone === expected) {
      pass("phase.milestone.match", expected);
    } else {
      ghIssueEditMilestone(repo, issueNumber, expected);
      result.actions.push({
        id: "issue.milestone.set",
        from: currentMilestone,
        to: expected,
        reason: `phase label ${finalPhase}`,
      });
      result.summary = `Milestone set to match ${finalPhase}`;
      pass("phase.milestone.enforced", expected);
    }
  }

  /* ───────── Priority Exclusivity ───────── */

  const priorities = labels.filter(l => l.startsWith("priority/"));
  const priorityOrder = ["priority/low", "priority/medium", "priority/high"];
  const priorityCfg = exclusivity.priority || { mode: "enforce" };

  enforceExclusiveGroup({
    groupId: "priority",
    matches: priorities,
    mode: priorityCfg.mode,
    orderFn: (a, b) =>
      priorityOrder.indexOf(a) - priorityOrder.indexOf(b),
  });

  /* ───────── Track Exclusivity ───────── */

  const tracks = labels.filter(l => l.startsWith("track/"));
  const trackCfg = exclusivity.track || { mode: "fail" };

  enforceExclusiveGroup({
    groupId: "track",
    matches: tracks,
    mode: trackCfg.mode,
  });

  /* ───────── State Exclusivity ───────── */

  const states = labels.filter(l => l.startsWith("state/"));
  const stateCfg = exclusivity.state || { mode: "enforce", terminal: [] };

  enforceExclusiveGroup({
    groupId: "state",
    matches: states,
    mode: stateCfg.mode,
    terminal: stateCfg.terminal || [],
  });
}

await main();

// Structured JSON only
process.stdout.write(JSON.stringify(result));
process.exit(result.ok ? 0 : 1);
