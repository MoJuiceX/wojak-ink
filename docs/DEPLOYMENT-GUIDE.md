# Deployment Guide (v1.0.0)

**Target Environment**: Cloudflare Pages + Workers  
**Status**: Ready for production deployment  
**Last Updated**: 2026-02-23

---

## Quick Start: Deploy to Production

```bash
# 1. Build production bundle
npm run build

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=wojak-ink

# 3. Monitor deployment (5 minutes)
# Check Cloudflare Pages dashboard for build completion
# Verify https://wojak.ink loads without errors

# 4. Run smoke tests
npm test
# Expected: All tests pass
```

**Expected Time**: 5-10 minutes  
**Rollback**: See [ROLLBACK-PROCEDURE.md](./ROLLBACK-PROCEDURE.md)

---

## Pre-Deployment Checklist

### 24 Hours Before Launch

- [ ] All tests passing: `npm run test:unit` + `npm test`
- [ ] Bundle budget passes: `npm run bundle:report`
- [ ] No lint violations: `npm run lint:scoped -- --max-warnings=0`
- [ ] Performance baseline documented: `docs/PERFORMANCE-BASELINE.md`
- [ ] Environment variables configured (see below)
- [ ] Database migrations applied (if any)
- [ ] Workers cron jobs configured

### Environment Variables (Production)

Create `.env` or configure in Cloudflare Pages:

```bash
# Authentication (Clerk)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_CLERK_SIGN_IN_URL=/sign-in
VITE_CLERK_SIGN_UP_URL=/sign-up

# API Keys (External Services)
VITE_MINTGARDEN_API_KEY=[if needed]
VITE_SPACESCAN_API_KEY=[if needed]

# Database (Cloudflare D1)
DB_API_TOKEN=[cloudflare-api-token]
DB_ACCOUNT_ID=[your-account-id]
DB_DATABASE_ID=[database-id]

# Workers (for cron jobs)
WORKER_INTERVAL_MINUTES=60  # How often to run background tasks
```

**Get Cloudflare Credentials**:
```bash
# 1. Go to https://dash.cloudflare.com/account/api-tokens
# 2. Create token with Cloudflare Pages deploy permission
# 3. Copy token and save to environment
```

---

## Deployment Steps (Detailed)

### Step 1: Build Production Bundle

```bash
# Install dependencies (if fresh checkout)
npm ci

# Lint check (pre-deployment quality gate)
npm run lint:scoped -- --max-warnings=0
# Expected: No errors, 0 warnings

# Run tests
npm run test:unit
npm test
# Expected: All tests pass

# Build for production
npm run build
# Expected: dist/ folder created, <1min duration

# Validate bundle
npm run bundle:report
# Expected: 0 hard breaches (all assets <406kB)
ls -lh dist/
# Expected: dist/ folder ~200-400MB (including source maps)
```

### Step 2: Deploy to Cloudflare Pages

#### Option A: Using Wrangler CLI

```bash
# Install wrangler (if not already)
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
# Follow browser prompts to authenticate

# Deploy
npx wrangler pages deploy dist --project-name=wojak-ink

# Output:
# ✓ Uploading... 
# ✓ Success! Your site is live at https://wojak-ink.[pages-domain]

# If using custom domain (wojak.ink):
# - Verify in Cloudflare dashboard
# - DNS should point to Cloudflare Pages
```

#### Option B: Using Git Integration (Recommended)

```bash
# Set up once:
# 1. Push code to GitHub (main branch)
# 2. Go to https://dash.cloudflare.com/pages
# 3. Connect GitHub repo
# 4. Set build command: npm run build
# 5. Set publish directory: dist
# 6. Deploy will trigger automatically on push

# Subsequent deploys:
git push origin main
# Cloudflare automatically builds and deploys
```

### Step 3: Configure CDN & Caching

**Via Cloudflare Dashboard**:

1. Go to **Caching** tab
   - Set cache level to "Cache Everything"
   - Browser cache TTL: 4 hours
   - Edge cache TTL: 7 days

2. Go to **Rules** tab
   - Add rule to cache `/assets/*` for 30 days (immutable)
   - Add rule to skip cache for API routes (`/api/*`)

3. Go to **Speed** tab
   - Enable Brotli compression
   - Enable minification (JS, CSS, HTML)
   - Enable Rocket Loader (optional, for third-party scripts)

### Step 4: Configure Workers (Background Jobs)

If using Cloudflare Workers for cron tasks (did-indexer, credit-tracker, fetch-sales):

```bash
# Deploy workers
npm run build:workers
npx wrangler publish

# Schedule cron jobs
# Edit wrangler.toml:
[env.production]
triggers.crons = [
  "0 */6 * * *",  # Every 6 hours: did-indexer
  "0 * * * *",    # Every hour: credit-tracker
  "0 */4 * * *"   # Every 4 hours: fetch-sales
]
```

### Step 5: Database Migrations

If deploying new schema changes:

```bash
# Apply migrations to production D1
wrangler d1 execute wojak-ink --remote < migrations/[version]_[name].sql

# Verify migration applied
wrangler d1 execute wojak-ink --remote "SELECT * FROM _d1_migrations;"
```

### Step 6: Verify Deployment

```bash
# 1. Check deployment status
curl -I https://wojak.ink
# Expected: HTTP 200

# 2. Check bundle loads
curl -s https://wojak.ink | grep "<script" | head -3
# Expected: main.js, vendor chunks loaded

# 3. Test critical endpoints
curl https://wojak.ink/api/health
# Expected: 200 OK, {"status":"ok"}

# 4. Check error tracking initialized
# Open browser DevTools → Application → Cookies
# Look for Sentry session cookie (if configured)

# 5. Smoke test in browser
# Open https://wojak.ink
# Click around (games, gallery, etc.)
# Check DevTools console for errors
# Expected: No errors, smooth navigation
```

### Step 7: Monitor for Issues (First 30 Min)

```bash
# Watch error rate
watch -n 5 'curl -s -w "HTTP %{http_code}\n" https://wojak.ink'

# Check Sentry for new errors
# Go to: https://sentry.io/organizations/[org]/issues/

# Monitor metrics
# Cloudflare: https://dash.cloudflare.com/pages/view/[project]
# Expected: 0% error rate, <2s response times
```

---

## Deployment Checklist

Print and check off during deployment:

```
PRE-DEPLOYMENT
- [ ] npm run test:unit passes
- [ ] npm test passes
- [ ] npm run lint:scoped passes
- [ ] npm run bundle:report passes (0 hard breaches)
- [ ] Environment variables set
- [ ] Database migrations reviewed
- [ ] Team notified of deployment window

DEPLOYMENT
- [ ] Build succeeds: npm run build
- [ ] Wrangler authenticated: npx wrangler login
- [ ] Deploy succeeds: npx wrangler pages deploy dist
- [ ] URL accessible: curl https://wojak.ink
- [ ] Homepage loads: Browser smoke test
- [ ] No console errors: DevTools check

POST-DEPLOYMENT (30 MIN MONITORING)
- [ ] Error rate <1%: Sentry dashboard
- [ ] Response time <200ms p95: Cloudflare analytics
- [ ] User traffic normal: Analytics
- [ ] No user complaints: Discord/support
- [ ] Rollback plan ready (if needed): See ROLLBACK-PROCEDURE.md

FINAL
- [ ] Update StatusPage.io: "v1.0.0 deployed successfully"
- [ ] Post to Twitter/Discord: Launch announcement
- [ ] Document deployment: git tag v1.0.0-deployed
```

---

## Troubleshooting Deployment

### Build Fails: `npm run build` errors

```bash
# Clear cache and retry
rm -rf node_modules dist
npm ci
npm run build

# If still fails, check:
npm run lint:scoped
npm run test:unit
# Fix any errors, then retry build
```

### Deploy Fails: Wrangler auth error

```bash
# Re-authenticate
npx wrangler logout
npx wrangler login
# Follow browser prompts

# Retry deploy
npx wrangler pages deploy dist --project-name=wojak-ink
```

### Deploy Succeeds But Site Down

```bash
# 1. Check deployment status
# Cloudflare Pages dashboard → Deployments → see if latest succeeded

# 2. Check build logs
# Same page → click "View build log"
# Look for build errors or missing assets

# 3. Check DNS
# Make sure CNAME points to: [pages-project].pages.dev

# 4. Clear browser cache
# Shift+Reload (hard refresh) in DevTools

# 5. Rollback if needed
# See ROLLBACK-PROCEDURE.md
```

### Performance Degraded Post-Deploy

```bash
# Check bundle size didn't grow
npm run bundle:report

# Check CDN cache hit ratio
# Cloudflare dashboard → Analytics → Cache stats

# Invalidate cache (force fresh download)
# Cloudflare dashboard → Caching → Purge cache
# Purge All

# Re-verify performance
npm run test:unit  # Quick sanity check
# Open https://wojak.ink in browser
# DevTools → Network tab → reload
# Check main bundle load time (should be <2s)
```

---

## Rollback

If critical issues found after deployment:

```bash
# See docs/ROLLBACK-PROCEDURE.md for full procedure
# Quick version:

git checkout v1.0.0-launch  # Or previous stable tag
npm run build
npx wrangler pages deploy dist --project-name=wojak-ink
# Confirm site recovered
# Monitor error rate for 10 minutes
```

---

## Monitoring & Observability

Once live, monitor health constantly:

- **Error Rate**: Target <1% (alert >5%)
- **Response Time**: Target <200ms p95 (alert >500ms)
- **Bundle Load**: Target <2s (alert >3s)
- **Uptime**: Target 99.9% (alert if down >5min)

See [MONITORING-GUIDE.md](./MONITORING-GUIDE.md) for detailed setup.

---

## Scheduled Maintenance

### Weekly
- Review error logs (Sentry)
- Check worker health (did-indexer, credit-tracker, fetch-sales)
- Monitor user feedback (Discord, support tickets)

### Monthly
- Review performance metrics
- Optimize slow database queries (if any)
- Update security patches
- Run rollback drill (practice)

### Quarterly
- Review cost (Cloudflare, D1, Workers)
- Plan capacity upgrades (if needed)
- Update dependencies (npm audit, npm outdated)

---

## Disaster Recovery

### Complete Data Loss

```bash
# If database corrupted, restore from backup

# 1. Check backup availability
# Cloudflare D1 keeps automatic backups (7 days)

# 2. Restore from backup
wrangler d1 backup-list wojak-ink --remote
wrangler d1 restore wojak-ink [backup-id] --remote

# 3. Re-run migrations (if needed)
wrangler d1 execute wojak-ink --remote < migrations/latest.sql

# 4. Verify data integrity
# Spot-check some records in database
```

### Keys/Credentials Compromised

```bash
# 1. Rotate Clerk keys
# Clerk dashboard → Settings → API keys → Regenerate

# 2. Rotate Cloudflare tokens
# Cloudflare dashboard → Account → API Tokens → Create new

# 3. Update environment variables
# Cloudflare Pages → Settings → Environment variables

# 4. Redeploy to activate new keys
npm run build && npx wrangler pages deploy dist
```

---

## Links

- **Live Site**: https://wojak.ink
- **Cloudflare Pages**: https://dash.cloudflare.com/pages
- **Cloudflare D1**: https://dash.cloudflare.com/account/pages/databases
- **Monitoring**: See [MONITORING-GUIDE.md](./MONITORING-GUIDE.md)
- **Rollback**: See [ROLLBACK-PROCEDURE.md](./ROLLBACK-PROCEDURE.md)

---

**Deployment Status**: ✅ Ready for v1.0.0 production launch
