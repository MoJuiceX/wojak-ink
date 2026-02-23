# Codex Phase 2 Specs — Worker Tests, Playwright CI, & Lint Hardening

**Generated:** 2026-02-23 11:52 UTC  
**Status:** Ready for execution  
**Effort Estimate:** 2-3 hours total  
**Priority:** Execute in order

---

## 1. WORKER UNIT TESTS (did-indexer focus)

**Why:** 6 workers have 0% test coverage. did-indexer is mission-critical (NFT indexing for power levels).

### Target: `workers/did-indexer/worker.ts`
- **Lines:** ~630
- **Functions to test:**
  - `run()` — Main scheduled task entry point
  - `fetchMintGardenHoldings()` — API calls to MintGarden (paginated, rate-limited)
  - `updateHoldingsBatch()` — D1 database writes (batched)
  - `calculatePowerLevel()` — Power calculation logic
  - Error handling (circuit breaker, rate limit backoff)

### Test Structure

**File:** `workers/did-indexer/worker.test.ts`

```typescript
// Setup
- Mock D1Database (return fixtures for holdings, players)
- Mock fetch() for MintGarden API calls
- Create test player fixtures with known DID + holdings

// Test Cases
1. Happy path: fetch holdings, update DB, no regressions
2. Pagination: handle >50 pages safely (MAX_PAGES=50 limit enforced)
3. Rate limiting: 500ms delay between API calls (verify delays in mock clock)
4. Circuit breaker: ≥5 consecutive API failures → abort gracefully
5. Batch sizing: verify D1_BATCH_SIZE=25 respected in writes
6. Power level calculation: verify formula matches _powerLevel.ts constants
7. Error recovery: transient 500s from MintGarden → retry, don't crash
8. Staggered sync: PLAYERS_PER_RUN=5 per cron cycle enforced
```

### Implementation Approach

1. Create `tests/workers/did-indexer.test.ts`
2. Use `vitest` (already in devDependencies)
3. Mock D1 with simple in-memory Map (won't hit real DB)
4. Mock fetch() responses for MintGarden API
5. Verify state transitions (initial → fetched → updated)
6. Run: `npm run test:unit` (already in CI)

### Definition of Done
- ✅ 8 test cases pass (0 failures)
- ✅ Coverage >70% for did-indexer worker logic
- ✅ Test file committed to git
- ✅ `npm run test:unit` includes new tests automatically

---

## 2. PLAYWRIGHT SMOKE TEST WORKFLOW (CI + Manual)

**Why:** Unit tests catch logic bugs. Playwright catches integration breakages (wallet connect flow, game state, UI).

### Current Status
- Playwright is installed (`@playwright/test: ^1.58.0`)
- Config enforces non-prod safety: `TEST_BASE_URL` required for unattended runs
- Production blocked: `NIGHTSHIFT_UNATTENDED=1` + no `TEST_BASE_URL` = error

### New Workflow: `.github/workflows/smoke-test.yml`

**Trigger:** Manual dispatch (workflow_dispatch) — no CI auto-run yet

**Environment Setup:**
```yaml
jobs:
  smoke-test:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup node
      - npm ci
      - Start local dev server: npm run dev (on port 5173)
      - Run Playwright (wait for server): 
        npx playwright test --config=playwright.config.ts
        # TEST_BASE_URL=http://localhost:5173 (set explicitly)
      - Upload HTML report: reports/playwright-html-report
      - Artifact: playwright-test-results.json
```

### Smoke Test Cases (in `tests/smoke/*.spec.ts`)

Create 3 minimal smoke tests:

**1. Game Load & Auth** (`game-load.spec.ts`)
- Open free-mints page
- Verify game canvas loads (check for #game-container)
- Verify no console errors

**2. Wallet Connection** (`wallet-connect.spec.ts`)
- Open game
- Click "Connect Wallet" button
- Verify WalletConnect modal appears
- Modal renders without JS errors

**3. DID Lookup** (`did-lookup.spec.ts`)
- Open DID lookup page
- Enter test DID
- Verify API call succeeds
- Verify holdings display renders

### Implementation Approach

1. Create `.github/workflows/smoke-test.yml`
2. Create `tests/smoke/` directory with 3 spec files
3. Update `playwright.config.ts` to add `webServer` config (uncomment section, set port=5173)
4. Manual test locally: `npm run dev` + `npm test` (will use http://localhost:5173)
5. Commit workflow + tests
6. Codex can run manually in GitHub Actions dashboard

### Definition of Done
- ✅ Workflow file created and committed
- ✅ 3 smoke tests pass locally (http://localhost:5173)
- ✅ Workflow can be triggered manually in GitHub
- ✅ No prod runs (TEST_BASE_URL safety enforced)

---

## 3. BUNDLE REGRESSION DETECTION (Enhanced)

**Why:** You found wallet-connect hidden outside budgets. Need to catch ALL regressions automatically.

### Current Status
- ✅ wallet-connect chunks are now budgeted (all <406kB)
- ✅ bundle-budget-report.mjs tracks ~9 grouped assets
- ⚠️ Ungrouped orphaned chunks could still slip through

### New Enforcement

**File:** `scripts/bundle-budget-report.mjs`

Add section: "Orphaned Assets" (any .js file not in explicit groups)

```javascript
// After group budgets pass, check for ungrouped JS
const budgetedFiles = new Set([...allGroupedAssets.keys()]);
const orphans = allDistAssets.filter(f => !budgetedFiles.has(f));

if (orphans.length > 0) {
  console.warn(`⚠️  Orphaned JS files (not in budget groups):`);
  orphans.forEach(f => console.warn(`  ${f.file} (${f.sizeKb}kB)`));
  if (orphans.some(f => f.bytes > 406 * 1024)) {
    process.exit(1); // FAIL: orphan exceeds hard limit
  }
}
```

**CI Integration:** `npm run bundle:report` fails if any orphan >406kB

### Definition of Done
- ✅ bundle-budget-report.mjs detects orphaned chunks
- ✅ CI fails if any orphan >406kB
- ✅ Commit change to scripts/bundle-budget-report.mjs
- ✅ Verify locally: `npm run bundle:report` shows zero orphans

---

## 4. LINT DEBT HOTSPOTS (Baseline + Ignore Rules)

**Why:** Test suite is noisy (expected stderr noise). Need to separate real lint debt from false positives.

### Current State
- 0 lint errors ✅
- 0 lint warnings ✅ (in scoped mode)
- But: file-level noise (deprecation warnings, unused params in test mocks)

### Action: Create `.eslintignore-rules.json`

**File:** `scripts/lint-hotspots-baseline.json`

```json
{
  "ignorePatterns": [
    "*.test.ts",     // Test files are allowed to have unused mocks
    "*.spec.ts",
    "*.d.ts"         // Type definitions
  ],
  "topOffenders": [
    // Codex should identify these during scoped lint run
    // Store baseline so we can track regression
  ]
}
```

### Task for Codex

1. Run: `npx eslint src functions workers --ext .ts,.tsx,.js,.mjs,.cjs -f json | jq '.[] | select(.warningCount > 0) | {file, warnings: .warningCount}'`
2. Identify top 5 files with warnings
3. Document them in `reports/lint-hotspots-baseline.md`
4. Create .eslintignore-rules.json with baseline
5. Commit baseline (so future runs can diff against it)

### Definition of Done
- ✅ Baseline hotspots documented
- ✅ lint-hotspots-baseline.json committed
- ✅ Future lint runs can measure improvement

---

## 5. OTHER ASSET OPTIMIZATION (Optional, Time Permitting)

**Current Largest Non-Budgeted Assets:**
- `html2canvas.esm`: 196kB (used for screenshot features)
- `Generator.js`: 169kB (game feature, may be lazy-loadable)
- `BigPulp.js`: 98kB (game feature)

**If Time:** Could lazy-load game features (Generator, BigPulp) only when needed.
**But:** Lower ROI than worker tests/Playwright. **Skip for now.**

---

## Execution Order (Recommended)

1. **Worker tests** (1-1.5h) — Highest ROI (catches real regressions)
2. **Bundle orphan detection** (30m) — Low effort, high value
3. **Playwright smoke tests** (45m-1h) — Safety net for integration
4. **Lint baseline** (15m) — Hygiene task

**Checkpoint:** After #1-2, validate with full test suite + bundle report. Should still be green.

---

## How Codex Should Execute

```
For each spec:
1. Read the section carefully
2. Implement code as described
3. Run validation (npm run test:unit, npm run bundle:report, npm test --help)
4. Commit with clear message
5. Report back: "Worker tests ✅ 8/8 passing" etc.
6. Ask if you should proceed to next or skip

BigP will monitor and advise if anything breaks.
```

---

## Notes

- **Vitest** already installed (no new deps needed for worker tests)
- **Playwright** already installed + safe config
- No changes to main code logic — all test/CI infrastructure
- All changes are low-risk (non-blocking if one test fails)

**Go when ready.** 🚀
