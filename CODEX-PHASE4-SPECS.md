# Codex Phase 4 Specs — Worker Coverage & Performance Optimization

**Generated:** 2026-02-23 12:16 UTC  
**Status:** Ready for execution after Phase 3 PR merge  
**Effort Estimate:** 3-4 hours total  
**Priority:** Execute in order

---

## Context

Phase 1: ✅ Bundle optimization (wallet-connect split, 609kB → 5 chunks <406kB)  
Phase 2: ✅ Quality hardening (worker tests, Playwright CI, lint baseline)  
Phase 3: 🔄 PR opening (validation + GitHub PR creation)  

**Phase 4:** Expand worker test coverage + lazy-load game features for further bundle reduction.

Current bundle status: **ALL PASS** (0 hard breaches, vendor-wallet = 351kB, feature-generator = 169kB, BigPulp = 98kB)

---

## 1. WORKER UNIT TESTS — CREDIT-TRACKER (High Priority)

**Why:** Largest untested worker (977 lines). Manages credit balances, transactions, state mutations. Critical for user economy.

### Target: `workers/credit-tracker/worker.ts`

**Lines:** 977  
**Purpose:** Tracks user credits across gameplay, battles, purchases, rewards.

### Test Structure

**File:** `tests/workers/credit-tracker.test.ts`

**Test Cases (8-10):**
```typescript
1. Happy path: user purchases credits, balance updates correctly
2. Transaction batching: multiple credits ops in one request, all applied
3. Concurrent requests: two balance updates simultaneously, no race conditions
4. Insufficient balance: attempt to spend >available, returns error
5. Reward calculation: quest/battle rewards compute correctly
6. Transaction history: ledger records all operations
7. Circuit breaker: failed credit service calls → graceful degradation
8. Rate limiting: max credits per day enforced (if applicable)
9. Refunds: refund logic reverses transactions cleanly
10. Validation: invalid amounts rejected (negative, NaN, etc.)
```

### Implementation Approach

1. Create `tests/workers/credit-tracker.test.ts`
2. Mock D1Database + credit service API
3. Use vitest
4. Test transaction state machine (pending → complete → settled)
5. Run: `npm run test:unit`

### Definition of Done
- ✅ 8+ test cases pass (0 failures)
- ✅ Coverage >65% for credit-tracker logic
- ✅ Committed to git
- ✅ `npm run test:unit` includes new tests

---

## 2. WORKER UNIT TESTS — FETCH-SALES (High Priority)

**Why:** Largest worker (1,611 lines). Complex NFT scraping logic. Mission-critical for game economy.

### Target: `workers/fetch-sales/worker.ts`

**Lines:** 1,611  
**Purpose:** Periodically scans blockchain for NFT sales, updates prices/metadata.

### Test Structure

**File:** `tests/workers/fetch-sales.test.ts`

**Test Cases (10-12):**
```typescript
1. Happy path: fetch sales from blockchain, update price index
2. Pagination: handle large result sets (>1000 items), batched processing
3. Blockchain errors: transient failures → retry, don't crash
4. Rate limiting: API call throttling respected (delay between calls)
5. Price calculation: aggregate sales → compute floor/average correctly
6. Metadata updates: NFT metadata from sales normalized + stored
7. Deduplication: duplicate sales in response handled cleanly
8. State persistence: prices saved to D1, retrievable on next run
9. Circuit breaker: >5 consecutive failures → abort, alert
10. Blockchain forking: reorg handling (price rollback) if needed
11. Empty results: graceful handling when no sales found
12. Data validation: invalid blockchain data rejected
```

### Implementation Approach

1. Create `tests/workers/fetch-sales.test.ts`
2. Mock blockchain API (Chia RPC / MintGarden API)
3. Create fixtures for 50-100 sample sales
4. Test batching logic (D1_BATCH_SIZE)
5. Run: `npm run test:unit`

### Definition of Done
- ✅ 10+ test cases pass (0 failures)
- ✅ Coverage >60% for fetch-sales core logic
- ✅ Committed to git
- ✅ `npm run test:unit` includes new tests

---

## 3. WORKER UNIT TESTS — CREDITS-ALERT & BATTLE-CRON (Medium Priority)

**Why:** Remaining workers. Credits-alert is small (218 lines), battle-cron is trivial (36 lines).

### Target: `workers/credits-alert/worker.ts` + `workers/battle-cron/worker.ts`

### Test Cases

**credits-alert** (5 tests):
- Happy path: low balance → alert triggered
- Threshold boundaries: at/below/above thresholds
- Notification channel delivery (email/SMS mock)
- Circuit breaker: failed notifications don't crash
- Stale user filtering: archived accounts skipped

**battle-cron** (3 tests):
- Happy path: call battle-resolve endpoint, get results
- Timeout handling: slow endpoint calls
- Error handling: 5xx from endpoint
- Result persistence: write battle results to D1

### Definition of Done
- ✅ 8 total tests (5 + 3) pass
- ✅ Both workers tested
- ✅ Committed to git

---

## 4. LAZY-LOAD GAME FEATURES (Reduce Bundle)

**Why:** Generator (169kB) + BigPulp (98kB) are loaded for all users. But most users only play 1-2 games. Lazy-load on-demand.

### Current Bundle Impact

- Main entry-index: 267kB
- Total unused game feature code per user: ~150-200kB (depends on games played)

### Optimization: Lazy-Load Routes

**File:** `src/games/GameLoader.tsx` (create or modify)

```typescript
// Before: import all games
import Generator from './Generator';
import BigPulp from './BigPulp';

// After: lazy-load on navigation
const Generator = lazy(() => import('./Generator'));
const BigPulp = lazy(() => import('./BigPulp'));

// Router wraps with Suspense
<Suspense fallback={<GameSkeleton />}>
  <Generator />
</Suspense>
```

### Changes Needed

1. **src/games/GameLoader.tsx** — Implement lazy-load with React.lazy + Suspense
2. **src/App.tsx** (or routing) — Wrap lazy-loaded game routes with Suspense
3. **src/components/GameSkeleton.tsx** — Create loading skeleton (minimal UI)
4. **tests/lazy-load.test.tsx** — Test that games load on demand, not on app init

### Expected Impact

- Initial bundle: 267kB → 220kB (reduce 47kB = 17% savings)
- Lazy chunks: Generator.async.js (169kB), BigPulp.async.js (98kB) loaded when needed
- User experience: Slight delay when entering game (usually <500ms with caching)

### Implementation Approach

1. Identify which games are heavy (169kB+) — Generator, BigPulp
2. Use `React.lazy()` for those games
3. Wrap routes with `Suspense` + GameSkeleton loading state
4. Test: Verify main bundle decreased, game still loads/plays
5. Smoke test: Game still responsive when lazy-loaded

### Definition of Done
- ✅ Generator + BigPulp lazy-loaded
- ✅ Main bundle reduced by 15-20% (estimated)
- ✅ No regression in game load time (<1s)
- ✅ Smoke tests pass (Playwright tests still pass)
- ✅ Committed to git

---

## 5. DOCUMENTATION: DEPLOYMENT & OPERATIONS GUIDE

**Why:** After 3 phases of optimization + testing, need runbook for launch + ongoing ops.

### File: `docs/DEPLOYMENT-GUIDE.md`

**Sections:**

1. **Pre-Launch Checklist**
   - All tests passing: `npm run test:unit` + `npm test` (Playwright)
   - Bundle validation: `npm run bundle:report` (0 hard breaches)
   - Bundle size baseline: Current = 3.9MB JS (tracked)
   - Security scan: `npm audit` (0 vulns)
   - Performance baseline: Lighthouse score documented

2. **Deployment Process**
   - Create GitHub release from main branch
   - Run final validation in CI
   - Deploy to production
   - Monitor: Error rates, bundle load times, worker health

3. **Post-Launch Monitoring**
   - Bundle size regression alerts (if >10% increase)
   - Worker health dashboard (did-indexer, credit-tracker, fetch-sales uptime)
   - Error rate monitoring (if >1% request errors)
   - User feedback channels

4. **Rollback Procedure**
   - If critical bug discovered: revert to previous release
   - Notification process for affected users
   - How to communicate delays

5. **Performance Targets**
   - Initial bundle load: <2s on 4G
   - Game interactivity: <500ms
   - Worker tasks: Complete within SLA (30min for did-indexer, etc.)

### Definition of Done
- ✅ Deployment guide created
- ✅ Pre-launch checklist documented
- ✅ Monitoring/rollback procedures defined
- ✅ Committed to git

---

## 6. PR MERGE & RELEASE PREP

**After Phase 4 is complete:**

1. **Merge Phase 3 PR** (if not auto-merged)
2. **Create release notes** summarizing all phases
3. **Build release package** (git tag + npm publish if applicable)
4. **Final smoke test** in production environment
5. **Announce launch** (changelog, user comms)

---

## Execution Priority

**Tier 1 (Ship-blocking):**
1. ✅ Credit-tracker tests (worker coverage)
2. ✅ Fetch-sales tests (worker coverage)
3. ✅ Lazy-load Generator + BigPulp (bundle reduction)

**Tier 2 (Polish):**
4. Credits-alert + battle-cron tests (nice-to-have)
5. Deployment guide documentation

**Time Budget: 3-4 hours**
- Worker tests: 1.5-2h
- Lazy-load: 1h
- Documentation: 30-45min

---

## How Codex Should Execute

```
For each task:
1. Read the section thoroughly
2. Implement code as described
3. Run tests/validation
4. Commit with clear message
5. Report back: "Credit-tracker tests ✅ 10/10 passing" etc.

BigP will monitor and advise if anything breaks.
```

---

## Success Metrics

- **Worker Coverage:** 6/6 workers tested (did-indexer + 5 others)
- **Bundle Reduction:** Main entry <220kB (from 267kB)
- **Documentation:** Deployment guide complete + reviewed
- **Zero Regressions:** All Phase 1-3 validations still passing
- **Ready for Launch:** Can deploy to production with confidence

---

**Phase 4 is the final stretch before launch. Execute cleanly. 🚀**
