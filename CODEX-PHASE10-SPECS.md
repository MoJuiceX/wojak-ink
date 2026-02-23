# Codex Phase 10 Specs — Observability, Debugging & Fraud Prevention

**Generated:** 2026-02-23 13:20 UTC  
**Status:** Ready for execution Week 4 post-launch  
**Effort Estimate:** 12-16 hours total  
**Priority:** Critical (prevents outages + fraud losses)

---

## Overview

Phase 10 transforms wojak-ink from "we hope it doesn't break" to "we know exactly what's happening."

**Goals:**
- ✅ See every error (session replay + stack traces)
- ✅ Find bottlenecks (performance profiling)
- ✅ Prevent fraud (rate limiting + behavior analysis)
- ✅ Reduce support load (users can debug themselves)

---

## 1. SESSION REPLAY & DEBUGGING (4-5h)

**Impact:** Reduces bug resolution time from 30 min → 2 min

### Task 1A: Install Sentry Session Replay (1-2h)

**Steps:**

1. **Add Sentry to dependencies:**
   ```bash
   npm install @sentry/react @sentry/tracing
   ```

2. **Initialize Sentry with Session Replay:**
   ```typescript
   // src/main.tsx
   import * as Sentry from "@sentry/react";
   
   Sentry.init({
     dsn: process.env.VITE_SENTRY_DSN,
     integrations: [
       new Sentry.Replay({
         maskAllText: true,
         blockAllMedia: true,
       }),
     ],
     replaysSessionSampleRate: 0.1, // 10% of sessions
     replaysOnErrorSampleRate: 1.0,  // 100% of errors
   });
   ```

3. **Wrap app with Sentry:**
   ```typescript
   export default Sentry.withProfiler(App);
   ```

4. **Create .env variables:**
   ```
   VITE_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
   VITE_SENTRY_ENVIRONMENT=production
   ```

### Task 1B: Link Sessions to Errors (1h)

**What:** When error happens, you see the session replay + what user did before

**Steps:**

```typescript
// When user reports error, include session ID
Sentry.captureException(error, {
  tags: {
    "session.id": Sentry.getClient()?.getSession()?.sid,
  },
});
```

### Task 1C: Test Session Replay (30min)

**Steps:**

1. **Trigger error locally:**
   ```bash
   throw new Error("Test error");
   ```

2. **View in Sentry dashboard:**
   - Error shows up in Sentry UI
   - Click "Replay" → see exact user session
   - Can play back clicks, inputs, page changes

### Definition of Done
- ✅ Sentry configured with session replay
- ✅ 90% of errors have replay attached
- ✅ Support team can replay user sessions
- ✅ Bug resolution time -50%

---

## 2. ERROR SOURCE MAPS & STACK TRACES (2-3h)

**Impact:** Know exact line of code that caused error

### Task 2A: Configure Source Maps (1-2h)

**Steps:**

1. **Vite already generates source maps, verify:**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       sourcemap: true, // generates .map files
     },
   });
   ```

2. **Upload source maps to Sentry:**
   ```bash
   npm install -D @sentry/cli
   ```

3. **Create Sentry config:**
   ```bash
   # .sentryclirc
   [auth]
   token=YOUR_SENTRY_TOKEN
   
   [defaults]
   url=https://sentry.io/
   org=your-org
   project=your-project
   ```

4. **Upload on build:**
   ```bash
   # package.json
   "build": "vite build && sentry-cli releases upload-sourcemaps dist/"
   ```

### Task 2B: Test Stack Traces (30min)

**Steps:**

1. **Trigger error from minified code:**
   - Error in Sentry shows minified → readable code
   - Line number + function name visible
   - Can click to see surrounding code

### Definition of Done
- ✅ Source maps uploaded to Sentry
- ✅ Errors show readable code (not minified)
- ✅ Line numbers accurate
- ✅ Can jump to code from error

---

## 3. PERFORMANCE TRACES (2-3h)

**Impact:** Know exactly where app is slow

### Task 3A: Setup Performance Monitoring (1-2h)

**Steps:**

1. **Initialize Sentry Performance:**
   ```typescript
   // src/main.tsx
   Sentry.init({
     tracesSampleRate: 0.1, // 10% of transactions
     integrations: [
       new Sentry.BrowserTracing(),
     ],
   });
   ```

2. **Add custom traces around slow operations:**
   ```typescript
   // src/games/Calculator.tsx
   const calculateScore = async () => {
     const transaction = Sentry.startTransaction({
       name: "calculateScore",
       op: "compute",
     });
     
     const result = await expensiveCalculation();
     
     transaction.finish();
     return result;
   };
   ```

3. **Track API calls:**
   ```typescript
   // Automatically tracked by BrowserTracing
   // Shows: request time, response time, network latency
   fetch('/api/leaderboard').then(...)
   ```

### Task 3B: Analyze Performance Waterfall (30min)

**Steps:**

1. **View in Sentry Performance page:**
   - See timeline: "API call took 200ms, React render 1500ms, other 100ms"
   - Identify bottlenecks quickly
   - Correlate slow transactions with user reports

### Definition of Done
- ✅ Performance monitoring active
- ✅ All API calls traced
- ✅ Custom operations traced (game render, etc.)
- ✅ Can identify bottlenecks in <1 min

---

## 4. FRAUD DETECTION & PREVENTION (3-4h)

**Impact:** Prevent cheating, chargebacks, account abuse

### Task 4A: Rate Limiting on Purchases (1-2h)

**What:** Prevent credit card testing (trying many cards to see which one works)

**Steps:**

1. **Add rate limiting middleware:**
   ```typescript
   // functions/api/purchase.ts
   const rateLimiter = rateLimit({
     interval: 60, // per minute
     uniqueTokenPerInterval: 500,
   });
   
   const handler = async (req, res) => {
     await rateLimiter.check(res, 5, req.user.id); // 5 purchases/min per user
     
     // If rate limit exceeded, return 429
     // After 5 purchases/min, user gets cooldown
   };
   ```

2. **Track by card fingerprint:**
   ```typescript
   // Same card used by 10 different accounts? Fraud.
   const cardHash = sha256(cardNumber);
   const accountCount = await db.query(
     "SELECT COUNT(*) FROM transactions WHERE card_hash = ?", 
     [cardHash]
   );
   
   if (accountCount > 5) {
     block_transaction("Multiple accounts, same card");
   }
   ```

### Task 4B: Device Fingerprinting (1h)

**What:** Detect 1 person with 100 accounts

**Steps:**

1. **Install fingerprintjs2:**
   ```bash
   npm install fingerprintjs2
   ```

2. **Generate device fingerprint:**
   ```typescript
   // src/utils/deviceId.ts
   import Fingerprint2 from "fingerprintjs2";
   
   export const getDeviceId = async () => {
     const fingerprint = await Fingerprint2.getAsync();
     return fingerprint.map(f => f.value).join('');
   };
   ```

3. **Track accounts per device:**
   ```typescript
   const deviceId = await getDeviceId();
   const accountCount = await db.query(
     "SELECT COUNT(*) FROM users WHERE device_id = ?",
     [deviceId]
   );
   
   if (accountCount > 10) {
     flag_device_for_investigation();
   }
   ```

### Task 4C: Behavior Analysis (1h)

**What:** Detect impossible stats (99% win rate = bot)

**Steps:**

```typescript
// Check for cheating patterns
const stats = await getUserStats(userId);

const suspiciousPatterns = {
  // Human: 40-60% win rate
  // Bot: 95%+ win rate
  impossibleWinRate: stats.winRate > 0.90,
  
  // Human: needs ~5 sec per move
  // Bot: <100ms per move
  inhuman_speed: stats.avgResponseTime < 0.1,
  
  // Human: plays 5-10 games/day
  // Bot: plays 100+ games/day
  excessive_activity: stats.gamesPerDay > 50,
};

if (Object.values(suspiciousPatterns).some(v => v)) {
  await flagAccountForInvestigation(userId, suspiciousPatterns);
}
```

### Definition of Done
- ✅ Rate limiting: 5 purchases/min per user
- ✅ Device fingerprinting: detect multi-accounting
- ✅ Behavior analysis: flag suspicious play patterns
- ✅ <2% chargeback rate
- ✅ <5% fraud detected

---

## 5. SUPPORT TOOLS & DEBUGGING (1-2h)

**Impact:** Reduce support tickets, self-service debugging

### Task 5A: Diagnostics Page (1h)

**What:** User can see their own diagnostics (useful for support)

**Steps:**

```typescript
// src/pages/Diagnostics.tsx
export const DiagnosticsPage = () => {
  const [diagnostics, setDiagnostics] = useState({
    userId: user.id,
    deviceId: await getDeviceId(),
    browser: navigator.userAgent,
    locale: navigator.language,
    memory: performance.memory?.usedJSHeapSize,
    lastError: Sentry.getLastError(),
    sessionId: Sentry.getClient()?.getSession()?.sid,
  });
  
  return (
    <div>
      <h1>Diagnostics</h1>
      <p>Share this with support if you encounter issues:</p>
      <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
      <button onClick={() => copyToClipboard(JSON.stringify(diagnostics))}>
        Copy & Share with Support
      </button>
    </div>
  );
};
```

### Task 5B: Error Messages (30min)

**What:** Better error messages that help users (and you understand the problem)

**Steps:**

```typescript
const errorMessages = {
  'INVALID_CARD': 'Card was declined. Try a different card.',
  'RATE_LIMITED': 'Too many purchase attempts. Wait 1 minute.',
  'DEVICE_FRAUD': 'Too many accounts on this device. Contact support.',
  'GAME_CRASH': `Game crashed. Session: ${sessionId}. Share this ID with support.`,
};
```

### Definition of Done
- ✅ Users can self-diagnose issues
- ✅ Error messages are helpful
- ✅ Support tickets -30%

---

## Implementation Timeline

**Day 1:** Tasks 1A-1C (Session replay setup)  
**Day 2:** Tasks 2A-2B (Source maps)  
**Day 3:** Tasks 3A-3B (Performance traces)  
**Day 4-5:** Tasks 4A-4C (Fraud prevention)  
**Day 6:** Task 5A-5B (Support tools)  
**Day 7:** Testing + documentation

---

## Success Metrics

**Observability:**
- ✅ 90% of errors have session replay
- ✅ Bug resolution time: 30 min → 2 min
- ✅ Stack traces 100% readable

**Fraud Prevention:**
- ✅ <2% chargeback rate (industry avg 0.1%)
- ✅ <5% of revenue lost to fraud
- ✅ Multi-accounting detection: 98% accuracy

**Support:**
- ✅ Support ticket volume -30%
- ✅ Self-service diagnostics used 50% of time

---

**Phase 10 transforms debugging from guesswork to precision. Codex standing by. 🚀**
