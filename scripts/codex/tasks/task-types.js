/**
 * Codex Task Interface (Authoritative)
 *
 * Tasks:
 * - operate only on files in repoPath
 * - do not run git
 * - do not emit telemetry
 * - do not know about issues or PRs
 */

export /**
 * @typedef {Object} TaskContext
 * @property {string} repoPath
 * @property {{
 *   task: string,
 *   targets: string[],
 *   instructions: string[],
 *   constraints?: string[]
 * }} intent
 * @property {"apply"|"dry-run"} mode
 * @property {{
 *   readFile(path: string): string,
 *   writeFile(path: string, contents: string): void,
 *   listFiles(glob: string): string[],
 *   fileExists(path: string): boolean
 * }} utils
 */

/**
 * @typedef {Object} TaskResult
 * @property {boolean} changed
 * @property {string} summary
 * @property {string[]} filesTouched
 * @property {{
 *   commands?: string[],
 *   notes?: string[]
 * }} [validation]
 * @property {string[]} [warnings]
 * @property {string[]} [errors]
 */
