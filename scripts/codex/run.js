#!/usr/bin/env node
/* eslint-disable no-console */

import process from "process";
import { execSync } from "child_process";

/**
 * Minimal Codex runner stub.
 * Purpose:
 * - Prove Codex execution loop end-to-end
 * - Comment back on the triggering issue
 * - Establish a stable entrypoint for future logic
 */

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].replace(/^--/, "");
      args[key] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function requireArg(name, value) {
  if (!value) {
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
}

const args = parseArgs(process.argv.slice(2));

const repo = args.repo;
const issueNumber = args.issue;
const telemetryRepo = args["telemetry-repo"] || "(not configured)";

requireArg("repo", repo);
requireArg("issue", issueNumber);

console.log("Codex runner stub starting");
console.log(`Repo: ${repo}`);
console.log(`Issue: #${issueNumber}`);
console.log(`Telemetry repo: ${telemetryRepo}`);

// Comment back on the issue to confirm execution
try {
  execSync(
    `gh issue comment ${issueNumber} --repo ${repo} --body "🤖 **Codex execution stub reached successfully.**\n\nThis confirms:\n- Codex GitHub App is installed\n- Supervisor workflow executed\n- Runner entrypoint is wired correctly\n\nNext step: implement real Codex behavior."`,
    { stdio: "inherit" }
  );
} catch (err) {
  console.error("Failed to post issue comment");
  console.error(err.message);
  process.exit(1);
}

console.log("Codex runner stub completed successfully");
process.exit(0);
