# Rollback Procedure (v1.0.0)

**Purpose**: Quick recovery from critical production issues  
**Scope**: When code changes are causing data loss, security risks, or service outages  
**Status**: Ready for launch

---

## 1. WHEN TO ROLLBACK

### Rollback YES ✅ (Execute Immediately)

- **Data Loss Occurring** — User data, game scores, wallet connections being deleted/corrupted
- **Security Vulnerability** — User auth bypassed, API can be called without login, NFTs can be stolen
- **Complete Service Outage** — >99% of users unable to access site (>30 min downtime)
- **Cascading Failures** — Multiple critical systems failing due to single code change
- **Unsafe to Hotfix** — Issue requires changes that take >1 hour to test safely

### Rollback NO ❌ (Deploy Hotfix Instead)

- **Minor UI Bug** — Button styling wrong, typo in message
- **Single User Affected** — One account with edge case, not systemic issue
- **Performance Degradation** — Slow, but site still works (can optimize later)
- **Incomplete Feature** — Feature launched but unfinished (disable instead of rolling back)
- **Quick Fix Available** — Bug can be fixed and tested in <30 minutes

### Decision Flowchart

```
CRITICAL BUG FOUND
    |
    ├─→ Can it be fixed in <1h safely? 
    |       YES → Deploy hotfix (test in branch first)
    |       NO  → Continue...
    |
    ├─→ Does it affect >10% of users?
    |       NO  → Watch closely, deploy hotfix when ready
    |       YES → Continue...
    |
    ├─→ Is user data at risk or service down?
    |       NO  → Deploy hotfix (users can wait)
    |       YES → ROLLBACK IMMEDIATELY
```

---

## 2. DECISION MAKERS

| Scenario | Who Decides | Approval Needed |
|----------|-----------|---|
| Rollback (Critical) | Tech Lead | Product Manager (notification only) |
| Hotfix (Recoverable) | Tech Lead | QA Lead (verify fix) |
| Monitor (Minor) | On-Call Engineer | None |

**Decision Communication**:
- Slack: #incidents channel (timestamp the decision)
- Team: Notify all relevant people
- Users: Update StatusPage.io

---

## 3. ROLLBACK STEPS

### Preparation (Before Launch)

1. **Document Previous Stable Version** ✅ (Do this now!)
   ```bash
   # Tag current main branch as stable
   git tag v1.0.0-launch
   git push origin v1.0.0-launch
   
   # Note: This will be the "fallback" version
   # If v1.0.1 has critical issues, we rollback to v1.0.0-launch
   ```

2. **Create Rollback Runbook** ✅ (This document)
   - Document how to rollback (steps below)
   - Practice rollback in staging (before production)
   - Confirm anyone can execute it under pressure

### During Incident (Execute Rollback)

#### Step 1: Declare Incident & Stop Deployments
```bash
# 1. Post to Slack #incidents channel
# @here CRITICAL: Rolling back to v1.0.0-launch due to [REASON]

# 2. Block new deployments
# Slack: "DEPLOYMENT FREEZE - Emergency rollback in progress"

# 3. Stop accepting new requests (optional, if data corruption risk)
# Kill load balancer or set maintenance mode
```

#### Step 2: Identify Rollback Target
```bash
# See what versions are available
git tag -l | sort -V

# Output:
# v0.9.9-stable
# v1.0.0-launch  ← THIS ONE (our stable baseline)
# v1.0.1-hotfix
# v1.0.2-hotfix
```

#### Step 3: Create Rollback Branch
```bash
# Create a new branch from the stable tag
git checkout v1.0.0-launch
git checkout -b rollback/v1.0.0-incident-recovery

# Verify we're on the right commit
git log --oneline -5
# Output should show v1.0.0 commits
```

#### Step 4: Build Production Artifacts
```bash
# Install dependencies (in case anything changed)
npm ci

# Build for production
npm run build

# Validate build succeeded (no errors)
# Check: dist/ folder exists and is <400MB
ls -lh dist/
du -sh dist/
```

#### Step 5: Deploy Rollback to Staging First
```bash
# ALWAYS test rollback in staging before hitting production
# This confirms: Build works, dependencies are OK, migrations don't conflict

# Deploy to staging environment
# Command depends on your hosting (examples below):

# If using Vercel:
vercel deploy dist --prod --scope=[staging-env]

# If using AWS:
aws s3 sync dist s3://[staging-bucket]/ --delete

# If using Docker/Kubernetes:
docker build -t wojak:rollback .
kubectl set image deployment/wojak wojak=wojak:rollback --record

# Verify staging works:
curl https://staging.wojak.ink/
# Expected: HTTP 200, no error message
```

#### Step 6: Run Smoke Tests
```bash
# Once deployed to staging, run smoke tests
npm test

# Expected: All Playwright tests pass
# If any fail: Investigate why rollback broke staging (usually DB migrations)
```

#### Step 7: Deploy Rollback to Production
```bash
# Only proceed if staging tests passed!

# Deploy to production (same command as staging, but prod bucket/env)

# If using Vercel:
vercel deploy dist --prod --scope=[production-env]

# If using AWS:
aws s3 sync dist s3://[prod-bucket]/ --delete

# If using Docker:
kubectl set image deployment/wojak wojak=wojak:rollback --record
```

#### Step 8: Monitor Rollback
```bash
# Watch error rate, response time for 5 minutes
watch -n 5 'curl -s -w "HTTP %{http_code}\n" https://wojak.ink'

# Check Sentry error rate
# Open: https://sentry.io/organizations/[org]/issues/
# Expected: Error rate drops below 1%

# Check StatusPage.io
# Verify incident shows "resolved" after 10 minutes
```

#### Step 9: Tag & Document Rollback
```bash
# Create a rollback tag for record-keeping
git tag v1.0.0-rollback
git push origin v1.0.0-rollback

# Add note to git commit message (future reference)
git log v1.0.0-rollback -1
# This commit will show as rollback target for future incidents
```

### Post-Rollback (After Service Recovered)

#### Step 1: Notify Users
```
Post to StatusPage.io (public):
"We experienced a critical issue and have rolled back to our previous stable 
version. Service is now restored. We're investigating the root cause and will 
share an update within 2 hours."

Post to Slack #announcements:
"🚨 Emergency rollback completed. Service is stable again. 
Root cause analysis: [status-link]"
```

#### Step 2: Root Cause Analysis (RCA)
```
Timing: Complete within 2 hours of rollback

Questions to answer:
1. What was the bug?
2. Why did it slip through testing?
3. What signal should have caught it?
4. How do we prevent this type of bug?
5. Should we have caught it in staging?

Output: Write RCA document (see template below)
```

#### Step 3: Fix & Retest (In Separate Branch)
```bash
# Create a fix branch from the rollback version
git checkout v1.0.0-rollback
git checkout -b fix/critical-bug-name

# Make minimal code changes to fix the issue
# (Don't refactor or add features, just fix the bug)
vim src/[file].ts

# Commit fix with clear message
git commit -m "fix: [specific description of what was fixed]"

# Run tests locally
npm run test:unit
npm test

# Create pull request for review
# Get QA + Tech Lead approval before merging
```

#### Step 4: Deploy Hotfix to Staging
```bash
# Test fixed version in staging first
git checkout [fix-branch]
npm run build
# Deploy to staging...
npm test  # Run smoke tests in staging

# If tests fail: Go back to step 3, fix the fix
# If tests pass: Proceed to production
```

#### Step 5: Deploy Hotfix to Production
```bash
# Same process as rollback deployment
# But deploying the fix branch instead of v1.0.0-launch

git tag v1.0.1-hotfix
npm run build
# Deploy to production...

# Wait 10 minutes, monitor error rate
# Expected: Error rate back to <1%, no new errors
```

#### Step 6: Post-Incident Communication
```markdown
## Incident Postmortem

**Incident**: [Title]
**Duration**: [Start] - [End] ([X minutes total)
**Impact**: [Description of what happened to users]

### Timeline
- [HH:MM] Alert triggered: Error rate spiked
- [HH:MM] Tech lead investigated
- [HH:MM] Decision made to rollback
- [HH:MM] Rollback deployed to production
- [HH:MM] Service recovered, error rate normal

### Root Cause
[What actually caused the bug?]
[Why wasn't it caught in testing?]

### What We Changed
[Code that caused the issue]

### Prevention
[How we'll prevent similar issues in future]
- [ ] Add test case for this scenario
- [ ] Add monitoring alert for this condition
- [ ] Document the gotcha in code comment
- [ ] Update deployment checklist

### Action Items
- [ ] Action 1 (assigned to X, due date Y)
- [ ] Action 2 (assigned to X, due date Y)

**Published**: [Date]
**Reviewed by**: Tech Lead + Product Manager
```

---

## 4. DATABASE CONSIDERATIONS

### No Migrations Needed (Safe Rollback)
```
If v1.0.0-launch didn't add database migrations:
- Rollback is straightforward
- Just deploy old code
- No database cleanup needed
```

### Forward Migrations Exist (Careful Rollback)
```
If v1.0.0-launch added database migrations (e.g., new columns/tables):
- Rolling back code won't undo migrations
- Database will have "future" schema that old code ignores
  (Usually safe: old code just doesn't use new columns)
  
Example:
- v1.0.0: Migration adds "user_premium" column
- v1.0.1: Code uses user_premium column → crashes!
- Rollback to v1.0.0: Code ignores user_premium column (OK)
- Rollback to v0.9.9: Code might break (needs old schema)
```

### Data Corruption Risk
```
If incident involved deleting/corrupting data:

1. Stop rollback until data integrity assessed
2. Take immediate database backup
3. Query what data was affected
4. Consider selective restore (not full rollback)
5. Consult DBA before proceeding

Example:
- Bug: Credit update query deletes wrong records
- Risk: Rollout doesn't undo deleted records
- Action: Restore from backup BEFORE rollback
- Then rollback code
```

---

## 5. COMMUNICATION TEMPLATES

### Internal: Slack #incidents

```
🚨 INCIDENT: High Error Rate

Time: 2026-03-08 14:22 UTC
Severity: CRITICAL
Impact: ~50% of users seeing 500 errors

Status: INVESTIGATING
Latest: Checking deployment logs...

Updates: [Will post every 5 minutes]
```

### Update: Rollback Decided

```
🔄 ROLLBACK INITIATED

Reverting to v1.0.0-launch (stable baseline)
Estimated recovery: 10 minutes

Steps:
1. Build artifacts ✅
2. Deploy to staging 🔄
3. Run smoke tests
4. Deploy to production
5. Monitor

Will update every 2 minutes.
```

### Update: Rollback Complete

```
✅ INCIDENT RESOLVED

Service restored to v1.0.0-launch
Error rate: <1% ✅
All systems normal ✅

Root cause: [Brief summary]
RCA will be published in 2 hours.

Thx for patience! 🙏
```

### Public: StatusPage.io

```
🚨 Service Degradation

We're experiencing elevated error rates affecting some users.
Our engineering team is investigating and working on a fix.

Current Status: INVESTIGATING
Updates every 15 minutes.

---

✅ RESOLVED

We've rolled back to our previous stable version.
Service is now fully restored.

Root cause analysis will be shared later today.
Apologies for the inconvenience! 🙏
```

---

## 6. PRACTICE & DRILLS

### Monthly Rollback Drill

**Objective**: Ensure team can rollback quickly under pressure.

**Procedure**:
1. Schedule 30-min drill (announce in advance)
2. Simulate incident: "Critical bug found, must rollback"
3. Team executes full rollback procedure
4. Measure time from start to "service recovered"
5. Target: Complete in <15 minutes
6. Debrief: What went well? What was confusing?

**Scoring**:
- <10 min: Excellent 🟢
- 10-15 min: Good 🟡
- >15 min: Needs practice 🔴

### Staging Rollback Test

**Before Launch**:
1. Deploy v1.0.0-launch to staging
2. Deploy "bad" version on top
3. Execute full rollback procedure
4. Verify staging is back to v1.0.0-launch
5. Confirm smoke tests pass

---

## 7. TROUBLESHOOTING

### Rollback Fails: Build Error

```
Error: npm run build failed

Steps:
1. Check node/npm version (should match production)
2. Delete node_modules: rm -rf node_modules
3. Reinstall: npm ci
4. Try build again: npm run build
5. If still fails: Check git status (stray files?)
```

### Rollback Fails: Deployment Error

```
Error: S3 sync failed / kubectl set image failed

Steps:
1. Check AWS credentials are set (aws sts get-caller-identity)
2. Check S3 bucket exists (aws s3 ls)
3. Check k8s cluster accessible (kubectl get pods)
4. Try deployment again with more verbose output
5. If still fails: Contact infrastructure team immediately
```

### Rollback Succeeds But Errors Persist

```
Error rate still high after rollback deployed

Troubleshooting:
1. Confirm rollback actually deployed
   - Check production code version (git log or version endpoint)
   - Should show v1.0.0-launch commit hash
2. Check CDN cache invalidated
   - CloudFlare: Purge cache
   - CDN: Clear all cache
3. Restart application servers
   - Kill all running containers/processes
   - Let load balancer restart them
4. Check database/API health
   - Is database still down?
   - Are background workers still failing?
5. Consider partial rollback (some users on old version)
```

### Need to Rollback Again (v1.0.0-launch Is Also Broken!)

```
Oh no! Previous "stable" version is also broken!

Steps:
1. Go back further: git tag -l | sort -V
2. Find v0.9.9 (the baseline before v1.0.0)
3. Repeat rollback procedure with v0.9.9
4. Deploy hotfix to BOTH v1.0.0 and v1.0.1

Lesson: Should have run more thorough staging tests!
```

---

## Sign-Off

- [ ] **Rollback procedure** documented
- [ ] **Stable version tagged** (v1.0.0-launch)
- [ ] **Team trained** on this runbook
- [ ] **Monthly drill scheduled**
- [ ] **Communication templates** shared with team

**Status**: Ready for launch ✅
