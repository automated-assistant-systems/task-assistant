#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import yaml from "yaml";

/* ──────────────────────────────
   CLI args
   ────────────────────────────── */
const args = process.argv.slice(2);
const repo = args.find(a => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!repo) {
  console.error("Usage: prepare-repo <owner/repo> [--dry-run]");
  process.exit(1);
}

/* ──────────────────────────────
   Command helpers
   ────────────────────────────── */
const runRead = (cmd) => {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
};

const runWrite = (cmd) => {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return "";
  }
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
};

/* ──────────────────────────────
   Banner
   ────────────────────────────── */
console.log("\nTask Assistant Repo Preparation");
console.log(`Repo: ${repo}`);
console.log(`Mode: ${dryRun ? "DRY-RUN" : "APPLY"}\n`);

/* ──────────────────────────────
   Clone repo to temp dir
   ────────────────────────────── */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ta-prep-"));
runRead(`gh repo clone ${repo} ${tmpDir}`);

const configPath = path.join(tmpDir, ".github", "task-assistant.yml");
if (!fs.existsSync(configPath)) {
  throw new Error("Missing .github/task-assistant.yml");
}

const config = yaml.parse(fs.readFileSync(configPath, "utf8"));

/* ──────────────────────────────
   Labels
   ────────────────────────────── */
const existingLabels = JSON.parse(
  runRead(`gh label list --repo ${repo} --json name`) || "[]"
).map(l => l.name);

const trackLabels = (config.tracks || []).map(t => t.label);

const systemLabels = [
  "state/stale",
  "state/pinned",
  "priority/high",
  "priority/medium",
  "priority/low"
];

const requiredLabels = [...new Set([...trackLabels, ...systemLabels])];

const createdLabels = [];
const skippedLabels = [];

for (const label of requiredLabels) {
  if (existingLabels.includes(label)) {
    skippedLabels.push(label);
  } else {
    runWrite(`gh label create "${label}" --repo ${repo}`);
    createdLabels.push(label);
  }
}

/* ──────────────────────────────
   Milestones (STRICT / DECLARATIVE)
   ────────────────────────────── */
const [owner, repoName] = repo.split("/");

const desiredMilestones = Array.isArray(config.milestones)
  ? config.milestones
  : [];

if (!Array.isArray(config.milestones)) {
  console.warn("No milestone definitions found; skipping milestone creation");
}

const existingMilestones = JSON.parse(
  runRead(`gh api repos/${owner}/${repoName}/milestones --paginate`) || "[]"
);

const existingTitles = new Set(existingMilestones.map(m => m.title));

const createdMilestones = [];
const skippedMilestones = [];

for (const m of desiredMilestones) {
  if (!m.id || !m.title || m.due_offset_days == null) {
    console.warn(
      `Skipping invalid milestone (missing id/title/due_offset_days): ${m.title || "unknown"}`
    );
    continue;
  }

  if (existingTitles.has(m.title)) {
    skippedMilestones.push(m.id);
    console.log(`Milestone exists: ${m.title}`);
    continue;
  }

  const dueDate = new Date(
    Date.now() + m.due_offset_days * 24 * 60 * 60 * 1000
  ).toISOString();

  runWrite(
    `gh api repos/${owner}/${repoName}/milestones ` +
    `-f title="${m.title}" ` +
    `-f description="${m.description || ""}" ` +
    `-f due_on="${dueDate}"`
  );

  createdMilestones.push(m.id);
}

/* ──────────────────────────────
   Summary
   ────────────────────────────── */
console.log("\nPreparation Summary");

if (createdLabels.length) {
  console.log("Created labels:");
  createdLabels.forEach(l => console.log(`  - ${l}`));
}
if (skippedLabels.length) {
  console.log("Existing labels:");
  skippedLabels.forEach(l => console.log(`  - ${l}`));
}

if (createdMilestones.length) {
  console.log("Created milestones:");
  createdMilestones.forEach(m => console.log(`  - ${m}`));
}
if (skippedMilestones.length) {
  console.log("Existing milestones:");
  skippedMilestones.forEach(m => console.log(`  - ${m}`));
}

console.log("\nRepo preparation complete.");
if (dryRun) {
  console.log("\nDRY-RUN: No changes were made.");
}

/* ──────────────────────────────
   Cleanup
   ────────────────────────────── */
fs.rmSync(tmpDir, { recursive: true, force: true });
