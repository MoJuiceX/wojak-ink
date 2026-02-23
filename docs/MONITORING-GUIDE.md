# Monitoring & Observability Guide (v1.0.0)

**Status**: Production monitoring setup for launch and beyond  
**Last Updated**: 2026-02-23  
**Target Environment**: Production (wojak.ink)

---

## Overview

This guide documents all metrics, alerts, dashboards, and escalation procedures for post-launch monitoring of wojak.ink v1.0.0.

**Key Principle**: Fast detection + quick response = minimal user impact.

---

## 1. APPLICATION HEALTH METRICS

### Web Server / CDN Layer

#### Metric: Error Rate
```
Definition: % of HTTP requests returning 5xx or client errors (4xx considered user error)
Target: <1% overall
Alert Threshold: >5% (Critical), >2% (Warning)
Dashboard: Cloudflare Analytics / Sentry / DataDog
Check Frequency: Real-time (every 5 seconds)
```

**How to Monitor**:
- **Cloudflare Dashboard**: Analytics → Traffic → Status Codes
- **Sentry**: Issues dashboard → Filter by "Error"
- **DataDog**: Logs → Group by "status: 5xx"

**Response Plan if Alert Triggered**:
1. Check Sentry for error patterns (is it 1 user or widespread?)
2. Review deployment status (was code just deployed?)
3. Check database/API health (are downstream services down?)
4. If critical: Rollback to previous version (see ROLLBACK-PROCEDURE.md)
5. If recoverable: Deploy hotfix

#### Metric: API Response Time (p95)
```
Definition: 95th percentile latency for API requests
Target: <200ms
Alert Threshold: >500ms (Warning), >1s (Critical)
Dashboard: DataDog / New Relic / CloudFlare
Check Frequency: Every 1 minute
```

**How to Monitor**:
- **DataDog**: APM → Latency graph
- **CloudFlare**: Analytics → Performance → Avg response time
- **Custom**: Add response time logging to API handlers

**Causes of High Latency**:
- Database query slow (check slow query log)
- Worker task blocking API (check worker health)
- CDN cache miss (check cache hit ratio)
- Traffic spike (scaling needed?)

**Response Plan**:
1. Check database slow-query log
2. Review recent deployments (did code change introduce query?)
3. Check worker queue depth (workers backed up?)
4. If traffic spike: Consider load balancing/scaling
5. If query slow: Optimize database index

#### Metric: Bundle Load Time (p95)
```
Definition: Time for user's browser to fully load main JS bundle
Target: <2s (measured as LCP in Lighthouse)
Alert Threshold: >3s (Warning)
Dashboard: Cloudflare Analytics / Google Analytics / WebVitals
Check Frequency: Every 5 minutes
```

**How to Monitor**:
- **Google Analytics**: Web → Performance → Page load time
- **Cloudflare Analytics**: Performance → Page load time
- **Custom**: Add client-side Web Vitals logging (Google Analytics 4 integration)

**Causes of Slow Bundles**:
- CDN cache expired (cold cache)
- Large JavaScript not code-split (check bundle size)
- Network latency (user on slow connection)

**Response Plan**:
1. Check bundle size hasn't grown (compare to PERFORMANCE-BASELINE.md)
2. Verify CDN cache is populated (should warm on deploy)
3. Check network waterfall (where is time being spent?)
4. If bundle grew: Investigate code changes + re-split if needed

#### Metric: Uptime
```
Definition: % of time service is online and responding
Target: 99.9% (4.3 minutes downtime per month)
Alert Threshold: Down >5 minutes (Critical)
Dashboard: StatusPage.io / Uptime Robot / Cloudflare
Check Frequency: Every 30 seconds
```

**How to Monitor**:
- **StatusPage.io**: Status page for users + team
- **UptimeRobot**: Synthetic monitoring from multiple locations
- **Cloudflare**: Health checks on origin server

**Response Plan**:
1. Is origin server down or CDN?
2. Check deployment logs (did we just deploy?)
3. Check database connectivity
4. Restart service if needed
5. Communicate status to users via StatusPage.io

---

## 2. GAME / GAMEPLAY METRICS

### Game Canvas Rendering

#### Metric: Canvas Render Time
```
Definition: Time from game start until first frame rendered
Target: <500ms
Alert Threshold: >1000ms (Warning)
Dashboard: Custom (game telemetry)
Check Frequency: Every game session
```

**What's Included**:
- Canvas mount time
- Asset loading (sprites, sounds)
- Initial frame paint

**How to Optimize**:
- Preload game assets on page load (not in-game)
- Use WebGL for 2D games (if performance critical)
- Lazy-load game sounds (only when needed)

#### Metric: FPS During Gameplay
```
Definition: Frames per second during active game session
Target: 60 FPS (no drops)
Alert Threshold: <30 FPS (Warning)
Dashboard: Custom (game telemetry)
Check Frequency: Per-session monitoring
```

**How to Monitor**:
- Browser DevTools Performance → FPS meter
- Custom telemetry: `performance.now()` before/after each frame

**Causes of Low FPS**:
- JavaScript taking >16ms per frame (1000ms / 60 FPS)
- Heavy DOM manipulation (update game state instead)
- Memory pressure (garbage collection pauses)

#### Metric: Game Completion Rate
```
Definition: % of players who finish (win or lose) vs. start
Target: >80% (most players can complete a game)
Alert Threshold: <70% (Warning, may indicate game is broken)
Dashboard: Analytics / Custom telemetry
Check Frequency: Daily
```

**What This Tells Us**:
- If completion rate drops suddenly → game crash or error
- If completion rate is low baseline → game may be too hard or buggy

**Response Plan if Low**:
1. Check game console errors (are players getting JavaScript errors?)
2. Check if specific game affected (or all games?)
3. Review recent game code changes
4. Check player feedback (Discord support)

---

## 3. WALLET / WEB3 METRICS

### Wallet Connection

#### Metric: Wallet Connection Success Rate
```
Definition: % of WalletConnect modal interactions that result in successful connection
Target: >95%
Alert Threshold: <80% (Critical)
Dashboard: Custom (WalletConnect event logging)
Check Frequency: Real-time
```

**How to Monitor**:
- Log to Sentry: `WalletConnectSuccess` / `WalletConnectFailed`
- Track in Analytics: Event category="wallet", action="connect"

**Causes of Failures**:
- WalletConnect service down (check their status page)
- Network error (user offline)
- Invalid wallet signature (user rejected)
- Timeout (user took >30s to approve)

**Response Plan**:
1. Check WalletConnect service status
2. Review error logs in Sentry (what's the error message?)
3. Increase timeout if needed (currently 30s)

#### Metric: DID Lookup Time
```
Definition: Time to fetch user's NFT holdings from blockchain
Target: <2s
Alert Threshold: >5s (Warning)
Dashboard: Custom (API telemetry)
Check Frequency: Per-request
```

**How to Monitor**:
- Measure in API: `didLookup()` execution time
- Log to DataDog: `did.lookup.duration`

**Causes of Slow Lookups**:
- Blockchain RPC endpoint slow (check provider health)
- User has many NFTs (O(n) query)
- Network latency

---

## 4. WORKER TASKS (Background Jobs)

### did-indexer (NFT Holdings Sync)

#### Metric: Last Successful Run
```
Definition: When did this worker last complete without errors?
Target: <1 hour ago
Alert Threshold: >2 hours (Critical) - worker is stuck or failing
Dashboard: Custom (worker status page)
Check Frequency: Every 5 minutes
```

**How to Monitor**:
```sql
-- Query to check last run
SELECT name, last_run, next_run, status
FROM worker_runs
WHERE name = 'did-indexer'
ORDER BY last_run DESC LIMIT 1;
```

#### Metric: Execution Duration
```
Definition: How long did the last run take?
Target: <5 minutes
Alert Threshold: >10 minutes (Warning) - may indicate too many NFTs or slow RPC
Dashboard: Custom (worker logs)
```

#### Metric: NFT Holdings Synced (Count)
```
Definition: Number of unique user NFT holdings updated in last run
Target: >0 (at least 1 user synced)
Alert Threshold: 0 (Warning) - nothing was synced
```

#### Metric: Error Count
```
Definition: # of errors in last run (individual NFT fetch failures are OK, but too many = problem)
Target: 0
Alert Threshold: >5 errors (Warning)
Dashboard: Sentry / Custom logs
```

**Common Errors**:
- RPC endpoint timeout (blockchain not responding)
- User wallet has 0 NFTs (not an error, expected)
- Invalid address format (rare)

**Response Plan if Stuck**:
1. Check worker logs (is there a stack trace?)
2. Check blockchain RPC health (is endpoint down?)
3. Check database connectivity (can worker write results?)
4. Manually trigger run if safe (may need operator privileges)

### credit-tracker (Credits Awarded)

#### Metric: Credits Awarded (Daily Count)
```
Definition: Total credits distributed to players in last 24h
Target: Correlates with game plays (e.g., if 100 games played, ~100 credits)
Alert Threshold: >20% variance from expected (Warning)
Dashboard: Analytics dashboard
Check Frequency: Daily (end of day check)
```

**How to Monitor**:
```sql
SELECT DATE(created_at), SUM(amount) as credits_awarded
FROM credit_transactions
WHERE type = 'game_win'
GROUP BY DATE(created_at)
ORDER BY created_at DESC;
```

#### Metric: Transaction Success Rate
```
Definition: % of credit award attempts that succeed
Target: 100%
Alert Threshold: <95% (Warning)
Dashboard: Sentry / Database logs
```

**Causes of Failures**:
- Database write error (disk full?)
- Concurrent transaction conflict (race condition)
- Invalid game session (game state corrupted?)

#### Metric: Last Run Time
```
Definition: When did credit-tracker last run?
Target: <1 hour ago
Alert Threshold: >2 hours (Critical)
Dashboard: Custom worker status
```

### fetch-sales (NFT Price Updates)

#### Metric: NFT Prices Updated (Count)
```
Definition: # of NFT prices successfully refreshed in last run
Target: >100 (assuming >100 NFTs tracked)
Alert Threshold: <50 (Warning) - many prices not updated
Dashboard: Custom
```

#### Metric: API Call Success Rate
```
Definition: % of blockchain/API calls that succeeded
Target: >99%
Alert Threshold: <95% (Warning)
Dashboard: Sentry
```

**API Providers Tracked**:
- OpenSea API (if used)
- Blockchain RPC endpoint
- IPFS for metadata

#### Metric: Price Accuracy
```
Definition: Sample 10 NFT prices, verify they match blockchain
Target: 100% match
Alert Threshold: <90% match (Warning) - data may be stale
Check Frequency: Hourly
Dashboard: Manual verification (no automated check)
```

**How to Verify**:
1. Pick 5 NFT IDs from database
2. Query current price in fetch-sales database
3. Check blockchain/OpenSea for real price
4. Compare (should match within 1 hour)

---

## 5. DATABASE HEALTH

### Query Performance

#### Metric: Slow Queries (>100ms)
```
Definition: Database queries taking longer than 100ms
Target: <1% of queries
Alert Threshold: >5% (Warning)
Dashboard: Database slow query log / DataDog
Check Frequency: Real-time
```

**How to Enable**:
```sql
-- For Postgres
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();
```

**Common Slow Queries**:
- Selecting all users (missing WHERE clause)
- Joins without index on FK
- Aggregations on large tables (SELECT COUNT(*))

**Response Plan**:
1. Identify slow query from log
2. Analyze EXPLAIN plan (see where time is spent)
3. Add index if needed
4. Re-analyze query performance

### Database Size

#### Metric: Database Disk Usage
```
Definition: Total disk space used by database
Target: <1 GB (scaling as user base grows)
Alert Threshold: >80% disk capacity (Warning)
Dashboard: Database admin panel / CloudFlare
Check Frequency: Daily
```

**Response Plan if Low Disk**:
1. Check for large tables with old data
2. Archive old records (historical data to cheaper storage)
3. Add more disk capacity

### Backup Health

#### Metric: Last Successful Backup
```
Definition: When was database last backed up?
Target: <1 hour ago
Alert Threshold: >24 hours (Critical) - no recent backups!
Dashboard: Backup service dashboard
Check Frequency: Every 6 hours
```

---

## 6. USER / BUSINESS METRICS

### User Signups

#### Metric: Daily New Users
```
Definition: # of new accounts created per day
Target: Depends on marketing, e.g., 50-100/day post-launch
Alert Threshold: 0 (Warning) - no signups all day suggests site is down
Dashboard: Google Analytics / Analytics service
Check Frequency: Daily
```

### Game Engagement

#### Metric: Daily Active Users (DAU)
```
Definition: # of unique users who played at least 1 game
Target: >20% of total users (healthy engagement)
Alert Threshold: <10% (Warning) - low engagement
Dashboard: Analytics / Custom telemetry
Check Frequency: Daily
```

#### Metric: Average Session Length
```
Definition: Average time spent per session (user opens app to closes it)
Target: >5 minutes (users playing multiple games)
Alert Threshold: <2 minutes (Warning) - users leaving quickly
Dashboard: Analytics
Check Frequency: Daily
```

#### Metric: Games Played (Daily)
```
Definition: Total game plays across all users per day
Target: >1000 (depending on user base)
Alert Threshold: Drop >20% from baseline (Warning)
Dashboard: Analytics
Check Frequency: Daily
```

---

## 7. ALERT THRESHOLDS & ESCALATION

### Severity Levels

| Severity | Definition | Alert Channel | Response Time |
|----------|-----------|---|---|
| **Critical** | Service down, data loss, or >10% users affected | SMS + Slack + Email | <5 minutes |
| **Warning** | Degraded performance or <10% users affected | Slack + Email | <15 minutes |
| **Info** | Informational, no action required | Slack #monitoring | <1 hour |

### Critical Alerts (Page On-Call)

1. **Service Down** (Error rate >10% for >5min)
   - Channel: SMS + Slack (on-call) + Email
   - Action: Check deployment status, rollback if needed
   - Owner: Tech Lead / SRE

2. **Database Down** (Can't connect)
   - Channel: SMS + Slack (on-call)
   - Action: Check database status, restart if needed
   - Owner: Database Admin / DevOps

3. **Worker Critical Failure** (All 3 workers down >30min)
   - Channel: SMS + Slack
   - Action: Check worker logs, restart, escalate if RPC endpoint down
   - Owner: Backend Lead

4. **Data Corruption** (Invalid entries in database)
   - Channel: SMS + Slack + immediate call
   - Action: Rollback to backup, manual data recovery
   - Owner: Database Admin + Tech Lead

### Warning Alerts (Slack Notification)

1. **High Error Rate** (5-10% for 10min)
   - Action: Investigate errors, deploy hotfix if safe
2. **Slow API** (p95 >500ms for 15min)
   - Action: Check slow queries, optimize if needed
3. **Worker Lagging** (Last run >1.5 hours ago)
   - Action: Check logs, manually trigger if safe
4. **Low Disk Space** (>80% used)
   - Action: Archive data, request more disk
5. **Certificate Expiring** (<30 days)
   - Action: Renew certificate

### Dashboard & On-Call Rotation

- **Primary Dashboard**: Cloudflare Analytics + Sentry + Custom worker status page
- **On-Call Rotation**: [Set up schedule in AlertManager / PagerDuty]
- **Escalation**: If on-call can't resolve in 30min → page manager

---

## 8. MONITORING TOOLS RECOMMENDED

| Tool | Purpose | Cost | Setup |
|------|---------|------|-------|
| **Cloudflare** | CDN + DDoS + Analytics | $20-200/mo | Already included |
| **Sentry** | Error tracking + crash reporting | $29-299/mo | SDK integration needed |
| **DataDog** | Metrics + APM + Logs | $15-50/host/mo | Agent installation |
| **Google Analytics 4** | User behavior + engagement | Free | GA4 pixel on page |
| **StatusPage.io** | Public status + incident comms | $10-50/mo | Incident management |
| **UptimeRobot** | Synthetic monitoring | Free-$10/mo | Configure monitors |

### Implementation Priority

**Phase 1 (Launch)**: Cloudflare + Sentry + StatusPage.io
**Phase 2 (Week 1)**: Add Google Analytics 4 + custom worker status page
**Phase 3 (Month 1)**: Add DataDog if high traffic volume

---

## 9. INCIDENT RESPONSE TEMPLATE

If critical alert triggered, follow this:

1. **Acknowledge Alert** (1min)
   - Page on-call via SMS/Slack
   - Respond "Acknowledged" in incident channel

2. **Assess Severity** (2min)
   - Is service completely down or degraded?
   - How many users affected?
   - Can we roll back or do we need hotfix?

3. **Communicate** (1min)
   - Post to #incidents Slack channel
   - Update StatusPage.io with incident status
   - Set start time + estimated resolution

4. **Investigate & Fix** (5-30min)
   - Check deployment logs
   - Check error logs (Sentry)
   - Check database/worker health
   - Deploy hotfix OR rollback

5. **Verify & Recover** (2min)
   - Confirm error rate back to <1%
   - Confirm users can access service
   - Celebrate fix! 🎉

6. **Post-Incident** (Later)
   - Write root cause analysis
   - Update runbooks to prevent recurrence
   - Debrief with team

---

## 10. RUNBOOKS (How-To Guides)

### Runbook: High Error Rate

```
Error Rate >5% for >5 minutes

1. Check Sentry
   - Open dashboard
   - Sort issues by "Frequency"
   - Note top error type

2. Check Deployment
   - Was code deployed in last 30min?
   - If yes: Can we rollback to previous version?
   - If rollback is safe: Execute rollback

3. Check Database
   - Can you query? SELECT 1;
   - Check connection pool (max connections?)

4. If Can't Resolve in 15min
   - Page tech lead
   - Start emergency incident meeting
   - Gather team on Zoom/Discord
```

### Runbook: Worker Not Running

```
did-indexer / credit-tracker / fetch-sales hasn't run in >2h

1. Check Worker Logs
   - Look for error messages
   - Check last run timestamp

2. Check Dependencies
   - Is database reachable?
   - Is blockchain RPC endpoint up? (check provider's status page)
   - Are API keys valid?

3. Manual Trigger
   - If safe, manually trigger worker run
   - Monitor logs for completion
   - Verify data was synced

4. If Stuck
   - Kill running process (if hanging)
   - Restart worker service
   - Check for infinite loops in code
```

---

## Sign-Off

- [ ] **Monitoring Setup**: Complete
- [ ] **Dashboards**: Created + shared with team
- [ ] **Alerts**: Configured in Sentry / DataDog
- [ ] **On-Call Rotation**: Scheduled
- [ ] **Runbooks**: Reviewed by team

**Status**: Ready for launch ✅
