import crypto from "crypto";
import jwt from "jsonwebtoken";
import { execSync } from "child_process";

function runJSON(cmd) {
  return JSON.parse(
    execSync(cmd, { stdio: ["ignore", "pipe", "inherit"] }).toString()
  );
}

export function getInstallationToken({ appId, privateKey, owner }) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId
  };

  const jwtToken = jwt.sign(payload, privateKey, {
    algorithm: "RS256"
  });

  // 1. Find installation for org
  const installations = runJSON(
    `curl -s -H "Authorization: Bearer ${jwtToken}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/app/installations`
  );

  const installation = installations.find(
    i => i.account?.login === owner
  );

  if (!installation) {
    throw new Error(`No Codex installation found for org: ${owner}`);
  }

  // 2. Create installation token
  const tokenResponse = runJSON(
    `curl -s -X POST \
      -H "Authorization: Bearer ${jwtToken}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/app/installations/${installation.id}/access_tokens`
  );

  return tokenResponse.token;
}
