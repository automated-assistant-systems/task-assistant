#!/usr/bin/env node
/**
 * Task Assistant — Engine: Materialize Repo
 *
 * Wraps materialize-repo.impl.js in an engine-safe, telemetry-aware shell.
 */

import { execFileSync } from "child_process";
import fs from "fs";

const {
  TARGET_REPO,
  TELEMETRY_REPO,
  CORRELATION_ID,
} = process.env;

if (!TARGET_REPO || !TELEMETRY_REPO || !CORRELATION_ID) {
  console.error("Missing required engine environment variables");
  process.exit(1);
}

let output;
let ok = true;

try {
  output = execFileSync(
    "node",
    ["scripts/engines/materialize-repo.impl.js", TARGET_REPO, "--json"],
    { encoding: "utf8" }
  );
} catch (err) {
  output = err.stdout || "";
  ok = false;
}

fs.writeFileSync("result.json", output || "{}");

/* Emit telemetry using standard helper */
process.env.ENGINE_NAME = "materialize";
process.env.ENGINE_JOB  = "materialize";
process.env.RESULT_FILE = "result.json";

await import("../telemetry/emit-engine.js");

process.exit(ok ? 0 : 1);
