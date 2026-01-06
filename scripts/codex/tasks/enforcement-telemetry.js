// scripts/codex/tasks/enforcement-telemetry.js

export async function run({ octokit, telemetry, enforcementReport }) {
  if (!octokit) {
    throw new Error("enforcement-telemetry: octokit is required");
  }
  if (!telemetry?.correlation_id || !telemetry?.generated_at) {
    throw new Error("enforcement-telemetry: invalid telemetry context");
  }
  if (!enforcementReport?.final_state) {
    throw new Error("enforcement-telemetry: missing enforcementReport");
  }

  const telemetryRepo = process.env.TELEMETRY_REPO;
  if (!telemetryRepo) {
    throw new Error("TELEMETRY_REPO is not configured");
  }

  const [owner, repo] = telemetryRepo.split("/");
  const date = telemetry.generated_at.slice(0, 10);
  const path =
    `enforcement-telemetry/v1/${date}/${telemetry.correlation_id}.jsonl`;

  // ── Build schema-v1 records (inline, deterministic) ──

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

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message:
      `telemetry(v1): enforcement ${enforcementReport.final_state} ` +
      `(${telemetry.correlation_id})`,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
  });

  return {
    status: "SUCCESS",
    records_emitted: records.length,
    path,
  };
}
