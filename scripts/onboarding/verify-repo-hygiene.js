#!/usr/bin/env node

import { execSync } from "child_process";
import yaml from "yaml";

const repo = process.argv[2];
if (!repo) {
  console.error("Usage: verify-repo-hygiene <owner/repo>");
  process.exit(1);
}

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

/* Load config from GitHub */
const raw = run(
  `gh api repos/${repo}/contents/.github/task-assistant.yml --jq '.content'`
);
const config = yaml.parse(Buffer.from(raw, "base64").toString("utf8"));

/* Expected labels */
const expectedLabels = new Set([
  ...(config.tracks || []).map(t => t.label),
  ...(config.labels || []).map(l => l.name),
]);

/* Expected milestones */
const expectedMilestones = new Set(
  (config.milestones || []).map(m => m.title)
);

/* Actual state */
const actualLabels = new Set(
  JSON.parse(
    run(`gh label list --repo ${repo} --json name`)
  ).map(l => l.name)
);

const actualMilestones = new Set(
  JSON.parse(
    run(`gh api repos/${repo}/milestones`)
  ).map(m => m.title)
);

/* Verify */
for (const label of expectedLabels) {
  if (!actualLabels.has(label)) {
    console.error(`❌ Missing label: ${label}`);
    process.exit(1);
  }
}

for (const ms of expectedMilestones) {
  if (!actualMilestones.has(ms)) {
    console.error(`❌ Missing milestone: ${ms}`);
    process.exit(1);
  }
}

console.log("✓ Repository hygiene verified against config");
