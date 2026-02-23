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
1. Bootstrap safe tag + isolated worktree + nightly branch
   - From `main`: `npm run nightshift:bootstrap`
3. Run dry-run:
   - `npm run nightshift:dry-run`
4. Review generated report and planned queue
5. Optional: run report-only real mode first (executes only non-mutating tasks)
   - `npm run nightshift:report`
6. Enable/disable tasks in `.nightshift/tasks.json`
7. Run real mode:
   - `npm run nightshift:run`
8. Review `/reports/nightshift-<timestamp>.md`
9. Open PR(s) manually after reviewing diffs and checks

## Commands
- Bootstrap (run from `main` checkout):
  - `bash scripts/nightshift-bootstrap.sh`
- Dry run (default):
  - `node scripts/nightshift.mjs --dry-run`
- Report-only real mode (skips mutating tasks):
  - `node scripts/nightshift.mjs --real --report-only --max-hours=8 --max-tasks=20 --soft-failures=5 --hard-failures=10`
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

## References
- Checks matrix: `docs/NIGHTSHIFT-CHECKS.md`

## Notes for Night 1
- Most mutating tasks are intentionally disabled until the dry-run report is reviewed
- Prioritize baseline checks and reports before enabling fixes
