#!/usr/bin/env node
/**
 * Task Assistant — Engine: Materialize Repo
 *
 * Engine-safe wrapper that executes materialization
 * and emits telemetry via the canonical shell helper.
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

let output = "";
let ok = true;

/* ─────────────────────────────────────────────
   Run implementation
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   Emit telemetry (EXECUTE, do not import)
   ───────────────────────────────────────────── */

execFileSync(
  export CORRELATION_ID="${CORRELATION_ID:-$(date +%s)-$$}"
  "bash",
  ["scripts/telemetry/emit-engine.sh"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ENGINE_NAME: "materialize",
      ENGINE_JOB: "materialize",
      RESULT_FILE: "result.json",
    },
  }
);

process.exit(ok ? 0 : 1);
