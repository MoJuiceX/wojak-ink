# Nightshift Automation Guide (Current)

## Purpose

Nightshift is Wojak.ink's local overnight automation workflow for unattended maintenance on a **dedicated nightly git worktree/branch**.

It is not a CI service and not a deploy system. It is a scripted local runner with guardrails, reports, resume support, and an optional supervisor loop.

## What Runs Nightshift

### 1. Bootstrap (prepare safe nightly worktree)
- Script: `scripts/nightshift-bootstrap.sh`
- Creates:
  - a safe tag (default: `safe/<date>-pre-nightshift`)
  - a nightly branch (default: `codex/nightly/<date>-nightshift`)
  - a sibling worktree (default: `<repo>-nightshift`)
- Refuses to run unless current branch is `main` or `master` (unless you customize flow)
- Refuses dirty source worktree unless `--allow-dirty`

### 2. Runner (executes the task queue)
- Script: `scripts/nightshift.mjs`
- Reads:
  - queue: `.nightshift/tasks.json`
  - policy: `.nightshift/policy.json`
- Writes:
  - logs: `logs/nightshift-<timestamp>.log`
  - reports: `reports/nightshift-<timestamp>.md`
  - state: `.nightshift/state/nightshift-<timestamp>.json`

### 3. Supervisor (optional overnight loop)
- Script: `scripts/nightshift-supervisor.sh`
- Repeatedly runs the runner, pulls updates, writes heartbeat progress, and checkpoint-commits changes.
- This is where periodic `git pull` / checkpoint commits happen (not in `nightshift.mjs`).

## Actual Runtime Commands

From `package.json` (current):

```bash
npm run nightshift:bootstrap
npm run nightshift:dry-run
npm run nightshift:report
npm run nightshift:run
npm run nightshift:resume
```

Equivalent runner invocations:

```bash
node scripts/nightshift.mjs --dry-run
node scripts/nightshift.mjs --real --report-only --max-hours=8 --max-tasks=20 --soft-failures=5 --hard-failures=10
node scripts/nightshift.mjs --real --max-hours=8 --max-tasks=20 --soft-failures=5 --hard-failures=10
node scripts/nightshift.mjs --resume --real --max-hours=8 --max-tasks=20 --soft-failures=5 --hard-failures=10
```

## Queue + Policy (Source of Truth)

### Queue file: `.nightshift/tasks.json`
Current queue snapshot (2026-02-23):
- `queueName`: `night-1-bootstrap`
- `32` total tasks
- `30` enabled, `2` disabled
- `11` `report` tasks
- `19` `assistant_fix` tasks
- `2` `fix` tasks

Top-level structure:

```json
{
  "version": 1,
  "queueName": "night-1-bootstrap",
  "defaults": {
    "timeoutMs": 900000,
    "retries": 3
  },
  "tasks": [ ... ]
}
```

### Important task fields
- `id`, `title`
- `enabled`
- `category`, `risk`, `runtime`
- `mode`: `report` | `fix` | `assistant_fix`
- `mutatesCode`: boolean
- `dependsOn`: task IDs that must be `success` or `planned`
- `timeoutMs`, `retries`
- `commands`: shell commands (run sequentially)
- `failOnCommandError` (optional): report tasks are non-blocking unless this is `true`
- `disabledReason` (optional)

### Policy file: `.nightshift/policy.json`
Guardrails enforced by the runner include:
- required nightly branch naming pattern (`^codex/nightly/...$`)
- linked worktree requirement
- denied command patterns (deploys, destructive git commands, prod Playwright defaults, etc.)
- secret redaction patterns for logs/reports
- `safeE2E.allow: false` by default

## Runner Behavior (`scripts/nightshift.mjs`)

### Preflight checks (real mode)
Before a real run, the runner verifies:
- current branch matches policy regex
- execution is in a linked git worktree (not the main checkout)
- worktree metadata is captured in the report

If preflight fails in real mode, the run aborts.

### Task execution model
- Tasks run in queue order.
- Disabled tasks are recorded and skipped.
- Dependency-gated tasks are skipped until dependencies are satisfied.
- `--dry-run` marks tasks as `planned` and classifies commands against policy without executing them.
- `--real` executes commands and records status per command + per task.

### Non-blocking report tasks
For `mode: report` tasks:
- command failures are treated as `failed_nonblocking` by default
- task can still finish `success` with a note like `completed with N non-blocking command failure(s)`

This is why baseline/report tasks can succeed even with lint/build failures in excerpts.

### Retry + timeout behavior
- Defaults come from queue (`timeoutMs`, `retries`)
- Per-task overrides are supported
- Backoff sequence after failures:
  - retry 1 -> `5s`
  - retry 2 -> `15s`
  - retry 3+ -> `45s`

### Automatic report-only downgrade
When running in real mode:
- after `softFailures` threshold (default `5`), runner flips into report-only mode
- remaining mutating tasks (`mutatesCode: true`) are skipped
- non-mutating report tasks continue

This is a key safety feature and shows up as:
- `Report-only mode activated: yes`
- skipped mutating tasks with note: `mutating task skipped after soft failure threshold (report-only mode)`

### Resume behavior
`--resume` loads the latest state file from `.nightshift/state/` (or a provided `--state=` path) and continues unfinished queue items.

The state file is a single JSON document for the run, not a `state/latest/current.json` directory layout.

### Command templating tokens
Runner expands these tokens in commands:
- `{{RUN_ID}}`
- `{{LOG_PATH}}`
- `{{REPORT_PATH}}`
- `{{STATE_PATH}}`
- `{{REPO_ROOT}}`

### Output handling and redaction
- Child processes run with `NIGHTSHIFT_UNATTENDED=1`
- stdout/stderr are appended to the run log
- secrets are redacted using regex patterns from policy
- report excerpts are summarized (not full logs)
- unit-test excerpts suppress noisy passing-test `stderr |` headers in reports

## Supervisor Behavior (`scripts/nightshift-supervisor.sh`)

Use the supervisor when you want a full unattended overnight loop with periodic sync/checkpoints.

### What it does
- Verifies current branch matches `^codex/nightly/`
- Runs `node scripts/nightshift.mjs --real` in a loop
- `git pull --rebase --autostash` every `PULL_INTERVAL_SECONDS` (default `600`)
- Writes heartbeat summaries to `reports/supervisor-<timestamp>.md` every `HEARTBEAT_SECONDS` (default `1800`)
- Creates checkpoint commits (excluding logs/reports/state and operator note files)
- Attempts `git push` after each checkpoint (non-fatal if push fails)

### Key env overrides
- `MAX_HOURS` (default `8`)
- `PULL_INTERVAL_SECONDS` (default `600`)
- `HEARTBEAT_SECONDS` (default `1800`)
- `CYCLE_IDLE_SECONDS` (default `5`)

## Recommended Nightly Flow (Current)

1. From main checkout: `npm run nightshift:bootstrap`
2. In nightly worktree: `npm run nightshift:dry-run`
3. Review generated plan/report and queue toggles in `.nightshift/tasks.json`
4. Run a report-only real pass first: `npm run nightshift:report`
5. Enable only safe mutating tasks after baseline is green enough
6. Run `npm run nightshift:run` (or supervisor if unattended loop needed)
7. Review `reports/nightshift-*.md` and `logs/nightshift-*.log`
8. Resume with `npm run nightshift:resume` if interrupted

## Current Findings (Latest Nightshift Reports)

### Latest verified run snapshot
From `reports/nightshift-20260223-093950.md` (2026-02-23 09:39:50Z -> 09:45:27Z):
- Tasks attempted: `17`
- Succeeded: `11`
- Failed: `6`
- Skipped: `15`
- Report-only mode activated: `yes`

### What is passing in current reports
- `npx tsc --noEmit` passes in baseline/final validation tasks
- `npm run test:unit` passes (`129` files, `3971` tests)
- manifest validation passes with `Orphaned: 0`
- queue/report generation and policy enforcement are working

### What is currently blocking mutating progress
1. Assistant tasks fail immediately due CLI invocation mismatch
   - Queue commands still use legacy `codex --task '...'`
   - Reports show error: `unexpected argument '--task'`
   - Result: multiple `assistant_fix` tasks fail after retries and trigger report-only fallback

2. `security-upgrade-lodash` / `security-upgrade-swiper` validation fails on build
   - `npm install` + `npm audit` + `tsc` + unit tests succeed
   - `npm run build` fails due repo TS errors in current worktree state:
     - `src/components/gallery/NFTGridItem.tsx` unused vars (`imageLoaded`, `imageError`)
     - `src/utils/debounce.ts` TS2347 untyped function calls

3. Report tasks intentionally tolerate command failures
   - Lint/build failures can appear as `failed_nonblocking` while task status remains `success`
   - This is expected behavior for observability tasks, not a false positive

### Important timeline note
An earlier handoff summary (`nightshift-FINAL-SUMMARY.md`, generated around 2026-02-23 02:10 UTC) reports an all-green validation snapshot. Later reports on 2026-02-23 (including `09:24` and `09:39` UTC) show new failures in the current worktree state. Use the latest report for operational decisions.

## Monitoring / Debugging Commands

```bash
# newest nightshift report
ls -1t reports/nightshift-*.md | head -n 1

# inspect latest report summary
latest=$(ls -1t reports/nightshift-*.md | head -n 1)
sed -n '1,120p' "$latest"

# inspect latest state JSON
ls -1t .nightshift/state/nightshift-*.json | head -n 1

# inspect latest run log
ls -1t logs/nightshift-*.log | head -n 1

# check queue toggles quickly
rg -n '"id"|"enabled"|"mode"|"mutatesCode"' .nightshift/tasks.json
```

## Operational Recommendations

1. Fix current repo build blockers (`NFTGridItem.tsx`, `debounce.ts`) before enabling package-upgrade/fix tasks.
2. Migrate queue `assistant_fix` commands to the current Codex CLI invocation (`codex exec ...`) or validate/repair runner-side legacy normalization.
3. Keep `report` tasks first in queue (current ordering is good) so failures produce diagnostics before mutating tasks are attempted.
4. Use `npm run nightshift:report` after any queue/policy edits to verify policy classification and command syntax before unattended runs.
5. Use supervisor only on a branch you are comfortable auto-checkpointing/pushing, since it commits and attempts pushes each cycle.

## Related Docs
- `docs/NIGHTSHIFT-RUNBOOK.md` - operator checklist / quick procedure
- `docs/NIGHTSHIFT-CHECKS.md` - safe command matrix and runtimes
- `nightshift-FINAL-SUMMARY.md` - earlier all-green handoff snapshot (superseded by later reports for current-state truth)
