# Codex Performance Profiling & Optimization

**Generated:** 2026-02-23 13:35 UTC  
**Effort:** 25 min  
**ROI:** Continuous 5-10% performance gains each month

---

## 1. AUTOMATIC PERFORMANCE PROFILING (12 min)

```typescript
export const profiler = {
  // CPU profiling
  async profileCPU(durationMs = 30000) {
    const v8Profiler = require('v8-profiler-next');
    
    const profile = v8Profiler.startProfiling('api');
    await sleep(durationMs);
    const cpuProfile = profile.stopProfiling();
    
    // Save to file
    await fs.writeFile(
      `profiles/cpu-${Date.now()}.json`,
      JSON.stringify(cpuProfile.export())
    );
    
    // Top functions by CPU time
    const topFunctions = cpuProfile.getTopDownRoot().children
      .sort((a, b) => b.selfTime - a.selfTime)
      .slice(0, 10);
    
    console.log('🔥 Top CPU consumers:');
    topFunctions.forEach((fn, i) => {
      console.log(`${i + 1}. ${fn.functionName}: ${(fn.selfTime / 1000).toFixed(2)}s`);
    });
    
    return topFunctions;
  },
  
  // Memory profiling
  async profileMemory() {
    const heapSnapshot = require('v8').writeHeapSnapshot();
    
    const snapshot = require('fs').readFileSync(heapSnapshot);
    console.log(`📦 Heap snapshot: ${(snapshot.length / 1024 / 1024).toFixed(2)}MB`);
    
    return snapshot;
  },
  
  // Run automatically weekly
  schedule: '0 2 * * 0',  // Sunday 2 AM
};

// Weekly auto-profiling
schedule.scheduleJob(profiler.schedule, async () => {
  console.log('📊 Running weekly performance profile');
  
  const cpuTop = await profiler.profileCPU();
  const memorySnapshot = await profiler.profileMemory();
  
  // Store for analysis
  await db.query(`
    INSERT INTO performance_profiles (type, data, created_at)
    VALUES ('cpu', ?, NOW()), ('memory', ?, NOW())
  `, [JSON.stringify(cpuTop), JSON.stringify(memorySnapshot)]);
});
```

---

## 2. REAL-TIME BOTTLENECK DETECTION (8 min)

```typescript
export const bottleneckDetector = {
  // Detect slow operations in real-time
  slowOperations: new Map<string, number[]>(),
  
  track(operationName: string, durationMs: number) {
    if (!this.slowOperations.has(operationName)) {
      this.slowOperations.set(operationName, []);
    }
    
    const times = this.slowOperations.get(operationName)!;
    times.push(durationMs);
    
    // Keep last 100 measurements
    if (times.length > 100) times.shift();
    
    // Calculate percentiles
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    // Alert if degradation detected
    if (durationMs > p99 * 1.5) {
      console.warn(`⚠️  Slow operation detected: ${operationName} (${durationMs}ms, p99: ${p99}ms)`);
      metrics.counter('slow_operation', { operation: operationName });
    }
  },
};

// Usage
export const withBottleneckTracking = async <T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    bottleneckDetector.track(operationName, duration);
  }
};
```

---

## 3. CONTINUOUS OPTIMIZATION (5 min)

```typescript
// Monthly optimization report
export const optimizationReport = async () => {
  const thisMonth = new Date();
  const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1);
  
  const thisMonthMetrics = await getMetricsForPeriod(lastMonth, thisMonth);
  const lastMonthMetrics = await getMetricsForPeriod(
    new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1),
    lastMonth
  );
  
  const improvements = {
    latencyImprovement: ((lastMonthMetrics.avgLatency - thisMonthMetrics.avgLatency) / lastMonthMetrics.avgLatency * 100).toFixed(1),
    throughputImprovement: ((thisMonthMetrics.rps - lastMonthMetrics.rps) / lastMonthMetrics.rps * 100).toFixed(1),
    costReduction: ((lastMonthMetrics.cost - thisMonthMetrics.cost) / lastMonthMetrics.cost * 100).toFixed(1),
  };
  
  console.log(`
    📊 Monthly Performance Report:
    - Latency improvement: ${improvements.latencyImprovement}%
    - Throughput improvement: ${improvements.throughputImprovement}%
    - Cost reduction: ${improvements.costReduction}%
  `);
  
  // Send to team
  await email.send({
    to: 'team@wojak-ink.com',
    subject: `📊 Performance Report: ${thisMonth.toLocaleDateString()}`,
    html: renderOptimizationReport(improvements),
  });
};

schedule.scheduleJob('0 0 1 * *', optimizationReport); // 1st of month
```

---

**Continuous profiling, bottleneck detection, monthly optimization reports.** 🚀
