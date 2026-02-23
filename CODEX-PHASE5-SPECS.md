# Codex Phase 5 Specs — Final Launch Preparation

**Generated:** 2026-02-23 12:46 UTC  
**Status:** Ready for execution  
**Effort Estimate:** 2-3 hours total  
**Priority:** Execute in order

---

## Context

**Phase 1-4:** ✅ Complete
- Wallet-connect split (609kB → 5 chunks <406kB)
- Worker tests (credit-tracker, fetch-sales, did-indexer)
- Playwright smoke tests + GitHub Actions CI
- Lazy-load game features (17% bundle reduction)
- PR #14 open for review

**Phase 5:** Final pre-launch validation, documentation, monitoring setup, and launch readiness verification.

---

## 1. PERFORMANCE PROFILING & OPTIMIZATION (High Priority)

**Why:** Before launch, measure real performance metrics. Ensure bundle/load times meet user expectations.

### Task: Lighthouse Audit + Performance Report

**File:** `docs/PERFORMANCE-BASELINE.md`

**What to measure:**

1. **Bundle Performance**
   - Main entry size: (measure from bundle:report)
   - Lazy chunks: Generator, BigPulp, etc. (list all >50kB)
   - Total JS: (from bundle report)
   - Gzip size: (estimated 35% of raw)

2. **Page Load Metrics** (simulate 4G connection)
   - First Contentful Paint (FCP): target <2s
   - Largest Contentful Paint (LCP): target <3s
   - Time to Interactive (TTI): target <4s
   - Cumulative Layout Shift (CLS): target <0.1

3. **Interaction Performance**
   - Game canvas render time: target <500ms
   - Button click to response: target <100ms
   - Wallet connection flow: target <2s

### Implementation Approach

1. **Run Lighthouse locally:**
   ```bash
   npm run build
   npx lighthouse https://localhost:5173 \
     --output=json \
     --output-path=reports/lighthouse.json \
     --chrome-flags="--headless --disable-gpu --throttling-method=simulate"
   ```

2. **Manual performance testing:**
   - Open DevTools → Performance tab
   - Record game load + first interaction
   - Extract metrics: FCP, LCP, TTI, CLS
   - Document in PERFORMANCE-BASELINE.md

3. **Create baseline report:**
   ```markdown
   # Performance Baseline (2026-02-23)
   
   ## Bundle Metrics
   - Main bundle: XXX kB (gzipped: XXX kB)
   - Total JS: XXX kB
   - Lazy chunks: Generator (XXX kB), BigPulp (XXX kB)
   
   ## Page Load (4G Simulation)
   - FCP: XXX ms (target: <2000ms) ✅
   - LCP: XXX ms (target: <3000ms) ✅
   - TTI: XXX ms (target: <4000ms) ✅
   - CLS: X.XX (target: <0.1) ✅
   
   ## Game Interaction
   - Canvas render: XXX ms ✅
   - Button click response: XXX ms ✅
   - Wallet connection: XXX ms ✅
   ```

4. **Commit baseline:**
   ```bash
   git add docs/PERFORMANCE-BASELINE.md reports/lighthouse.json
   git commit -m "docs: add performance baseline for launch"
   ```

### Definition of Done
- ✅ Lighthouse audit run + saved to reports/
- ✅ PERFORMANCE-BASELINE.md created with metrics
- ✅ All metrics meet targets (or documented as "known limitation")
- ✅ Committed to git

---

## 2. LAUNCH READINESS CHECKLIST (High Priority)

**Why:** Ensure nothing is forgotten before going live.

**File:** `docs/LAUNCH-CHECKLIST.md`

**Sections:**

### Pre-Launch (24h before)
- [ ] PR #14 merged to main
- [ ] All tests passing: `npm run test:unit` (3993+ tests)
- [ ] All tests passing: `npm test` (Playwright smoke tests)
- [ ] Bundle valid: `npm run bundle:report` (0 hard breaches)
- [ ] Performance baseline documented
- [ ] Git tags created: `git tag v1.0.0-launch`

### Deployment (launch day)
- [ ] Create GitHub release from v1.0.0-launch tag
- [ ] Deploy to staging environment (test end-to-end)
  - [ ] User authentication works
  - [ ] Game load <2s
  - [ ] Wallet connection works
  - [ ] Worker tasks execute (did-indexer sample run)
- [ ] Final smoke test: visit https://staging.wojak.ink, play 1 game
- [ ] Deploy to production
  - [ ] Bundle deployed to CDN
  - [ ] API endpoints responding
  - [ ] Database migrations applied
  - [ ] Worker cron jobs enabled

### Post-Launch (first 24h)
- [ ] Monitor error rates (target: <1% requests)
- [ ] Monitor bundle load times (target: main <2s)
- [ ] Monitor worker health (target: 0 failures)
- [ ] Check user feedback channels (Discord, Twitter, support)
- [ ] If critical bug found: rollback to previous version

### Marketing / Communication
- [ ] Changelog written (what's new in v1.0.0)
- [ ] Launch announcement drafted (Twitter, Discord)
- [ ] User onboarding guide updated
- [ ] Known limitations documented (if any)

### Definition of Done
- ✅ LAUNCH-CHECKLIST.md created
- ✅ All checkboxes defined (ready to tick off on launch day)
- ✅ Committed to git

---

## 3. MONITORING SETUP (Medium Priority)

**Why:** After launch, need visibility into system health. Early warning of problems.

**File:** `docs/MONITORING-GUIDE.md`

**What to monitor:**

### Application Health
```
Metrics to track:
- API response time (target: <200ms p95)
- Error rate (target: <1%)
- Bundle load time (target: <2s p95)
- Worker task completion time (did-indexer, credit-tracker, fetch-sales)
- Database query latency (target: <50ms p95)
```

### Worker Health
```
did-indexer:
  - Last successful run timestamp
  - Run duration (target: <5min)
  - Failure count (target: 0)
  - NFT holdings synced count

credit-tracker:
  - Credits awarded (daily count)
  - Transaction success rate (target: 100%)
  - Database write latency

fetch-sales:
  - NFT prices updated (count per run)
  - API call success rate (target: >99%)
  - Price accuracy (sample 10 sales for correctness)
```

### Alerts to Set Up
```
- Error rate >5%: Page alert (escalate to ops)
- Bundle load time >3s: Warning (investigate CDN/network)
- Worker failure: Page alert (manual intervention needed)
- Database latency >100ms p95: Warning (may need optimization)
```

### Tools Recommended
- **Error tracking:** Sentry or LogRocket (already integrated?)
- **Metrics:** DataDog, New Relic, or CloudFlare Analytics
- **Uptime monitoring:** StatusPage or UptimeRobot
- **Logs:** CloudFlare Logpush or Supabase logs

### Implementation Approach

1. **Document current setup:**
   - What monitoring tools are already in place?
   - What metrics are being tracked?
   - What alerting is configured?

2. **Create monitoring dashboard template:**
   ```markdown
   # Real-Time Monitoring Dashboard
   
   ## API Health
   - Current error rate: [link to dashboard]
   - Response time p95: [link to dashboard]
   - Active users: [link to dashboard]
   
   ## Worker Health
   - did-indexer: last run 2026-02-23 12:15, duration 4m23s ✅
   - credit-tracker: last run 2026-02-23 12:00, duration 1m45s ✅
   - fetch-sales: last run 2026-02-23 12:30, duration 3m20s ✅
   
   ## Alerts
   - [None currently] ✅
   ```

3. **Document escalation procedure:**
   - Who to contact if error rate spikes
   - How to roll back if critical bug found
   - Who has database access for emergency queries

### Definition of Done
- ✅ MONITORING-GUIDE.md created
- ✅ Key metrics documented
- ✅ Alert thresholds defined
- ✅ Escalation procedure clear
- ✅ Committed to git

---

## 4. STAGING VALIDATION (Medium Priority)

**Why:** Before production, run final end-to-end test in staging environment (if available).

### Task: Staging Environment Checklist

**File:** `docs/STAGING-VALIDATION.md`

**Test Cases:**

1. **User Onboarding**
   - [ ] Create new account (Google, Discord, Clawbot)
   - [ ] Verify email confirmation works
   - [ ] Set username + avatar
   - [ ] Accept terms of service

2. **Game Loading**
   - [ ] Open free-mints page
   - [ ] Verify game canvas loads (<2s)
   - [ ] Verify no console errors
   - [ ] Play 1 game (any game)
   - [ ] Verify stats update (wins, losses, credits earned)

3. **Wallet Connection**
   - [ ] Click "Connect Wallet"
   - [ ] WalletConnect modal appears
   - [ ] Scan QR code (or use test wallet)
   - [ ] Verify wallet connected + address shown
   - [ ] Verify DID lookup works

4. **Credits & Economy**
   - [ ] Earn credits from 3 games
   - [ ] Verify credits display updates
   - [ ] Spend credits (if shop available)
   - [ ] Verify transaction succeeds

5. **Worker Tasks (manual trigger)**
   - [ ] did-indexer: manual run, NFT holdings updated
   - [ ] credit-tracker: verify credits awarded correctly
   - [ ] fetch-sales: verify NFT prices updated

6. **Performance Check**
   - [ ] Bundle load time: <2s (DevTools Network tab)
   - [ ] Game render time: <500ms (DevTools Performance tab)
   - [ ] No memory leaks (DevTools Memory tab, 5min gameplay)

7. **Error Handling**
   - [ ] Disconnect wallet, verify graceful error
   - [ ] Close browser, reopen, verify session persists
   - [ ] Simulate slow network (DevTools throttle to 4G), verify game playable

### Definition of Done
- ✅ All test cases pass in staging
- ✅ No console errors or warnings
- ✅ Performance meets targets
- ✅ STAGING-VALIDATION.md created + all checks marked done
- ✅ Committed to git

---

## 5. ROLLBACK PROCEDURE (Low Priority, but Important)

**Why:** If critical bug discovered post-launch, need quick rollback plan.

**File:** `docs/ROLLBACK-PROCEDURE.md`

**Sections:**

### When to Rollback
- Database corruption (data loss)
- Security vulnerability (user data at risk)
- Critical game-breaking bug (game unplayable for >10% users)
- Service unavailable (>30min outage)

### NOT a rollback scenario
- Minor UI bug (cosmetic)
- Single user affected by edge case
- Slow performance (optimize instead)

### Rollback Steps

1. **Identify issue & assess severity:**
   - Check error logs + user reports
   - Determine if rollback needed or hotfix faster
   - Decision: rollback or hotfix?

2. **If rollback needed:**
   ```bash
   # Find previous stable release tag
   git tag -l | grep "v1.0" | sort -V | tail -2
   # Output: v1.0.0-launch, v0.9.9-stable
   
   # Create rollback branch
   git checkout v0.9.9-stable
   git checkout -b rollback/v0.9.9-hotfix
   
   # Deploy from rollback branch
   # (deployment process here)
   
   # Tag the rollback
   git tag v1.0.1-rollback
   ```

3. **Communicate with users:**
   - Post status update (Twitter, Discord, statuspage)
   - Explain issue + timeline to resolution
   - Apologize for inconvenience

4. **Root cause analysis (post-incident):**
   - What was the bug?
   - Why did tests miss it?
   - How to prevent similar issues?
   - Document learnings

### Definition of Done
- ✅ ROLLBACK-PROCEDURE.md created
- ✅ Rollback steps documented clearly
- ✅ Communication templates provided
- ✅ Committed to git

---

## 6. FINAL DOCUMENTATION POLISH

**Why:** Launch day stress is high. Have all docs ready so nothing is improvised.

### Files to Review/Update

- [ ] **README.md** — Does it reflect v1.0.0 launch? Update if needed.
- [ ] **DEPLOYMENT-GUIDE.md** — Ensure production deployment steps are correct.
- [ ] **API.md** — If public API, ensure docs are complete.
- [ ] **TROUBLESHOOTING.md** — Common issues + fixes (create if missing).
- [ ] **SECURITY.md** — Disclosure policy + known vulns (if any).

### Definition of Done
- ✅ All docs reviewed + updated
- ✅ No broken links or outdated info
- ✅ Committed to git

---

## Execution Priority

**Tier 1 (Critical):**
1. ✅ Performance Profiling → establish baseline
2. ✅ Launch Readiness Checklist → ensure nothing forgotten
3. ✅ Staging Validation → verify everything works end-to-end

**Tier 2 (Important, but can be post-launch):**
4. Monitoring Setup → live observation + alerting
5. Rollback Procedure → emergency plan ready
6. Final Docs Polish → all docs up-to-date

**Time Budget: 2-3 hours**
- Performance: 45min
- Launch checklist: 30min
- Staging validation: 45min (manual testing)
- Monitoring: 30min
- Rollback + docs: 30-45min

---

## How Codex Should Execute

```
For each task:
1. Read the spec section thoroughly
2. Implement (run Lighthouse, create markdown docs, manual testing)
3. Verify results (all metrics captured, checklists complete)
4. Commit with clear message
5. Report back: "Performance baseline ✅ metrics captured" etc.

BigP will review and advise on any issues.
```

---

## Success Metrics

- **Performance:** Main bundle <220kB, FCP <2s, LCP <3s, TTI <4s
- **Readiness:** All pre-launch checklist items defined + ready to tick off
- **Validation:** Staging environment passed all 7 test case categories
- **Documentation:** All procedures documented clearly + findable
- **Confidence:** Team feels ready to launch with no loose ends

---

**Phase 5 is the final stretch. Execute cleanly. Launch day should feel calm because everything is prepared. 🚀**
