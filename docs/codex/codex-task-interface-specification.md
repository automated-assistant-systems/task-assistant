Codex Task Interface Specification (Authoritative)

This defines how all Codex tasks behave — now and in the future — across code, repos, docs, configs, and books.

1. Core Design Principles

Every Codex task MUST:

Be capability-based, not issue-based

Be deterministic

Be side-effect scoped (only touch declared targets)

Not perform Git operations

Not emit telemetry directly

Not know about issues, PRs, or GitHub

All orchestration happens outside the task.

2. Execution Flow (Canonical)
Issue opened
   ↓
codex/run.js
   ├─ authenticate (GitHub App)
   ├─ parse issue intent
   ├─ create branch
   ├─ checkout branch
   ├─ dispatch task
   ├─ run validation
   ├─ commit changes
   ├─ open PR
   └─ emit telemetry


Tasks only participate in one box:

dispatch task

3. Task Interface (Required Contract)

Every task module must export one function with the following signature:

export async function runTask(context: TaskContext): TaskResult;

4. TaskContext (Input Contract)
interface TaskContext {
  /** Absolute path to repo working tree */
  repoPath: string;

  /** Structured intent extracted from issue */
  intent: {
    task: string;                 // e.g. "repo.prepare"
    targets: string[];            // file paths or globs
    instructions: string[];       // declarative changes
    constraints?: string[];       // optional guardrails
  };

  /** Execution mode */
  mode: "apply" | "dry-run";

  /** Utilities provided by Codex */
  utils: {
    readFile(path: string): string;
    writeFile(path: string, contents: string): void;
    listFiles(glob: string): string[];
    fileExists(path: string): boolean;
  };
}

Important Notes

No shell execution

No Git commands

No network calls

No environment variable dependency

This keeps tasks:

testable

reviewable

sandbox-safe

5. TaskResult (Output Contract)
interface TaskResult {
  /** Whether changes were made */
  changed: boolean;

  /** Human-readable summary */
  summary: string;

  /** Files modified */
  filesTouched: string[];

  /** Validation hints for runner */
  validation?: {
    commands?: string[];   // e.g. ["node scripts/prepare-repo.js --dry-run"]
    notes?: string[];
  };

  /** Non-fatal warnings */
  warnings?: string[];

  /** Fatal errors */
  errors?: string[];
}


Codex runner uses this to decide:

Commit or abort

PR or comment-only

SUCCESS / PARTIAL / FAILED telemetry

6. Canonical Task Categories

These are stable capabilities — not per-issue scripts.

A. Repo Preparation Tasks
scripts/codex/tasks/repo-prepare.js


Purpose

Modify repo management tooling

Enhance enforcement / telemetry

Adjust repo preparation logic

Typical targets

scripts/prepare-repo.js

.github/task-assistant.yml

config schemas

Example instructions

“add telemetry for config validation failures”

“fix pagination for labels and milestones”

B. Code Modification Tasks
scripts/codex/tasks/code-modify.js


Purpose

Refactor or enhance application code

Fix bugs

Introduce features

Typical targets

scripts/**/*.js

src/**/*

C. Docs / Schema Tasks
scripts/codex/tasks/docs-modify.js


Purpose

Update documentation

Maintain schemas

Ensure consistency

Typical targets

docs/**/*.md

schema files

D. Content / Book Tasks (Future)
scripts/codex/tasks/content-format.js


Purpose

Reformat chapters

Normalize structure

Apply style guides

7. Example: repo-prepare.js Task (Concrete)
export async function runTask({ repoPath, intent, utils }) {
  const file = `${repoPath}/scripts/prepare-repo.js`;

  let source = utils.readFile(file);
  let changed = false;

  if (intent.instructions.includes("add telemetry")) {
    source = addTelemetryHooks(source);
    changed = true;
  }

  if (intent.instructions.includes("fix pagination")) {
    source = fixPagination(source);
    changed = true;
  }

  if (changed) {
    utils.writeFile(file, source);
  }

  return {
    changed,
    summary: "Enhanced prepare-repo with telemetry and pagination fixes",
    filesTouched: changed ? [file] : [],
    validation: {
      commands: ["node scripts/prepare-repo.js --dry-run"],
    },
  };
}

8. Why This Model Is Correct (Phase 3 Test)

This design satisfies every Phase 3 rule:

✅ Deterministic

✅ Observable

✅ Reviewable

✅ Marketplace-safe

✅ No hidden side effects

✅ No magic behavior

✅ Extensible to Phase 4+

It also mirrors how senior engineers actually work:

Read intent

Modify code

Validate

Submit PR

9. Immediate Next Steps (Recommended)

To move forward cleanly:

Create scripts/codex/tasks/repo-prepare.js (empty scaffold)

Patch codex/run.js to:

Parse intent

Dispatch to task

Use Issue #32 as the first real execution

Validate → PR → merge

