# Codex Phase 6 Specs — Pre-Launch Final Validations & Polish

**Generated:** 2026-02-23 12:48 UTC  
**Status:** Ready for execution after Phase 5 completes  
**Effort Estimate:** 2-3 hours total  
**Priority:** Execute in order

---

## Context

**Phase 1-5:** ✅ In flight
- All optimization, testing, and docs complete
- Performance baselines established
- Launch checklist defined
- PR #14 ready for merge

**Phase 6:** Final pre-launch validations, security hardening, and operational readiness.

---

## 1. SECURITY AUDIT & DEPENDENCY CHECK (High Priority)

**Why:** Before launch, ensure no known vulnerabilities or outdated dependencies.

### Task 1A: Vulnerability Scan

**File:** `docs/SECURITY-AUDIT.md`

**Steps:**

1. **Run npm audit:**
   ```bash
   npm audit --omit=dev --json > /tmp/audit.json
   cat /tmp/audit.json | jq '.metadata.vulnerabilities'
   ```
   Expected: 0 vulnerabilities (or document known ones with mitigation)

2. **Check outdated packages:**
   ```bash
   npm outdated
   ```
   Document: which packages are outdated, which are safe to upgrade, which should stay locked

3. **Review critical dependencies:**
   - React version (locked? why?)
   - Vite version (latest stable)
   - TypeScript version (latest stable)
   - Testing libraries (vitest, Playwright)
   - Auth libraries (OAuth, session management)
   - Blockchain libraries (Chia RPC clients)

4. **Create security audit report:**
   ```markdown
   # Security Audit (2026-02-23)
   
   ## Vulnerability Status
   - Total vulns: 0 ✅
   - Critical: 0 ✅
   - High: 0 ✅
   
   ## Dependency Health
   - React 19.1.0 (up-to-date)
   - Vite 6.2.0 (latest stable)
   - TypeScript 5.4.0 (latest stable)
   - Vitest 1.6.0 (latest stable)
   
   ## Known Risks
   - (none) ✅
   
   ## Recommendations
   - Check for deprecated APIs quarterly
   - Automate security audits in CI
   ```

5. **Commit:**
   ```bash
   git add docs/SECURITY-AUDIT.md
   git commit -m "docs: security audit for launch"
   ```

### Definition of Done
- ✅ npm audit run + results documented
- ✅ No critical/high vulnerabilities (or mitigated)
- ✅ Outdated packages identified + decisions made
- ✅ Security audit report created + committed

---

## 2. ACCESSIBILITY AUDIT (Medium Priority)

**Why:** Launch product should be usable by everyone. WCAG compliance is good practice + legal requirement in some regions.

### Task 2A: Automated A11y Check

**File:** `docs/ACCESSIBILITY-REPORT.md`

**Steps:**

1. **Run axe accessibility scan:**
   ```bash
   npm install -D @axe-core/playwright --save-dev
   # Create tests/a11y.test.ts
   ```

2. **Test cases to add:**
   ```typescript
   // tests/a11y.test.ts
   test('home page has no accessibility violations', async ({ page }) => {
     await page.goto('http://localhost:5173');
     const violations = await axe(page);
     expect(violations).toHaveLength(0);
   });
   
   test('game page has no accessibility violations', async ({ page }) => {
     await page.goto('http://localhost:5173/games/generator');
     const violations = await axe(page);
     expect(violations).toHaveLength(0);
   });
   ```

3. **Manual checks:**
   - [ ] Keyboard navigation: Can you tab through all buttons/inputs?
   - [ ] Focus indicators: Are focused elements visually distinct?
   - [ ] Color contrast: Use WebAIM contrast checker on all text
   - [ ] Screen reader: Test with NVDA/JAWS (if Windows) or VoiceOver (Mac)
   - [ ] Image alt text: All images have meaningful alt text
   - [ ] Form labels: All inputs have associated labels
   - [ ] Error messages: Clear + associated with field

4. **Create A11y report:**
   ```markdown
   # Accessibility Report (2026-02-23)
   
   ## Automated Violations
   - Total: 0 ✅
   
   ## Manual Audit
   - Keyboard navigation: ✅ All interactive elements reachable
   - Focus indicators: ✅ Clear visual focus states
   - Color contrast: ✅ WCAG AA compliant
   - Screen reader: ✅ VoiceOver tested, descriptive labels
   - Images: ✅ All have alt text
   - Forms: ✅ All labeled
   - Errors: ✅ Linked to fields
   
   ## WCAG Compliance
   - Level A: ✅ Pass
   - Level AA: ✅ Pass
   - Level AAA: ⚠️ Not tested (nice-to-have)
   ```

5. **Commit:**
   ```bash
   git add docs/ACCESSIBILITY-REPORT.md tests/a11y.test.ts
   git commit -m "feat: accessibility audit + automated a11y tests"
   ```

### Definition of Done
- ✅ Automated a11y tests pass
- ✅ Manual a11y checks documented
- ✅ No critical accessibility issues
- ✅ WCAG AA compliance verified
- ✅ A11y report + tests committed

---

## 3. ANALYTICS & ERROR TRACKING SETUP (High Priority)

**Why:** Post-launch, need data on user behavior + error rates.

### Task 3A: Analytics Integration

**Current Status Check:**
- Is Google Analytics installed? (`npm grep "gtag"`)
- Is Sentry/LogRocket installed? (`npm ls @sentry/`)
- Are worker events being tracked?

**Steps:**

1. **Verify Google Analytics:**
   ```bash
   # Should see gtag in index.html or _app.tsx
   grep -r "gtag\|ga\(" src/ | head -5
   ```

2. **Verify error tracking (Sentry):**
   ```bash
   # Check if Sentry is initialized
   grep -r "Sentry.init\|import.*Sentry" src/ | head -3
   ```

3. **Create analytics tracking plan:**
   ```markdown
   # Analytics Setup (2026-02-23)
   
   ## Google Analytics
   - Installed: ✅ (gtag in index.html)
   - Events tracked:
     - Page views (automatic)
     - Game starts
     - Game completions
     - Wallet connections
     - Errors (automatic via Sentry)
   
   ## Sentry Error Tracking
   - Installed: ✅ (initialized in main.tsx)
   - Environment: production
   - Release: v1.0.0-launch
   - Events: All JS errors auto-captured
   - Breadcrumbs: User interactions tracked
   
   ## Custom Events
   - credit_earned: { amount, game, timestamp }
   - wallet_connected: { provider, success, error }
   - nft_minted: { collection, count }
   
   ## Dashboard
   - Grafana: [dashboard URL]
   - Sentry: [project URL]
   - GA: [property URL]
   ```

4. **Add launch tag to error tracking:**
   ```bash
   # Add to main.tsx (if Sentry)
   Sentry.captureMessage('App launched v1.0.0', 'info');
   ```

5. **Commit:**
   ```bash
   git add docs/ANALYTICS-SETUP.md
   git commit -m "docs: analytics & error tracking configuration"
   ```

### Definition of Done
- ✅ Google Analytics verified + working
- ✅ Sentry/error tracking verified + working
- ✅ Custom events defined
- ✅ Launch tag set
- ✅ Analytics setup doc created + committed

---

## 4. RATE LIMITING & DDoS PROTECTION (Medium Priority)

**Why:** Prevent abuse + API overload on launch day (high traffic spike expected).

### Task 4A: Rate Limiting Configuration

**File:** `docs/RATE-LIMITING-POLICY.md`

**Steps:**

1. **Define rate limits:**
   ```
   API Endpoints:
   - /api/auth/*: 10 requests/min per IP
   - /api/games/*: 100 requests/min per user
   - /api/wallet/*: 5 requests/min per user (WalletConnect is slow)
   - /api/credits/*: 50 requests/min per user
   - /api/workers/* (admin): 1 request per scheduled time
   
   WebSocket:
   - Game connections: 1 per user
   - Message rate: 10 messages/sec per connection
   ```

2. **Check if rate limiting is implemented:**
   ```bash
   # Look for express-rate-limit or similar
   npm ls | grep rate
   grep -r "rateLimit\|RateLimit" src/ functions/
   ```

3. **If not implemented, create plan:**
   ```markdown
   # Rate Limiting Strategy
   
   ## Implementation
   - Framework: express-rate-limit (or Cloudflare rate limiting)
   - Store: Redis (or in-memory for testing)
   
   ## Endpoints Protected
   - Authentication: 10 req/min per IP
   - Game API: 100 req/min per user
   - Wallet: 5 req/min per user
   
   ## Monitoring
   - Alert if >50% of requests rate-limited
   - Track by endpoint + user + IP
   ```

4. **DDoS Protection (Cloudflare):**
   - Check: Is Cloudflare enabled on domain?
   - Verify: DDoS mitigation rules active
   - Document: Cloudflare zone settings

5. **Commit:**
   ```bash
   git add docs/RATE-LIMITING-POLICY.md
   git commit -m "docs: rate limiting & DDoS protection policy"
   ```

### Definition of Done
- ✅ Rate limits defined per endpoint
- ✅ Implementation verified or planned
- ✅ DDoS protection configured
- ✅ Rate limiting doc created + committed

---

## 5. DATABASE BACKUP & RECOVERY (Medium Priority)

**Why:** If something goes wrong post-launch, need way to restore data.

### Task 5A: Backup Procedures

**File:** `docs/DATABASE-BACKUP-PLAN.md`

**Steps:**

1. **Current backup status:**
   - Does D1 (Cloudflare) have auto-backups? (Yes, hourly)
   - Are exports being stored? (Check S3 or similar)
   - Recovery time objective (RTO): how fast can we restore?
   - Recovery point objective (RPO): how much data loss acceptable?

2. **Create backup plan:**
   ```markdown
   # Database Backup & Recovery
   
   ## Current Setup
   - Database: Cloudflare D1 (SQLite)
   - Auto-backups: Every 1 hour ✅
   - Retention: 7 days ✅
   - Storage: Cloudflare backup system
   
   ## Manual Backups (daily)
   - Export D1 data: `wrangler d1 execute <db> --remote --file backup.sql`
   - Upload to S3: `aws s3 cp backup.sql s3://backups/`
   - Verify: Restore from backup file to test
   
   ## Recovery Procedure
   - Identified data loss: [timestamp]
   - Restore from backup: `wrangler d1 restore <db> --file backup-YYYY-MM-DD.sql`
   - Verify: Run critical queries
   - Notify users: "Data restored from [timestamp]"
   
   ## Disaster Recovery Plan
   - If D1 down: Switch to backup DB (manual failover)
   - If data corrupted: Restore from backup, re-run workers
   - If transaction log lost: Manual reconciliation from blockchain
   ```

3. **Test backup restoration:**
   - Create test database
   - Restore from backup file
   - Verify data integrity
   - Document time to restore (target: <1 hour)

4. **Commit:**
   ```bash
   git add docs/DATABASE-BACKUP-PLAN.md
   git commit -m "docs: database backup & disaster recovery procedures"
   ```

### Definition of Done
- ✅ Current backup status verified
- ✅ Backup procedures documented
- ✅ Recovery procedures tested
- ✅ RTO/RPO defined
- ✅ Backup plan doc created + committed

---

## 6. LOAD TESTING SIMULATION (Low Priority, but Good to Have)

**Why:** Ensure infrastructure can handle launch day traffic spike.

### Task 6A: Simple Load Test

**File:** `docs/LOAD-TEST-RESULTS.md`

**Steps:**

1. **Simple load test (can use free tools):**
   ```bash
   # Install artillery (load testing tool)
   npm install -D artillery
   
   # Create load test config: artillery.yml
   config:
     target: "http://localhost:5173"
     phases:
       - duration: 60
         arrivalRate: 10  # 10 users/sec
       - duration: 120
         arrivalRate: 50  # ramp up to 50 users/sec
   
   scenarios:
     - name: "User Game Flow"
       flow:
         - get: /
         - get: /games/generator
         - think: 5  # think time between requests
   
   # Run: artillery run artillery.yml
   ```

2. **Collect metrics:**
   - Response times (p50, p95, p99)
   - Error rate (target: <1%)
   - Throughput (requests/sec)
   - Memory usage (target: <1GB)

3. **Document results:**
   ```markdown
   # Load Test Results
   
   ## Test Scenario
   - Duration: 180s
   - Peak load: 50 users/sec
   - Total requests: 9,000
   
   ## Metrics
   - p50 latency: 45ms ✅
   - p95 latency: 120ms ✅
   - p99 latency: 250ms ✅
   - Error rate: 0% ✅
   - Throughput: 50 req/s ✅
   - Memory: 512MB ✅
   
   ## Conclusion
   - Infrastructure can handle 50 concurrent users
   - Expected launch traffic: 100-200 users (estimate)
   - Recommendation: Monitor closely on day 1, scale if needed
   ```

4. **Commit:**
   ```bash
   git add docs/LOAD-TEST-RESULTS.md
   git commit -m "docs: load testing results & capacity planning"
   ```

### Definition of Done
- ✅ Load test executed
- ✅ Metrics captured (latency, error rate, throughput)
- ✅ Results analyzed
- ✅ Capacity plan documented

---

## 7. FINAL CODE REVIEW & QA SIGNOFF (High Priority)

**Why:** Before merge, ensure code meets quality standards.

### Task 7A: Code Review Checklist

**File:** `docs/CODE-REVIEW-CHECKLIST.md`

**Steps:**

1. **Manual code review:**
   - [ ] All Phase 1-5 changes reviewed
   - [ ] No console.log() left in production code
   - [ ] No TODO/FIXME comments blocking launch
   - [ ] No hardcoded credentials (API keys, passwords)
   - [ ] No commented-out code (clean)
   - [ ] Error handling is comprehensive
   - [ ] Type safety: all TypeScript strict checks pass

2. **Automated checks:**
   ```bash
   # Already passing, but verify:
   npm run test:unit          # All 3993+ tests pass ✅
   npm test                   # Playwright smoke tests pass ✅
   npm run bundle:report      # Bundle validation passes ✅
   npx tsc --noEmit           # Type check passes ✅
   npx eslint src/            # Lint passes ✅
   ```

3. **QA Checklist:**
   - [ ] Game loads & renders correctly
   - [ ] No memory leaks (DevTools Memory tab)
   - [ ] Wallet connection works
   - [ ] Credits earned + stored correctly
   - [ ] Workers execute without errors
   - [ ] Mobile responsiveness tested (iPhone/Android)
   - [ ] Performance targets met

4. **Create code review report:**
   ```markdown
   # Code Review & QA Signoff
   
   ## Manual Review
   - ✅ All Phase 1-5 code reviewed
   - ✅ No security issues found
   - ✅ No hardcoded credentials
   - ✅ Error handling comprehensive
   - ✅ Type safety verified
   
   ## Automated Checks
   - ✅ 3993+ unit tests passing
   - ✅ Playwright smoke tests passing
   - ✅ Bundle validation passing
   - ✅ TypeScript strict mode passing
   - ✅ ESLint clean
   
   ## QA Testing
   - ✅ Game functionality verified
   - ✅ Wallet integration verified
   - ✅ Mobile responsive verified
   - ✅ Performance targets met
   
   ## Signoff
   - Code Quality: ✅ APPROVED
   - Testing: ✅ APPROVED
   - Security: ✅ APPROVED
   - Ready for Production: ✅ YES
   
   Reviewed by: Codex + BigP
   Date: 2026-02-23
   ```

5. **Commit:**
   ```bash
   git add docs/CODE-REVIEW-CHECKLIST.md
   git commit -m "docs: code review & QA signoff"
   ```

### Definition of Done
- ✅ Manual code review complete
- ✅ All automated checks passing
- ✅ QA testing complete
- ✅ Code review report created + signed off
- ✅ No blockers identified

---

## Execution Priority

**Tier 1 (Critical):**
1. Security audit → ensure no vulnerabilities
2. Final code review & QA → ensure quality
3. Rate limiting → protect infrastructure

**Tier 2 (Important):**
4. Analytics setup → track user behavior post-launch
5. Database backups → disaster recovery ready

**Tier 3 (Nice-to-Have):**
6. A11y audit → good practice
7. Load testing → capacity planning

**Time Budget: 2-3 hours**
- Security audit: 30min
- A11y audit: 30min
- Analytics setup: 15min
- Rate limiting: 30min
- Database backup: 30min
- Load testing: 20min
- Code review: 45min

---

## How Codex Should Execute

```
For each task:
1. Read the spec section thoroughly
2. Run commands / execute checks
3. Create markdown reports + documentation
4. Verify results (pass/fail, metrics, signoff)
5. Commit with clear message
6. Report back: "Security audit ✅ 0 vulns" etc.

BigP will review and advise on any issues.
```

---

## Success Metrics

- **Security:** 0 critical/high vulnerabilities
- **Quality:** All automated tests passing, manual review complete, QA signed off
- **Infrastructure:** Rate limiting configured, backups verified, DDoS protection active
- **Observability:** Analytics + error tracking live + tested
- **Confidence:** Team has zero blockers remaining before production merge

---

**Phase 6 is final polish before launch. Execute thoroughly. Every detail matters. 🚀**
