import "dotenv/config";

/**
 * Environment configuration for the Task Assistant GitHub App.
 *
 * Responsibilities:
 * - GitHub App authentication (App ID + private key)
 * - Webhook verification
 * - Runtime configuration
 */

export interface AppEnv {
  // GitHub App credentials
  GITHUB_APP_ID: number;
  GITHUB_APP_PRIVATE_KEY: string;

  // Webhook security
  GITHUB_WEBHOOK_SECRET: string;

  // Runtime
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
}

/**
 * Load and validate environment variables.
 * Fails fast with clear, actionable errors.
 */
export function loadEnv(): AppEnv {
  const {
    APP_ID,
    PRIVATE_KEY,
    WEBHOOK_SECRET,
    PORT,
    NODE_ENV,
  } = process.env;

  if (!APP_ID) {
    throw new Error("Missing APP_ID (GitHub App ID)");
  }

  if (!PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY (GitHub App private key)");
  }

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing WEBHOOK_SECRET (GitHub webhook secret)");
  }

  const parsedAppId = Number(APP_ID);
  if (!Number.isInteger(parsedAppId)) {
    throw new Error("APP_ID must be a valid integer");
  }

  const parsedPort = PORT ? Number(PORT) : 3000;
  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error("PORT must be a valid positive number");
  }

  const env = (NODE_ENV ?? "production") as AppEnv["NODE_ENV"];
  if (!["development", "production", "test"].includes(env)) {
    throw new Error(
      "NODE_ENV must be one of: development | production | test"
    );
  }

  return {
    GITHUB_APP_ID: parsedAppId,
    GITHUB_APP_PRIVATE_KEY: PRIVATE_KEY,
    GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET,
    PORT: parsedPort,
    NODE_ENV: env,
  };
}
