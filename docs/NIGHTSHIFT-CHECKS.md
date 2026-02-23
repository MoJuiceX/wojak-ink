# Night Shift Checks Matrix

## Purpose
Quick reference for which commands are safe to run unattended, how long they usually take, and what artifacts they produce.

## Fast checks (run frequently)
| Command | Typical runtime | Risk | Produces | Notes |
|---|---:|---|---|---|
| `npx tsc --noEmit` | `< 1 min` | low | terminal/log output | Fast compile/type safety check |
| `npm run lint:scoped -- --quiet` | `~10-30s` | low | terminal/log output | Errors only; good gate before commits |
| `node scripts/verify-manifest-assets.mjs` | `< 5s` | low | terminal/log output | Now excludes intentional non-manifest assets |

## Medium checks (nightly baseline)
| Command | Typical runtime | Risk | Produces | Notes |
|---|---:|---|---|---|
| `npm run test:unit` | `~6-10s` | low | test output, logs | Current baseline: `129` files / `3971` tests |
| `npm audit --omit=dev --json` | `< 10s` | low | JSON output | Use report mode unless patching dependencies |
| `npm run build` | `~10-30s` | low | `dist/`, chunk output | Includes manifest verification + type build + Vite build |
| `npx eslint src functions workers tests scripts --ext .ts,.tsx,.js,.mjs,.cjs` | `~20-40s` | low | warnings/errors | Use for hotspot reporting, not commit gating |

## Slow/risky checks (guarded)
| Command | Typical runtime | Risk | Produces | Notes |
|---|---:|---|---|---|
| `npm test` (Playwright) | variable | medium | e2e results | Guarded: do not hit prod by default |
| `wrangler *` write/deploy commands | variable | high | infra changes | Blocked by Night Shift policy |
| migrations / DB write scripts | variable | high | schema/data changes | Blocked unless explicitly approved |

## Recommended Night Shift order
1. Preflight snapshot (`git status`, branch/worktree checks)
2. Fast checks (`tsc`, scoped lint errors)
3. Nightly baseline (`unit`, `audit`, `build`)
4. Report tasks (lint hotspots, bundle/chunk review, issue snapshot)
5. Safe fixes (only after reports are cleanly understood)

## Artifact paths
- Logs: `logs/nightshift-<timestamp>.log`
- Reports: `reports/nightshift-<timestamp>.md`
- Run state: `.nightshift/state/nightshift-<timestamp>.json`
