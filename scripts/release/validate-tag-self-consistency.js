#!/usr/bin/env node
/**
 * Task Assistant — Tag Self-Consistency Validator (v1.0)
 *
 * Enforces that a release tag (e.g. v0.3.5) is internally consistent:
 *  - dispatch passes engine_ref == tag
 *  - dispatch uses engine workflow refs pinned to @tag
 *  - engine workflows accept engine_ref and checkout Task Assistant at inputs.engine_ref
 *
 * Usage:
 *   node scripts/release/validate-tag-self-consistency.js --ref v0.3.5
 *
 * Env:
 *   DISPATCH_PATH (default .github/workflows/task-assistant-dispatch.yml)
 *   ENGINE_GLOB   (default .github/workflows/engine-*.yml)
 */

import fs from "fs";
import path from "path";
import yaml from "yaml";

function dieJson(obj, code) {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
  process.exit(code);
}

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function isObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ref") out.ref = argv[++i];
    else if (a === "--dispatch") out.dispatch = argv[++i];
    else if (a === "--engines") out.engines = argv[++i];
    else if (a === "--json") out.json = true;
  }
  return out;
}

function extractUsesRef(usesStr) {
  // "org/repo/path@ref"
  const at = usesStr.lastIndexOf("@");
  if (at === -1) return null;
  return usesStr.slice(at + 1).trim();
}

function globEngineFiles(rootDir, engineGlob) {
  // Minimal glob: supports ".github/workflows/engine-*.yml" only.
  // If you need more patterns, replace with a dependency later.
  if (!engineGlob.endsWith("engine-*.yml")) {
    throw new Error(`Unsupported ENGINE_GLOB pattern: ${engineGlob}`);
  }

  const dir = path.join(rootDir, path.dirname(engineGlob));
  const prefix = "engine-";
  const suffix = ".yml";

  return fs
    .readdirSync(dir)
    .filter(f => f.startsWith(prefix) && f.endsWith(suffix))
    .map(f => path.join(dir, f));
}

function validateDispatch({ dispatchPath, expectedRef }) {
  const errors = [];
  const warnings = [];

  const doc = yaml.parse(readFile(dispatchPath));
  if (!isObject(doc)) {
    errors.push(`Dispatch is not a YAML object: ${dispatchPath}`);
    return { errors, warnings };
  }

  const jobs = doc.jobs;
  if (!isObject(jobs)) {
    errors.push(`Dispatch missing jobs: ${dispatchPath}`);
    return { errors, warnings };
  }

  for (const [jobId, job] of Object.entries(jobs)) {
    if (!isObject(job) || typeof job.uses !== "string") continue;

    // Only validate Task Assistant reusable workflow calls
    if (!job.uses.includes("automated-assistant-systems/task-assistant/.github/workflows/engine-")) continue;

    const usesRef = extractUsesRef(job.uses);
    if (!usesRef) {
      errors.push(`Dispatch job '${jobId}' missing @ref in uses: ${job.uses}`);
    } else if (usesRef !== expectedRef) {
      errors.push(`Dispatch job '${jobId}' uses @${usesRef} but expected @${expectedRef}`);
    }

    const withBlock = job.with;
    if (!isObject(withBlock)) {
      errors.push(`Dispatch job '${jobId}' missing 'with:' block (must pass engine_ref)`);
      continue;
    }

    if (!("engine_ref" in withBlock)) {
      errors.push(`Dispatch job '${jobId}' missing with.engine_ref`);
      continue;
    }

    const engineRef = withBlock.engine_ref;
    if (engineRef !== expectedRef) {
      errors.push(
        `Dispatch job '${jobId}' with.engine_ref is '${engineRef}' but expected '${expectedRef}'`
      );
    }

    // Light sanity: ensure it’s not using github.ref_name for tag validation
    if (typeof engineRef === "string" && engineRef.includes("github.ref_name")) {
      warnings.push(`Dispatch job '${jobId}' engine_ref uses github.ref_name; prefer literal tag pinning for releases.`);
    }
  }

  return { errors, warnings };
}

function validateEngineWorkflow({ enginePath }) {
  const errors = [];
  const warnings = [];

  const doc = yaml.parse(readFile(enginePath));
  if (!isObject(doc)) {
    errors.push(`Engine workflow is not a YAML object: ${enginePath}`);
    return { errors, warnings };
  }

  // Validate workflow_call inputs include engine_ref
  const onBlock = doc.on;
  const wfCall = isObject(onBlock) ? onBlock.workflow_call : null;

  if (!isObject(wfCall) || !isObject(wfCall.inputs)) {
    errors.push(`Engine missing on.workflow_call.inputs: ${enginePath}`);
    return { errors, warnings };
  }

  const inputs = wfCall.inputs;
  if (!isObject(inputs.engine_ref)) {
    errors.push(`Engine missing workflow_call.inputs.engine_ref: ${enginePath}`);
  } else {
    if (inputs.engine_ref.required !== true) {
      errors.push(`Engine workflow_call.inputs.engine_ref.required must be true: ${enginePath}`);
    }
    if (inputs.engine_ref.type !== "string") {
      errors.push(`Engine workflow_call.inputs.engine_ref.type must be string: ${enginePath}`);
    }
  }

  // Validate checkout of Task Assistant uses ref: ${{ inputs.engine_ref }}
  const jobs = doc.jobs;
  if (!isObject(jobs)) {
    errors.push(`Engine missing jobs: ${enginePath}`);
    return { errors, warnings };
  }

  let foundTA = false;

  for (const job of Object.values(jobs)) {
    if (!isObject(job) || !Array.isArray(job.steps)) continue;

    for (const step of job.steps) {
      if (!isObject(step)) continue;
      if (step.uses !== "actions/checkout@v4") continue;
      if (!isObject(step.with)) continue;

      const repo = step.with.repository;
      if (repo !== "automated-assistant-systems/task-assistant") continue;

      foundTA = true;

      const ref = step.with.ref;
      if (!ref) {
        errors.push(`Engine checkout missing with.ref for Task Assistant: ${enginePath}`);
      } else if (ref !== "${{ inputs.engine_ref }}") {
        errors.push(`Engine checkout ref must be '\${{ inputs.engine_ref }}' (found '${ref}') in: ${enginePath}`);
      }
    }
  }

  if (!foundTA) {
    warnings.push(`Engine did not checkout Task Assistant explicitly (ok only if it runs in-repo): ${enginePath}`);
  }

  return { errors, warnings };
}

function main() {
  const args = parseArgs(process.argv);

  const expectedRef =
    args.ref ||
    process.env.GITHUB_REF_NAME ||
    "";

  if (!expectedRef) {
    dieJson(
      { ok: false, summary: "Missing expected ref. Use --ref <tag>." },
      2
    );
  }

  // Hard rule: this validator is intended for tag pins
  const semverTagPattern =
    /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

  if (!semverTagPattern.test(expectedRef)) {
    dieJson(
      {
        ok: false,
        summary: `Ref '${expectedRef}' is not a valid semver tag (vX.Y.Z or prerelease).`,
        details: { expectedRef }
      },
      2
    );
  }

  const root = process.cwd();
  const dispatchPath = path.resolve(root, args.dispatch || process.env.DISPATCH_PATH || ".github/workflows/task-assistant-dispatch.yml");
  const engineGlob = args.engines || process.env.ENGINE_GLOB || ".github/workflows/engine-*.yml";

  const errors = [];
  const warnings = [];

  if (!fs.existsSync(dispatchPath)) {
    errors.push(`Dispatch file not found: ${dispatchPath}`);
  } else {
    const r = validateDispatch({ dispatchPath, expectedRef });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  let engineFiles = [];
  try {
    engineFiles = globEngineFiles(root, engineGlob);
  } catch (e) {
    errors.push(e.message);
  }

  for (const f of engineFiles) {
    const r = validateEngineWorkflow({ enginePath: f });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  const ok = errors.length === 0;

  dieJson(
    {
      ok,
      summary: ok
        ? `Tag self-consistency passed for ${expectedRef}`
        : `Tag self-consistency failed for ${expectedRef}`,
      expected_ref: expectedRef,
      dispatch: path.relative(root, dispatchPath),
      engines_checked: engineFiles.map(f => path.relative(root, f)).sort(),
      errors,
      warnings
    },
    ok ? 0 : 1
  );
}

main();
