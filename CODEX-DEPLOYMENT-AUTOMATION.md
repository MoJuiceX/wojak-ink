# Codex Deployment Automation & Feature Flags

**Generated:** 2026-02-23 13:30 UTC  
**Status:** Ready for implementation  
**Effort Estimate:** 30 minutes  
**ROI:** Critical (safe deployments, zero-downtime releases, instant rollbacks)

---

## Overview

**Current State (Phase 7):** All-or-nothing deployments (deploy to 100% of traffic immediately).  
**Problem:** If there's a bug, 100% of users are affected.  
**Solution:** Canary deployments (5% → 50% → 100%) + Feature flags (toggle features server-side).

**Outcome:** Deploy with confidence, rollback in seconds if needed.

---

## 1. FEATURE FLAGS INFRASTRUCTURE (12 min)

### Task 1A: Install Feature Flag Library

```bash
npm install unleash-client-js unleash-proxy-client
```

### Task 1B: Setup Unleash Server

**Option 1: Hosted Unleash (easiest)**
```
Sign up at https://www.getunleash.io/
Get API token
Create project "wojak-ink"
```

**Option 2: Self-hosted**
```bash
docker run -d \
  -p 4242:4242 \
  -e DATABASE_URL="postgres://user:pass@db:5432/unleash" \
  unleashio/unleash-server:latest
```

### Task 1C: Initialize Feature Flags in App

**File: `src/lib/flags.ts`**

```typescript
import { Client } from 'unleash-client-js';

export const flags = new Client({
  url: 'https://api.getunleash.io/client/features',
  clientKey: process.env.VITE_UNLEASH_API_KEY,
  appName: 'wojak-ink',
  environment: process.env.NODE_ENV,
  strategies: [
    {
      name: 'default',
      parameters: {},
    },
  ],
});

// Usage in components
export const useFeature = (flagName: string, defaultValue = false) => {
  return flags.isEnabled(flagName, { userId: currentUser.id }, defaultValue);
};
```

### Task 1D: Create Flags for New Features

**Unleash Dashboard → Create Flags:**

1. **Flag: `multiplayer-battles`**
   - Description: Enable/disable multiplayer battle feature
   - Variants: on/off
   - Rollout strategy: Gradually increase % (5% → 25% → 50% → 100%)

2. **Flag: `new-ui-theme`**
   - Description: New dark mode UI theme
   - Rollout: 10% of users
   - Can be toggled off instantly if bugs found

3. **Flag: `performance-optimizations`**
   - Description: Enable new rendering optimization
   - Rollout: 25% first, monitor metrics
   - Dependent on metrics (latency < 200ms before full rollout)

### Task 1E: Use Flags in Code

```typescript
// src/components/GameSelector.tsx
import { useFeature } from '@/lib/flags';

export const GameSelector = () => {
  const hasMultiplayer = useFeature('multiplayer-battles');
  const hasNewUI = useFeature('new-ui-theme');
  
  return (
    <div>
      <h1>{hasNewUI ? 'Dark Mode' : 'Light Mode'}</h1>
      
      {hasMultiplayer && (
        <div>
          <button onClick={startMultiplayerGame}>Play Online</button>
        </div>
      )}
    </div>
  );
};
```

### Task 1F: Track Flag Usage

```typescript
// src/lib/analytics.ts
export const trackFlagUsage = (flagName: string, enabled: boolean) => {
  metrics.counter('feature_flag_usage', {
    flag: flagName,
    enabled: enabled.toString(),
  });
};

// In hooks
export const useFeature = (flagName: string, defaultValue = false) => {
  const enabled = flags.isEnabled(flagName, defaultValue);
  
  useEffect(() => {
    trackFlagUsage(flagName, enabled);
  }, [enabled, flagName]);
  
  return enabled;
};
```

---

## 2. CANARY DEPLOYMENT SETUP (10 min)

### Task 2A: Create Deployment Strategy

**Phase 1: Canary (5% of traffic)**
```bash
# Deploy new version to 5% of traffic
# Monitor for 5 minutes
# If error rate < 0.5%, proceed to Phase 2
```

**Phase 2: Gradual Rollout (25% → 50% → 100%)**
```bash
# After 5 min at 5%: increase to 25%
# After 10 min at 25%: increase to 50%
# After 10 min at 50%: increase to 100%
```

**Phase 3: Rollback**
```bash
# If error rate > 0.5% at any point
# Automatically rollback to previous version
```

### Task 2B: Configure GitHub Actions for Canary

**File: `.github/workflows/canary-deploy.yml`**

```yaml
name: Canary Deployment

on:
  workflow_dispatch:  # Manual trigger only
    inputs:
      percentage:
        description: 'Traffic percentage (5, 25, 50, 100)'
        required: true
        default: '5'

jobs:
  canary-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: |
          docker build -t wojak-ink:${{ github.sha }} .
          docker tag wojak-ink:${{ github.sha }} wojak-ink:canary
      
      - name: Push to Registry
        run: |
          docker login -u ${{ secrets.DOCKER_USER }} -p ${{ secrets.DOCKER_PASS }}
          docker push wojak-ink:canary
      
      - name: Deploy Canary (5% traffic)
        if: github.event.inputs.percentage == '5'
        run: |
          kubectl set image deployment/wojak-ink-api \
            api=wojak-ink:canary \
            --record=true
          
          kubectl rollout status deployment/wojak-ink-api --timeout=5m
      
      - name: Run Health Checks
        run: |
          ./scripts/health-check.sh
      
      - name: Monitor Error Rate
        run: |
          ERROR_RATE=$(kubectl logs -l app=wojak-ink-api --tail=1000 | grep ERROR | wc -l)
          
          if (( ERROR_RATE > 5 )); then
            echo "Error rate too high, rolling back"
            kubectl rollout undo deployment/wojak-ink-api
            exit 1
          fi
      
      - name: Increase Traffic (on success)
        if: success()
        run: |
          echo "✅ Canary successful at 5%, ready for next phase"
          echo "Next: Manually trigger with percentage=25"
```

### Task 2C: Automated Canary with Argo Rollouts

**Install Argo Rollouts:**
```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/download/stable/install.yaml
```

**Define Rollout Strategy:**

**File: `k8s/rollout.yaml`**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: wojak-ink-api
spec:
  replicas: 10
  selector:
    matchLabels:
      app: wojak-ink-api
  template:
    metadata:
      labels:
        app: wojak-ink-api
    spec:
      containers:
      - name: api
        image: wojak-ink:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  
  # Canary strategy: 5% → 25% → 50% → 100%
  strategy:
    canary:
      steps:
      - setWeight: 5
      - pause:
          duration: 5m
      - setWeight: 25
      - pause:
          duration: 10m
      - setWeight: 50
      - pause:
          duration: 10m
      - setWeight: 100
      
      # Automatic rollback on error rate
      analysis:
        interval: 1m
        threshold: 3
        unsuccessful: 3
```

**Trigger Rollout:**
```bash
# New deployment automatically starts canary
kubectl set image rollout/wojak-ink-api api=wojak-ink:new-version
```

---

## 3. AUTOMATED HEALTH CHECKS (5 min)

### Task 3A: Create Health Check Endpoint

**File: `functions/api/health.ts`**

```typescript
export async function health(req: Request) {
  const checks = {
    database: await checkDatabase(),
    cache: await checkCache(),
    external_apis: await checkExternalAPIs(),
    memory: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
  };
  
  const healthy = Object.values(checks).every(v => 
    typeof v === 'boolean' ? v : v < 0.9
  );
  
  return new Response(JSON.stringify(checks), {
    status: healthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function checkCache() {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

async function checkExternalAPIs() {
  try {
    await fetch('https://api-external.com/health');
    return true;
  } catch {
    return false;
  }
}
```

### Task 3B: Configure Kubernetes Health Checks

**File: `k8s/health.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: wojak-ink-api
spec:
  selector:
    app: wojak-ink-api
  ports:
  - port: 3000
    targetPort: 3000

---
apiVersion: v1
kind: Pod
metadata:
  name: wojak-ink-api
spec:
  containers:
  - name: api
    image: wojak-ink:latest
    
    # Startup probe: give app time to start
    startupProbe:
      httpGet:
        path: /api/health
        port: 3000
      failureThreshold: 30
      periodSeconds: 10
    
    # Readiness probe: is app ready to receive traffic?
    readinessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 3
    
    # Liveness probe: is app alive?
    livenessProbe:
      httpGet:
        path: /api/health
        port: 3000
      initialDelaySeconds: 15
      periodSeconds: 20
      failureThreshold: 3
```

### Task 3C: Run Health Checks Script

**File: `scripts/health-check.sh`**

```bash
#!/bin/bash

# Check API responsiveness
echo "🔍 Checking API health..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null https://api.wojak-ink.com/api/health)

if [ "$RESPONSE" -eq 200 ]; then
  echo "✅ API healthy"
else
  echo "❌ API unhealthy (HTTP $RESPONSE)"
  exit 1
fi

# Check database
echo "🔍 Checking database..."
DB_RESPONSE=$(curl -s https://api.wojak-ink.com/api/health | jq .database)

if [ "$DB_RESPONSE" == "true" ]; then
  echo "✅ Database healthy"
else
  echo "❌ Database unhealthy"
  exit 1
fi

# Check error rate
echo "🔍 Checking error rate..."
ERROR_COUNT=$(grep -c "ERROR" /var/log/app.log 2>/dev/null || echo "0")

if [ "$ERROR_COUNT" -lt 10 ]; then
  echo "✅ Error rate acceptable ($ERROR_COUNT errors)"
else
  echo "❌ Error rate too high ($ERROR_COUNT errors)"
  exit 1
fi

echo "✅ All health checks passed"
```

---

## 4. AUTOMATED ROLLBACK (5 min)

### Task 4A: Rollback on Error

**File: `.github/workflows/auto-rollback.yml`**

```yaml
name: Auto Rollback

on:
  workflow_run:
    workflows: ["Canary Deployment"]
    types: [completed]

jobs:
  monitor:
    runs-on: ubuntu-latest
    if: failure()
    
    steps:
      - name: Check Error Rate
        run: |
          ERROR_RATE=$(curl -s https://sentry.io/api/projects/.../ | jq .stats.error_rate)
          
          if (( $(echo "$ERROR_RATE > 0.005" | bc -l) )); then
            echo "❌ Error rate > 0.5%, rolling back"
            exit 1
          fi
      
      - name: Rollback Deployment
        if: failure()
        run: |
          kubectl rollout undo deployment/wojak-ink-api
          kubectl rollout status deployment/wojak-ink-api --timeout=5m
      
      - name: Notify Team
        if: failure()
        run: |
          curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
            -d '{"text": "❌ Deployment rolled back due to high error rate"}'
```

### Task 4B: Manual Rollback Command

```bash
# Quick rollback (if something breaks)
kubectl rollout undo deployment/wojak-ink-api

# Check rollout history
kubectl rollout history deployment/wojak-ink-api

# Rollback to specific revision
kubectl rollout undo deployment/wojak-ink-api --to-revision=2

# Verify rollback
kubectl rollout status deployment/wojak-ink-api
```

---

## 5. DEPLOYMENT MONITORING (5 min)

### Task 5A: Track Deployments

**File: `src/lib/deployment.ts`**

```typescript
export const logDeploymentEvent = async (event: DeploymentEvent) => {
  await db.query(`
    INSERT INTO deployment_events (deployment_id, event_type, timestamp, details)
    VALUES (?, ?, ?, ?)
  `, [event.deploymentId, event.type, new Date(), JSON.stringify(event)]);
};

export enum DeploymentEventType {
  STARTED = 'deployment_started',
  CANARY_5 = 'canary_5_percent',
  CANARY_25 = 'canary_25_percent',
  CANARY_50 = 'canary_50_percent',
  COMPLETED = 'deployment_completed',
  ROLLED_BACK = 'deployment_rolled_back',
}

// Log in CI/CD
await logDeploymentEvent({
  deploymentId: process.env.GITHUB_RUN_ID,
  type: DeploymentEventType.STARTED,
  details: {
    commit: process.env.GITHUB_SHA,
    branch: process.env.GITHUB_REF,
  },
});
```

### Task 5B: Create Deployment Dashboard

**Prometheus metrics:**

```
# Number of deployments
deployment_total{status="success|failed|rolled_back"}

# Time to deploy
deployment_duration_seconds

# Error rate during deployment
deployment_error_rate

# Rollback rate
deployment_rollback_rate
```

**Grafana Dashboard:**
- Deployments per week
- Success/failure ratio
- Average time to deploy
- Rollback frequency
- Error rate before/after deployment

---

## Definition of Done

✅ Feature flags infrastructure implemented  
✅ Canary deployment pipeline working  
✅ Automated health checks passing  
✅ Rollback procedure tested & documented  
✅ Monitoring & alerting configured  
✅ Team trained on deployment process  

---

## Deployment Checklist (Phase 7 Enhanced)

```
Pre-Deployment:
  ☐ All tests passing
  ☐ Code review approved
  ☐ Feature flags created for new features
  ☐ Rollback procedure documented

Canary Phase (5%):
  ☐ Monitor error rate < 0.5%
  ☐ Monitor latency < 500ms
  ☐ Wait 5 minutes

Gradual Rollout:
  ☐ 5% → 25% (wait 10 min)
  ☐ 25% → 50% (wait 10 min)
  ☐ 50% → 100% (full deployment)

Post-Deployment:
  ☐ Monitor for 30 minutes
  ☐ Check Sentry for new errors
  ☐ Notify team on Slack
  ☐ Update changelog
```

---

**Deployments now safe, automated, and rollback-able in seconds.** 🚀
