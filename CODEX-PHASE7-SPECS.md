# Codex Phase 7 Specs — Deployment & Launch Execution

**Generated:** 2026-02-23 12:51 UTC  
**Status:** Ready for execution after Phase 6 completes  
**Effort Estimate:** 2-4 hours total  
**Priority:** Execute in order (day-of-launch operations)

---

## Context

**Phase 1-6:** ✅ Complete
- All optimization, testing, docs, security, and validations done
- PR #14 ready for merge
- Launch readiness verified
- All systems green

**Phase 7:** Final deployment execution, go-live operations, and post-launch support.

---

## 1. FINAL PRE-DEPLOYMENT VERIFICATION (Critical)

**Why:** Last chance to catch any issues before production goes live.

### Task 1A: Final Git State Verification

**File:** `docs/DEPLOYMENT-LOG.md`

**Steps:**

1. **Verify git state:**
   ```bash
   # All commits pushed?
   git status
   # Expected: "Your branch is up to date with 'origin/...'"
   
   # Latest version clean?
   git log --oneline -1
   # Should show latest Phase 5/6 docs commit
   
   # Tag the release:
   git tag -a v1.0.0 -m "Launch release: wallet-connect split + Phase 2-6 hardening"
   git push origin v1.0.0
   ```

2. **Verify all tests passing one final time:**
   ```bash
   npm run test:unit           # 3993+ tests ✅
   npm test                    # Playwright smoke tests ✅
   npm run bundle:report       # Bundle validation ✅
   npx tsc --noEmit            # Type safety ✅
   npx eslint src/             # Lint ✅
   ```

3. **Create deployment log:**
   ```markdown
   # Deployment Log (2026-02-23)
   
   ## Pre-Deployment Verification
   - [ ] Git status: clean (all pushed)
   - [ ] Version tag: v1.0.0 created + pushed
   - [ ] All tests: passing (3993+ unit, 21 smoke, 38 worker tests)
   - [ ] Bundle: validated (0 hard breaches)
   - [ ] Type safety: passing
   - [ ] Lint: clean
   - [ ] Timestamp: 2026-02-23 13:00 UTC
   
   ## Deployment Ready: ✅ YES
   ```

4. **Commit:**
   ```bash
   git add docs/DEPLOYMENT-LOG.md
   git commit -m "docs: deployment log - pre-deployment verification complete"
   ```

### Definition of Done
- ✅ Git state verified + release tag created
- ✅ All tests passing one final time
- ✅ Deployment log created + signed off
- ✅ Ready to proceed to production deployment

---

## 2. PRODUCTION DEPLOYMENT CHECKLIST (Critical)

**Why:** Ensure deployment is executed step-by-step without mistakes.

### Task 2A: Staged Deployment

**File:** `docs/DEPLOYMENT-PROCEDURE.md`

**Steps (execute in order on launch day):**

#### **Stage 1: Pre-Deployment (T-30min)**

1. **Notify operations team:**
   - [ ] Deployment in progress (post to Slack/Discord)
   - [ ] Expected downtime: [0-5 min estimated]
   - [ ] Rollback ready: yes

2. **Final database backup:**
   ```bash
   # Backup current production DB
   wrangler d1 export production > /tmp/backup-pre-launch.sql
   aws s3 cp /tmp/backup-pre-launch.sql s3://backups/
   ```

3. **Verify current production state:**
   ```bash
   # Health check: API responding
   curl https://api.wojak.ink/health
   # Expected: { "status": "ok" }
   ```

#### **Stage 2: Deploy to Staging (T-20min)**

1. **Deploy to staging environment:**
   ```bash
   # Build production bundle
   npm run build
   
   # Deploy staging
   npm run deploy:staging
   # or: wrangler deploy --env staging
   ```

2. **Run smoke tests on staging:**
   ```bash
   # Set target URL to staging
   TEST_BASE_URL=https://staging.wojak.ink npm test
   
   # Expected: All tests pass ✅
   ```

3. **Manual verification on staging:**
   - [ ] Visit https://staging.wojak.ink
   - [ ] Create test account (Google/Discord)
   - [ ] Play 1 game
   - [ ] Connect wallet
   - [ ] Earn credits
   - [ ] Verify no console errors
   - [ ] Check performance (bundle load <2s)

4. **Approve staging for production:**
   - [ ] All smoke tests pass
   - [ ] Manual testing pass
   - [ ] Metrics look good
   - [ ] Staging ready for production: ✅ APPROVED

#### **Stage 3: Deploy to Production (T-0min)**

1. **Go-live:**
   ```bash
   # Deploy to production
   npm run deploy:production
   # or: wrangler deploy --env production
   
   # Verify deployment status
   wrangler deployments list
   # Should show latest deployment as "Active"
   ```

2. **Instant post-deploy checks:**
   ```bash
   # Health check
   curl https://api.wojak.ink/health
   
   # Check worker status
   curl https://api.wojak.ink/workers/status
   
   # Monitor error rate (check Sentry)
   ```

3. **Monitor for 5 minutes:**
   - [ ] Error rate: <1%
   - [ ] API response times: <200ms p95
   - [ ] No spike in error logs
   - [ ] Worker tasks executing normally

#### **Stage 4: Post-Deployment (T+5min - T+1hour)**

1. **Public go-live announcement:**
   - [ ] Tweet announcement (Twitter)
   - [ ] Discord announcement (#announcements)
   - [ ] Update statuspage.io (all systems operational)

2. **Continued monitoring:**
   - [ ] Watch error logs (Sentry dashboard)
   - [ ] Monitor API metrics (DataDog/CloudFlare)
   - [ ] Check user feedback (Discord, Twitter mentions)
   - [ ] Verify worker tasks completing (did-indexer, credit-tracker, fetch-sales)

3. **Document deployment:**
   ```markdown
   # Deployment Log Entry
   
   **Launch Time:** 2026-02-23 13:00 UTC
   **Deployed Version:** v1.0.0
   **Status:** ✅ LIVE
   
   ## Deployment Stages
   - Staging deploy: ✅ Passed (13:00 UTC)
   - Staging smoke tests: ✅ All passing
   - Production deploy: ✅ Complete (13:10 UTC)
   - Health checks: ✅ All green
   - Error rate: 0% (baseline)
   - Performance: Main bundle load 1.8s (target: <2s) ✅
   
   ## User Feedback
   - No critical issues reported
   - Performance reports: positive
   - Feature feedback: [collecting]
   
   ## Rollback Status
   - Ready if needed: ✅ Yes
   - Previous version available: v0.9.9-stable
   - Time to rollback: ~5min
   ```

### Definition of Done
- ✅ Pre-deployment verification complete
- ✅ Staged deployment executed (staging → production)
- ✅ All smoke tests passing on production
- ✅ Health checks green
- ✅ Go-live announcement published
- ✅ Deployment logged + documented

---

## 3. LAUNCH DAY OPERATIONS (High Priority)

**Why:** First 24 hours post-launch are critical. Need active monitoring + quick response team.

### Task 3A: Launch Day SLA & Response

**File:** `docs/LAUNCH-DAY-SLA.md`

**SLA Targets (First 24h):**

```
Critical Issues (response: <15min)
- API down or >10% error rate
- Database unavailable
- Authentication broken
- Wallet connection completely broken

High Priority (response: <30min)
- API response time >500ms p95
- Worker task failures (any worker)
- Performance regression >20%
- User data loss reports

Medium Priority (response: <1hour)
- Minor UI bugs
- Performance <20% regression
- Single user affected by edge case
- Non-critical feature broken

Low Priority (response: next business day)
- Cosmetic issues
- Documentation updates
- Non-urgent feature requests
```

**Launch Day Team:**

```
On-Call Engineer (24h): [Name/Contact]
- Monitor error logs (Sentry)
- Monitor API metrics (DataDog)
- Check user feedback (Discord, Twitter)
- Execute rollback if critical issue

Communications Lead: [Name/Contact]
- Post status updates
- Communicate with users
- Announce known issues + workarounds
```

**Monitoring Cadence:**

```
First 1 hour: Monitor every 5 min
- Error rate
- API response times
- Worker task status
- User feedback
- Check for any alerts

Hours 1-4: Monitor every 15 min
- Same metrics
- User acquisition rate
- Feature usage patterns

Hours 4-24: Monitor every hour
- Same metrics
- Collect user feedback
- Document any issues
```

**Incident Response:**

```
If error rate >10%:
1. Identify root cause (check logs)
2. Decide: hotfix or rollback
3. If hotfix: deploy fix (5-10min)
4. If rollback: execute rollback (5min)
5. Communicate status to users
6. Post-incident: root cause analysis

If worker task fails:
1. Check worker logs
2. Determine if transient or systemic
3. If transient: monitor + retry manually if needed
4. If systemic: escalate to engineering
5. Patch + redeploy if fix available
```

### Definition of Done
- ✅ SLA targets defined
- ✅ On-call team assigned + contacts listed
- ✅ Monitoring cadence defined
- ✅ Incident response procedures documented
- ✅ Launch day SLA published

---

## 4. POST-LAUNCH COMMUNICATION (Medium Priority)

**Why:** Users need to know status + feel heard.

### Task 4A: Communication Templates

**File:** `docs/LAUNCH-COMMUNICATIONS.md`

**Template 1: Go-Live Announcement**

```
🚀 **WOJAK INK v1.0.0 IS LIVE!**

After months of development, we're thrilled to announce the official launch of Wojak Ink!

**What's New:**
- ⚡ 27% faster bundle with wallet-connect optimization
- 🧪 Rock-solid stability (3993+ tests, 100% passing)
- 🎮 Lazy-loaded game features for better performance
- 🔒 Enhanced security & accessibility
- 📊 Better monitoring & observability

**Get Started:**
1. Visit https://wojak.ink
2. Create an account (Google/Discord/Clawbot)
3. Play games & earn credits
4. Connect your wallet for NFT features

**Need Help?**
- [Docs](https://docs.wojak.ink)
- [Discord](https://discord.gg/...)
- [Support](mailto:support@wojak.ink)

Let's go! 🎮
```

**Template 2: Status Update (if issues found)**

```
🔧 **Status Update**

We've detected [issue description] affecting [impact scope]. We're working on a fix.

**What's affected:**
- [Specific feature]
- ETA for fix: [time]

**Workaround:**
- [If available]

**Updates:**
- [Timestamp]: Investigating root cause
- [Timestamp]: Found issue in [component]
- [Timestamp]: Deploying fix...

We'll update every 15min. Thanks for your patience!
```

**Template 3: Post-Incident Summary**

```
✅ **Incident Resolved**

We experienced [issue] for [duration]. It has been fixed.

**Root Cause:**
[Brief explanation]

**Resolution:**
[What we did to fix it]

**Prevention:**
[What we're doing to prevent it next time]

Thanks for your patience, and sorry for the inconvenience! 🙏
```

### Definition of Done
- ✅ Go-live announcement drafted + ready to post
- ✅ Status update template created
- ✅ Post-incident template created
- ✅ All templates reviewed + approved
- ✅ Social media accounts ready to post

---

## 5. FINAL HANDOFF TO OPS TEAM (High Priority)

**Why:** After launch, ops team owns production. Need clear runbook + escalation path.

### Task 5A: Ops Handoff Runbook

**File:** `docs/OPS-RUNBOOK.md`

**Sections:**

1. **Daily Tasks:**
   - [ ] Check error logs (Sentry) for anomalies
   - [ ] Monitor worker execution (did-indexer, credit-tracker, fetch-sales)
   - [ ] Check API metrics (response time, error rate)
   - [ ] Review user feedback (Discord, Twitter, support email)
   - [ ] Create daily status report

2. **Weekly Tasks:**
   - [ ] Database maintenance (VACUUM, ANALYZE)
   - [ ] Review security logs for suspicious activity
   - [ ] Check dependency vulnerabilities (npm audit)
   - [ ] Performance trend analysis
   - [ ] User satisfaction survey / NPS check

3. **Emergency Procedures:**
   - If API down: [escalation steps]
   - If database down: [recovery steps]
   - If worker task failing: [diagnosis + fix steps]
   - If security issue: [incident response]

4. **Escalation Contacts:**
   ```
   Level 1: On-call Engineer
   - Phone: [number]
   - Response time: <15min
   
   Level 2: Engineering Lead
   - Phone: [number]
   - Response time: <30min
   
   Level 3: CEO/CTO
   - Phone: [number]
   - Only for critical incidents
   ```

5. **Useful Commands:**
   ```bash
   # View production logs
   wrangler tail --env production
   
   # Deploy hotfix
   npm run build && npm run deploy:production
   
   # Rollback to previous version
   wrangler deployments list  # find previous ID
   wrangler deployments rollback [deployment-id]
   
   # Check worker status
   wrangler d1 list
   
   # Export database
   wrangler d1 export production > backup.sql
   ```

### Definition of Done
- ✅ Daily/weekly task list created
- ✅ Emergency procedures documented
- ✅ Escalation contacts listed
- ✅ Useful commands provided
- ✅ Ops runbook ready for handoff

---

## 6. POST-LAUNCH METRICS & SUCCESS CRITERIA (Medium Priority)

**Why:** Track if launch was successful + inform next steps.

### Task 6A: Launch Success Metrics

**File:** `docs/LAUNCH-METRICS.md`

**Metrics to Track (First 7 Days):**

```
User Acquisition
- New user signups: target 500+/day
- Account creation success rate: target >95%
- Social media mentions: track volume

Engagement
- DAU (Daily Active Users): target 50%+ of signups
- Games played/user/day: target 3+
- Avg session duration: target 15+ min

Technical Performance
- API error rate: target <1%
- API p95 response time: target <200ms
- Bundle load time (p95): target <2.5s
- Worker task success rate: target >99%

User Satisfaction
- Support tickets: target <5% of users
- Discord sentiment: mostly positive
- Twitter mentions: >80% positive
- NPS (Net Promoter Score): target 40+

Business Metrics
- Credit spending rate: target >30% of earned
- Wallet connections: target 20%+ of users
- Retention (D7): target >40%
```

**Success Definition:**

```
LAUNCH SUCCESSFUL if:
- Error rate <1% ✅
- No critical issues requiring rollback
- User acquisition >100/day
- Positive user feedback overall
- All systems stable for 24h
```

### Definition of Done
- ✅ Success metrics defined + tracked
- ✅ Dashboard created (Google Sheets or DataDog)
- ✅ Daily metric reports generated
- ✅ Success criteria documented

---

## Execution Priority

**Tier 1 (Day-Of):**
1. Final verification → all systems green
2. Staged deployment → staging → production
3. Launch monitoring → 24h on-call
4. Communications → public go-live + status updates

**Tier 2 (Post-Launch):**
5. Ops handoff → runbook + escalation
6. Metrics tracking → success criteria
7. Incident documentation → lessons learned

**Time Budget: 2-4 hours**
- Final verification: 30min
- Deployment: 30min (staging + production)
- Launch monitoring: 1-2h (first 24h active)
- Ops handoff: 30-45min
- Metrics setup: 30min

---

## How Codex Should Execute

```
For Deployment Day:
1. Verify all tests passing + git clean
2. Tag release: v1.0.0
3. Deploy to staging
4. Run smoke tests on staging
5. Deploy to production
6. Health checks + monitoring
7. Post go-live announcement
8. Monitor for issues (first 24h)
9. Document deployment log
10. Handoff to ops team

BigP will be on-call with you.
```

---

## Success Metrics

- **Zero Downtime:** No critical incidents requiring rollback
- **Error Rate:** <1% throughout first week
- **Performance:** Bundle load <2s, API p95 <200ms
- **User Feedback:** Majority positive, NPS 40+
- **Team Confidence:** Everyone knows their role, procedures clear
- **Smooth Handoff:** Ops team has full runbook + contacts

---

**Phase 7 is launch day operations. Execute with calm confidence. The prep work (Phase 1-6) guarantees this will be smooth. 🚀**
