# Night Shift Runbook

## Purpose
Run a safe unattended maintenance/reliability session on a dedicated nightly branch/worktree.

## Guardrails
- Run only from a dedicated nightly worktree branch (e.g. `codex/nightly/2026-02-22-nightshift`)
- Never push directly to `main`/`master`
- No deploys, no migrations, no destructive commands
- No prod Playwright runs by default
- Secrets are redacted in logs/reports
- Stop after max hours, max tasks, or hard failure threshold

## Typical flow
1. Create safe tag on `main`
2. Create isolated worktree + nightly branch
3. Run dry-run:
   - `npm run nightshift:dry-run`
4. Review generated report and planned queue
5. Enable/disable tasks in `.nightshift/tasks.json`
6. Run real mode:
   - `npm run nightshift:run`
7. Review `/reports/nightshift-<timestamp>.md`
8. Open PR(s) manually after reviewing diffs and checks

## Commands
- Dry run (default):
  - `node scripts/nightshift.mjs --dry-run`
- Real mode (safe defaults):
  - `node scripts/nightshift.mjs --real --max-hours=8 --max-tasks=20 --soft-failures=5 --hard-failures=10`
- Resume latest unfinished run:
  - `node scripts/nightshift.mjs --resume --real`

## Recommended machine setup for overnight
- Keep machine awake and plugged in
- Keep lid open (if laptop)
- Stable network connection
- Avoid reboots/OS updates during run

## Artifacts
- Logs: `logs/nightshift-<timestamp>.log`
- Summary report: `reports/nightshift-<timestamp>.md`
- State: `.nightshift/state/nightshift-<timestamp>.json`

## Notes for Night 1
- Most mutating tasks are intentionally disabled until the dry-run report is reviewed
- Prioritize baseline checks and reports before enabling fixes
