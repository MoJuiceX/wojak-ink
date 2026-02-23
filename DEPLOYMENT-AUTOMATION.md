# Deployment Automation & Canary Releases

Complete guide to safe, automated deployments with instant rollback capability.

## Overview

This spec enables:
- ✅ Feature flags for server-side feature control
- ✅ Canary deployments (5% → 25% → 50% → 100%)
- ✅ Automated health checks at each stage
- ✅ Instant rollback on failure
- ✅ Zero-downtime deployments

## Quick Start

### 1. Deploy to Production (Automated Canary)

```bash
# Push to main branch - triggers canary automatically
git push origin main

# Monitors canary for 5 minutes
# If successful, continues to next phase
# If error rate > 0.5%, rolls back automatically
```

### 2. Manual Canary Control

```bash
# Trigger 5% canary (first phase)
gh workflow run canary-deploy.yml -f percentage=5

# After 5 minutes, if healthy:
gh workflow run canary-deploy.yml -f percentage=25

# After 5 more minutes:
gh workflow run canary-deploy.yml -f percentage=50

# Final phase:
gh workflow run canary-deploy.yml -f percentage=100
```

### 3. Manual Rollback

```bash
# Immediate rollback to previous version
kubectl rollout undo rollout/wojak-ink-api -n default

# Verify rollback
kubectl rollout status rollout/wojak-ink-api -n default
```

## Architecture

### Feature Flag Flow

```
Feature Request
  ↓
Check Feature Flag (with cache)
  ↓
Hit? Return cached value (1ms)
  ↓
Miss? Fetch from Unleash (50-100ms)
  ↓
Evaluate strategy (user%, time-based)
  ↓
Cache result (1 minute TTL)
  ↓
Route to correct code path
```

### Deployment Flow

```
Push to main
  ↓
Build Docker image
  ↓
Deploy to Kubernetes (5% traffic)
  ↓
Monitor for 5 minutes
  ↓
Health: OK? → Continue to 25%
Error: HIGH? → Rollback immediately
  ↓
25% for 5 min → 50% for 5 min → 100%
  ↓
Notify Slack on success/failure
```

## Components

### Feature Flags (src/lib/flags.ts)

Control features without redeploying:

```typescript
// Check if feature enabled
const multiplayer = await featureFlags.isEnabled(
  'multiplayer-battles',
  { userId: user.id }
);

if (multiplayer) {
  // Show multiplayer UI
}
```

Feature flags to create in Unleash:
- `multiplayer-battles` - Canary: 5% → 25% → 50% → 100%
- `new-ui-theme` - Canary: 10%
- `performance-optimizations` - Canary: 25%

### Health Check (functions/api/health.ts)

Kubernetes probes check: `/api/health`

Returns:
- Database connectivity (primary + replica)
- Redis/cache status
- Memory usage
- Overall health status

### Canary Deployment (k8s/rollout.yaml)

Argo Rollouts specification:
- 5% traffic for 5 minutes
- 25% traffic for 5 minutes
- 50% traffic for 5 minutes
- 100% traffic (complete)
- Automatic rollback if error rate > 0.5%

### Monitoring

GitHub Actions monitors:
- Health checks
- Error rate (Prometheus)
- Database connectivity
- Redis connectivity

## Deployment Phases

### Phase 1: Canary (5% Traffic)

```
Duration: 5 minutes
Traffic: 5% of users
Monitoring: Error rate, latency, database
Success criteria:
  - Error rate < 0.5%
  - Latency p95 < 500ms
  - No database errors
  - Cache hit rate > 70%
```

### Phase 2: Gradual Rollout (25%)

```
Duration: 5 minutes
Traffic: 25% of users
Same success criteria as Phase 1
```

### Phase 3: Wider Rollout (50%)

```
Duration: 5 minutes
Traffic: 50% of users
Same success criteria
```

### Phase 4: Complete Rollout (100%)

```
Traffic: All users
Final rollout complete
```

## Rollback Scenarios

### Automatic Rollback Triggers

1. **Error Rate > 0.5%**
   - Automatically triggered
   - Rolls back to previous stable version
   - Notifies team on Slack

2. **Database Connectivity Lost**
   - Immediate rollback
   - Pages on-call engineer

3. **High Memory Usage**
   - Rolls back if heap usage > 90%

4. **Health Check Failures**
   - Readiness probe failures = traffic removed
   - Liveness probe failures = pod restart

### Manual Rollback

```bash
# Single command rollback
kubectl rollout undo rollout/wojak-ink-api -n default

# To specific version
kubectl rollout undo rollout/wojak-ink-api -n default --to-revision=2

# Check rollout history
kubectl rollout history rollout/wojak-ink-api -n default
```

## Files

### Configuration

| File | Purpose |
|------|---------|
| `k8s/rollout.yaml` | Argo Rollouts canary config |
| `k8s/pod-spec.yaml` | Pod health probes & resource limits |

### Code

| File | Purpose |
|------|---------|
| `src/lib/flags.ts` | Feature flag management |
| `functions/api/health.ts` | Health check endpoint |

### Workflows

| File | Purpose |
|------|---------|
| `.github/workflows/canary-deploy.yml` | Canary deployment automation |
| `.github/workflows/auto-rollback.yml` | Automatic rollback on failure |

## Monitoring & Alerts

### Prometheus Metrics

```
# Deployment metrics
deployment_total{status="success|failed|rolled_back"}
deployment_duration_seconds
deployment_error_rate
deployment_rollback_rate

# Pod metrics
http_requests_total
http_request_duration_seconds
```

### Grafana Dashboard

Create dashboard showing:
- Deployments per week
- Success/failure/rollback ratio
- Canary traffic percentage over time
- Error rate progression
- Latency p95 by phase

### Slack Alerts

Automatic Slack notifications for:
- ✅ Deployment successful (each phase)
- ❌ Rollback triggered
- ⚠️ Manual intervention needed

## Troubleshooting

### Deployment Stuck in Canary

```bash
# Check rollout status
kubectl get rollout wojak-ink-api -n default
kubectl describe rollout wojak-ink-api -n default

# Check analysis results
kubectl get analysisrun -n default
kubectl describe analysisrun <name> -n default

# Force complete (DANGEROUS)
kubectl patch rollout wojak-ink-api -p '{"status":{"phase":"Healthy"}}' -n default
```

### Health Check Failing

```bash
# Test health endpoint manually
curl https://api.wojak-ink.com/api/health | jq .

# Check logs
kubectl logs -l app=wojak-ink-api -n default --tail=100

# Check pod events
kubectl describe pod <pod-name> -n default
```

### Rollback Didn't Work

```bash
# Check rollout history
kubectl rollout history rollout/wojak-ink-api -n default

# Manually set image to previous version
kubectl set image rollout/wojak-ink-api \
  api=ghcr.io/wojak-ink/api:previous-tag \
  -n default

# Verify new pods are running
kubectl get pods -l app=wojak-ink-api -n default
```

## Best Practices

1. **Always test in staging first**
   - Deploy to staging with same canary config
   - Verify everything works
   - Then deploy to production

2. **Monitor metrics closely**
   - Watch error rate during each phase
   - Set alert thresholds conservatively
   - Better to rollback early than late

3. **Use feature flags for gradual rollout**
   - Don't rely solely on traffic percentage
   - Use feature flags to control exact behavior
   - Can disable instantly without redeployment

4. **Document breaking changes**
   - If API changes, document old + new versions
   - Use API versioning (see SPEC 4)
   - Client apps need time to update

5. **Keep canary window long enough**
   - 5 minutes = catch 95% of issues
   - Short windows miss low-frequency errors
   - Increase for critical deployments

## Environment Variables

```bash
# Kubernetes secrets
DATABASE_URL=postgresql://...
DATABASE_REPLICA_URL=postgresql://...
REDIS_HOST=redis.default.svc.cluster.local

# Feature flags
UNLEASH_API_KEY=...
UNLEASH_API_URL=https://api.getunleash.io

# Deployment config
KUBE_CONFIG=<base64-encoded>
SENTRY_AUTH_TOKEN=...
SLACK_WEBHOOK=https://hooks.slack.com/...
```

## Next Steps

After this spec:
1. ✅ Deployments are safe and automated
2. → Continue to SPEC 4: API Versioning (safe API evolution)
3. → Then SPEC 5: Caching Strategy (50% latency reduction)

## References

- Argo Rollouts: https://argoproj.io/projects/argo-rollouts
- Feature Flags: https://www.getunleash.io/
- Kubernetes Health Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Canary Deployments: https://martinfowler.com/bliki/CanaryRelease.html

---

**Safe, zero-downtime deployments with instant rollback. Ready for production.** 🚀
