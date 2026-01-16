#!/usr/bin/env node
/**
 * Task Assistant — Telemetry Registry Validator
 *
 * Phase: 3.4
 * Classification:
 * - Schema violations → BLOCKED
 * - Empty but valid → PARTIAL
 */

import fs from "fs";
import path from "path";
import Ajv from "ajv";

const args = process.argv.slice(2);
const registryPath = args[0];

if (!registryPath) {
  console.error(
    "Usage: validate-registry.js <path-to-telemetry-registry.json>"
  );
  process.exit(1);
}

if (!fs.existsSync(registryPath)) {
  console.error(`[registry] Registry not found: ${registryPath}`);
  process.exit(1);
}

const schemaPath = path.resolve(
  process.cwd(),
  "schemas/telemetry-registry.schema.json"
);

if (!fs.existsSync(schemaPath)) {
  console.error("[registry] Schema file missing");
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const ok = validate(registry);

const result = {
  tool: "registry-validator",
  version: "1.0",
  ok,
  summary: "",
  errors: [],
};

if (!ok) {
  result.summary = "Registry schema violation";
  result.errors = validate.errors.map(e => ({
    path: e.instancePath,
    message: e.message,
  }));

  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

// Semantic checks (non-schema)
if (registry.orgs.length === 0) {
  result.summary = "Registry is valid but empty";
  console.warn(JSON.stringify(result, null, 2));
  process.exit(0);
}

result.summary = "Registry is valid";
console.log(JSON.stringify(result, null, 2));
process.exit(0);
