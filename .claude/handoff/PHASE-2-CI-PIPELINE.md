# Phase 2: GitHub Actions CI Pipeline

## What This Is

You are adding a CI pipeline to wojak.ink. Currently there is **no build validation on push or PR**. Someone can push broken TypeScript and it deploys. You will create a single GitHub Actions workflow that runs on every push and PR.

## Before You Start

1. Read `CLAUDE.md` for project conventions
2. Read `package.json` for existing scripts — the relevant ones are:
   - `npm run build` — `tsc -b && vite build` (typecheck + build)
   - `npm run lint` — `eslint .`
   - `npm run test:unit` — `vitest run`
3. Read `.github/workflows/credits-reconcile.yml` for workflow style reference
4. Read `.github/workflows/daily-sales-update.yml` for workflow style reference

## Tech Stack

- GitHub Actions
- Node 20 (match the Cloudflare Workers runtime)
- npm (not yarn or pnpm)
- Vite + TypeScript + ESLint + Vitest

## What to Build

Use `/brainstorm` to explore the approach, then `/write-plan`, then `/execute-plan`.

### Single Workflow File: `.github/workflows/ci.yml`

**Triggers:**
- `push` to `main` branch
- `pull_request` to `main` branch

**Jobs (run in sequence — each depends on previous):**

1. **Typecheck** — `npx tsc --noEmit`
   - Catches TypeScript errors without building
   - Fast (30-60 seconds)

2. **Lint** — `npm run lint`
   - Catches ESLint violations
   - Fast (15-30 seconds)

3. **Unit Tests** — `npm run test:unit`
   - Runs Vitest test suite
   - Currently 4 tests, will grow after Phase 1

4. **Build** — `npm run build`
   - Full production build (tsc -b + vite build)
   - Confirms the app actually compiles
   - Slowest step (~2-3 minutes)

**Environment:**
- `runs-on: ubuntu-latest`
- Node 20 via `actions/setup-node@v4`
- Cache npm dependencies via `actions/cache@v4` with `~/.npm` path and `hashFiles('**/package-lock.json')` key

### Workflow Template

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Lint
        run: npm run lint
      - name: Unit Tests
        run: npm run test:unit
      - name: Build
        run: npm run build
```

Keep it as a single job with sequential steps (not parallel jobs). This is simpler, avoids duplicating `npm ci`, and the total time is under 5 minutes.

## What NOT to Do

- Do NOT add Playwright E2E tests to CI (they need a running server + browser)
- Do NOT add deployment steps (Cloudflare Pages handles that via git push)
- Do NOT add secrets or environment variables (this is just validation)
- Do NOT create multiple workflow files — one file, one job
- Do NOT add branch protection rules (that's a GitHub settings thing, not code)
- Do NOT modify any source code — this is just the workflow file

## Constraints

- The workflow file goes in `.github/workflows/ci.yml`
- Use Node 20 to match Cloudflare Workers runtime
- Use `npm ci` (not `npm install`) for deterministic installs
- The build may produce warnings — that's fine. Only fail on errors.
- If `npm run lint` fails due to existing violations, note what they are and move on. Do NOT fix lint errors in this phase — just document them.
