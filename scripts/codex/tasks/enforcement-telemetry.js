// scripts/codex/tasks/enforcement-telemetry.js

const GITHUB_API = "https://api.github.com";

async function githubRequest({ method, url, token, body }) {
  const res = await fetch(`${GITHUB_API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `GitHub API error ${res.status}: ${text}`
    );
  }

  return res.json();
}

export async function run(context) {
  console.log("ENFORCEMENT TELEMETRY LOADED FROM:", import.meta.url);
  const telemetry = context.telemetry;
  const enforcementReport = context.enforcementReport;

  if (!telemetry) {
    throw new Error("enforcement-telemetry: telemetry missing from context");
  }
  if (!telemetry.generated_at) {
    throw new Error("enforcement-telemetry: telemetry.generated_at missing");
  }

  const token =
    process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error(
      "enforcement-telemetry: GITHUB_TOKEN is required"
    );
  }

  const telemetryRepo = process.env.TELEMETRY_REPO;
  if (!telemetryRepo) {
    throw new Error(
      "enforcement-telemetry: TELEMETRY_REPO is not configured"
    );
  }

  const [owner, repo] = telemetryRepo.split("/");
  if (!owner || !repo) {
    throw new Error(
      `enforcement-telemetry: invalid TELEMETRY_REPO value: ${telemetryRepo}`
    );
  }
  const date = telemetry.generated_at.slice(0, 10);
  const path =
    `enforcement-telemetry/v1/${date}/${telemetry.correlation_id}.jsonl`;

  // ── Build schema-v1 records ──
  const records = [];

  records.push({
    schema_version: "1.0",
    generated_at: telemetry.generated_at,
    correlation_id: telemetry.correlation_id,
    type: "enforcement.summary",
    repo: enforcementReport.repo,
    issue: enforcementReport.issue,
    actor: enforcementReport.actor,
    final_state: enforcementReport.final_state,
    checks_count: enforcementReport.checks.length,
    actions_count: enforcementReport.actions.length,
    notes: enforcementReport.notes,
  });

  for (const check of enforcementReport.checks) {
    records.push({
      schema_version: "1.0",
      generated_at: telemetry.generated_at,
      correlation_id: telemetry.correlation_id,
      type: "enforcement.check",
      repo: enforcementReport.repo,
      issue: enforcementReport.issue,
      check,
    });
  }

  for (const action of enforcementReport.actions) {
    records.push({
      schema_version: "1.0",
      generated_at: telemetry.generated_at,
      correlation_id: telemetry.correlation_id,
      type: "enforcement.action",
      repo: enforcementReport.repo,
      issue: enforcementReport.issue,
      action,
    });
  }

  const content =
    records.map(r => JSON.stringify(r)).join("\n") + "\n";
  const repoSlug = `${owner}/${repo}`;
  const url = `/repos/${repoSlug}/contents/${path}`;

  // ── Create file (no read / no append) ──
  await githubRequest({
    method: "PUT",
    url,
    token,
    body: {
      message:
        `telemetry(v1): enforcement ${enforcementReport.final_state} ` +
        `(${telemetry.correlation_id})`,
      content: Buffer.from(content).toString("base64"),
      branch: process.env.TELEMETRY_BRANCH || "main",
    },
  });

  return {
    status: "SUCCESS",
    records_emitted: records.length,
    path,
  };
}
