#!/usr/bin/env node

import fs from "fs";

const file = process.argv[2];

if (!file) {
  console.error("Usage: pretty-json <file.json>");
  process.exit(1);
}

try {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  console.log(JSON.stringify(parsed, null, 2));
} catch (err) {
  console.error(`❌ Failed to parse JSON: ${err.message}`);
  process.exit(1);
}
