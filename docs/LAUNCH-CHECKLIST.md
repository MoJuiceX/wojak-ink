# Launch Readiness Checklist (v1.0.0)

**Launch Target**: Week of 2026-03-08 (2 weeks from Phase 5 start)  
**Status**: 🚀 Ready for pre-launch verification

---

## 🔴 TIER 1: PRE-LAUNCH (24 HOURS BEFORE)

> Execute these checks 24 hours before production deploy.

### Code & Git
- [ ] **Main branch updated** — All Phase 5 work merged to `main`
- [ ] **PR #14 merged** — Wallet-connect split + optimization PRs reviewed and merged
- [ ] **No uncommitted changes** — `git status` shows clean working tree
- [ ] **Git tags created** — `git tag v1.0.0-launch && git push origin v1.0.0`

### Testing
- [ ] **Unit tests passing** — `npm run test:unit` exits with code 0
  - Expected: All unit tests pass
  - Target: 3993+ tests (as of Phase 4)
- [ ] **Integration tests passing** — `npm test` (Playwright smoke tests) passes
  - Expected: All critical user flows work (auth, game load, wallet)
  - Target: 100% pass rate, 0 flaky tests
- [ ] **No lint violations** — `npm run lint:scoped -- --max-warnings=0` passes
  - Expected: No TypeScript, ESLint, or style errors
  - Action: Fix any violations before merge

### Build & Bundle
- [ ] **Production build succeeds** — `npm run build` exits cleanly
  - Duration: Target <5min
  - Output: `dist/` folder generated
- [ ] **Bundle budget passes** — `npm run bundle:report` shows 0 hard breaches
  - Expected: All assets <406kB
  - Max per-asset: 406 kB (for chunked wallet)
  - Max entry point: 360 kB hard limit
- [ ] **No build warnings** — Check logs for warnings that need attention
- [ ] **Manifest verified** — `npm run verify-manifest` confirms asset integrity

### Performance Baseline
- [ ] **Performance baseline documented** — `docs/PERFORMANCE-BASELINE.md` complete
  - FCP target: <2000ms
  - LCP target: <3000ms
  - TTI target: <4000ms
  - CLS target: <0.1
- [ ] **Bundle metrics recorded** — Main entry, lazy chunks, CSS all measured
- [ ] **Lighthouse audit completed** — JSON report saved to `reports/`

### Documentation
- [ ] **README.md reviewed** — Reflects v1.0.0 launch, no broken links
- [ ] **DEPLOYMENT-GUIDE.md verified** — Production deployment steps accurate
- [ ] **API docs up-to-date** — If public API, ensure all endpoints documented
- [ ] **Changelog written** — What's new in v1.0.0
  ```markdown
  # v1.0.0 - Launch Release
  
  ## New Features
  - [List major features]
  
  ## Improvements
  - Wallet-Connect split for faster load times
  - Game feature lazy-loading (17% bundle reduction)
  - [Other improvements]
  
  ## Bug Fixes
  - [Bug fixes from Phase 4]
  ```

### Environment & Secrets
- [ ] **Production `.env` prepared** — All secrets, API keys, database URLs set
- [ ] **Database migrations reviewed** — All pending migrations safe to apply
- [ ] **Worker cron jobs validated** — did-indexer, credit-tracker schedules correct
- [ ] **Error tracking configured** — Sentry/LogRocket connected (if using)
- [ ] **CDN cache rules set** — CloudFlare cache TTLs configured

---

## 🟡 TIER 2: DEPLOYMENT (LAUNCH DAY)

> Execute on the day of launch, during low-traffic window.

### Pre-Deployment Validation
- [ ] **Staging deployment complete** — Deploy v1.0.0-launch to staging environment
- [ ] **Staging smoke tests pass** — Manual verification of critical flows:
  - [ ] User can sign up (Google, Discord, Clawbot auth)
  - [ ] Game loads in <2s
  - [ ] Wallet connection works
  - [ ] Credits earned + display updates
  - [ ] Worker tasks execute (manual trigger)
  - [ ] No console errors (DevTools)
  - [ ] Responsive on mobile
- [ ] **Performance measured in staging** — LCP, TTI meet targets with CDN
- [ ] **Database backups created** — Pre-production backup taken
- [ ] **Rollback plan verified** — Team knows how to revert if needed

### Production Deployment
- [ ] **Build artifact created** — Production bundle ready for deployment
- [ ] **DNS/CDN configured** — Production domain ready (already live or ready to switch)
- [ ] **Deployment executed** — Run production deployment script
  ```bash
  # Example deployment flow:
  1. Deploy bundle to CDN (Cloudflare, Vercel, etc.)
  2. Apply database migrations (if any)
  3. Enable worker cron jobs
  4. Run health checks
  ```
- [ ] **Health checks passing** — All critical endpoints responding
  - API server: /health → 200 OK
  - Database: Can query users table
  - Workers: Last run timestamps recent
  - CDN: Assets loading from edge locations
- [ ] **Error tracking enabled** — Sentry/LogRocket receiving data
- [ ] **Monitoring dashboards live** — Team can see real-time metrics

### Launch Moment
- [ ] **User communication sent** — Status page updated, social posts scheduled
  ```
  "🚀 wojak.ink v1.0.0 is LIVE! New features: [list]. Try it now!"
  ```
- [ ] **Product team notified** — All stakeholders informed deployment is complete
- [ ] **Support team ready** — Support channels (Discord, email) staffed for first 24h
- [ ] **Marketing push begins** — Social media, announcements (if planned)

---

## 🟢 TIER 3: POST-LAUNCH (FIRST 24 HOURS)

> Monitor closely during first 24 hours. Be ready to rollback if critical issues found.

### Real-Time Monitoring
- [ ] **Error rate <1%** — Monitor Sentry/LogRocket error dashboard
  - Alert if: Error rate spikes >5%
  - Action: Investigate + rollback if critical bug
- [ ] **API response time <200ms p95** — Monitor API latency
  - Alert if: p95 latency >500ms
  - Action: Check database queries, worker health
- [ ] **Bundle load time <2s p95** — Monitor CDN + browser loading
  - Alert if: LCP >3s for >10% of users
  - Action: Check CDN cache, investigate slow routes
- [ ] **Worker health** — All background tasks executing
  - did-indexer: Last run <1h ago, duration <5min
  - credit-tracker: Last run <1h ago, no failures
  - fetch-sales: Last run <1h ago, price updates current
  - Alert if: Any worker hasn't run in >2h

### User Feedback Monitoring
- [ ] **Discord #support channel active** — Monitor for user issues
  - Look for: Login problems, game crashes, wallet connection issues
  - Response time: <30min for critical bugs
- [ ] **Twitter mentions checked** — Search `@wojak_ink` or project handle
  - Sentiment: Look for complaints about bugs/downtime
- [ ] **Email support reviewed** — Any urgent reports
- [ ] **In-app error logs reviewed** — Console errors, exceptions from users

### Decision Point: Stay Live or Rollback?

**STAY LIVE & HOTFIX if:**
- Error rate <5% and errors are non-critical
- No user data loss or security issues
- Issue can be fixed in <1 hour with hotfix PR

**ROLLBACK if:**
- Error rate >5% and affecting majority of users
- Critical security vulnerability discovered
- Data corruption or loss occurring
- Service unavailable (>30min outage)
- Issue cannot be fixed within 2 hours

**Rollback procedure** (See `ROLLBACK-PROCEDURE.md`):
```bash
# 1. Identify issue
# 2. Revert to previous stable version
git checkout v0.9.9-stable
git checkout -b rollback/hotfix

# 3. Deploy from rollback branch
npm run build && [deploy script]

# 4. Communicate with users
# 5. Root cause analysis (post-incident)
```

### Performance Check
- [ ] **Real-world metrics captured** — Actual user data shows good performance
- [ ] **Bundle assets cached on CDN** — No 404s, no slow loads
- [ ] **Database queries optimized** — No slow queries in logs

### Celebratory Moment 🎉
- [ ] **Share launch update** — "v1.0.0 is live and stable!"
- [ ] **Thank the team** — All contributors acknowledged
- [ ] **Log launch success** — Document what went well, what to improve next time

---

## 📋 TIER 4: POST-LAUNCH MONITORING (FIRST WEEK)

> Continue daily checks for 7 days post-launch.

- [ ] **Daily error rate check** — Target <1%, alert if >5%
- [ ] **Daily performance check** — LCP <3s, TTI <4s for most users
- [ ] **Worker tasks health** — All 3 workers running on schedule
- [ ] **Database performance** — No slow queries, backups healthy
- [ ] **User signups tracking** — Monitor onboarding funnel
- [ ] **Game engagement metrics** — Play counts, average session time
- [ ] **Wallet connection success rate** — % of users with connected wallets
- [ ] **Support ticket resolution** — Any critical issues resolved

---

## 📢 MARKETING & COMMUNICATION

> Before, during, and after launch.

### Pre-Launch (48h before)
- [ ] **Announcement drafted** — v1.0.0 release notes + feature highlights
- [ ] **Social media posts scheduled** — Twitter, Discord scheduled messages
  - Tweet 1: "Launching in 48 hours" (teaser)
  - Tweet 2: "Launching in 24 hours" (build hype)
  - Tweet 3: "Live now!" (launch moment)
- [ ] **Email campaign ready** — For user subscribers (if applicable)
- [ ] **Status page updated** — StatusPage.io (if using) shows maintenance window (if needed)

### Launch Day
- [ ] **Go-live announcement sent** — Social posts go out, email sent
- [ ] **Community channels notified** — Discord, Telegram communities informed
- [ ] **Press release (optional)** — If public launch, send to press

### Post-Launch (24-48h after)
- [ ] **"Live & Stable" announcement** — Confirm 24h without critical issues
- [ ] **Thank you post** — Acknowledge users, highlight early engagement
- [ ] **Metrics shared (optional)** — If public: "X signups, Y games played, Z wallets connected"

---

## 🔗 Related Documents

- **Performance Baseline**: `docs/PERFORMANCE-BASELINE.md`
- **Monitoring Guide**: `docs/MONITORING-GUIDE.md`
- **Rollback Procedure**: `docs/ROLLBACK-PROCEDURE.md`
- **Staging Validation**: `docs/STAGING-VALIDATION.md`
- **Deployment Guide**: `docs/DEPLOYMENT-GUIDE.md` (if exists)

---

## Template: Pre-Launch Notification

```markdown
# v1.0.0 Launch Notice

**Launch Time**: [DATE TIME UTC]
**Expected Downtime**: [NONE / X MINUTES]
**Affected Services**: wojak.ink

## What's New in v1.0.0
- Optimized wallet connection (faster load times)
- Lazy-loaded game features (smoother gameplay)
- Improved error handling and stability

## During Launch
- Service may be briefly unavailable (if deploying)
- Games and wallet may show stale data (short-lived)
- Please refresh if you see issues

## Status
- [x] Pre-launch testing complete
- [x] Staging deployment verified
- [ ] Production deploy in progress
- [ ] Live and stable (check back in 30min)

**Questions?** Reach us on Discord #support.
```

---

## Sign-Off

- [ ] **Launch Manager**: [Name] confirms all checks passed
- [ ] **Tech Lead**: [Name] confirms code quality + deployment readiness
- [ ] **QA Lead**: [Name] confirms testing complete
- [ ] **Product**: [Name] confirms feature set ready

**Status**: Ready to launch ✅
