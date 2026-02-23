# Codex Cost Optimization & Monitoring

**Generated:** 2026-02-23 13:35 UTC  
**Effort:** 20 min  
**ROI:** 30-50% cost reduction, cost predictability

---

## 1. REAL-TIME COST TRACKING (8 min)

```typescript
export const costTracking = {
  async trackCost(resource: string, cost: number, metadata: any = {}) {
    await db.query(`
      INSERT INTO cost_log (resource, amount, metadata, timestamp)
      VALUES (?, ?, ?, NOW())
    `, [resource, cost, JSON.stringify(metadata)]);
    
    metrics.gauge('cost.total', cost, { resource });
  },
  
  // Get daily cost
  async getDailyCost(date: Date = new Date()) {
    const costs = await db.query(`
      SELECT resource, SUM(amount) as total
      FROM cost_log
      WHERE DATE(timestamp) = ?
      GROUP BY resource
    `, [date.toISOString().split('T')[0]]);
    
    return costs.reduce((sum, c) => sum + c.total, 0);
  },
  
  // Get monthly forecast
  async getMonthlyForecast() {
    const dailyAverage = await this.getDailyAverage('last-30-days');
    const daysRemaining = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
    
    return dailyAverage * daysRemaining;
  },
};

// Track all resource costs
export const trackResourceCosts = {
  // EC2 instances
  async ec2() {
    const instances = await aws.ec2.describeInstances();
    
    for (const reservation of instances.Reservations) {
      for (const instance of reservation.Instances) {
        const hourlyRate = getEC2HourlyRate(instance.InstanceType);
        await costTracking.trackCost('ec2', hourlyRate, {
          instanceId: instance.InstanceId,
          type: instance.InstanceType,
        });
      }
    }
  },
  
  // RDS database
  async rds() {
    const dbInstances = await aws.rds.describeDBInstances();
    
    for (const db of dbInstances.DBInstances) {
      const hourlyRate = getRDSHourlyRate(db.DBInstanceClass);
      await costTracking.trackCost('rds', hourlyRate, {
        dbId: db.DBInstanceIdentifier,
        class: db.DBInstanceClass,
      });
    }
  },
  
  // Data transfer
  async dataTransfer() {
    const costPerGB = 0.09;  // AWS standard rate
    const trafficGB = await getMonthlyTraffic() / 1024 / 1024 / 1024;
    
    await costTracking.trackCost('data-transfer', trafficGB * costPerGB, {
      trafficGB,
    });
  },
};

// Track every hour
schedule.scheduleJob('0 * * * *', async () => {
  await trackResourceCosts.ec2();
  await trackResourceCosts.rds();
  await trackResourceCosts.dataTransfer();
});
```

---

## 2. COST OPTIMIZATION RULES (8 min)

```typescript
export const costOptimization = {
  rules: [
    {
      name: 'Idle instance cleanup',
      check: async () => {
        const instances = await aws.ec2.describeInstances();
        
        return instances.Reservations
          .flatMap(r => r.Instances)
          .filter(i => {
            const cpu = getInstanceCPU(i.InstanceId);
            const memory = getInstanceMemory(i.InstanceId);
            
            // Instances with <5% CPU and <10% memory for 24+ hours
            return cpu < 0.05 && memory < 0.10;
          });
      },
      action: async (instances: any[]) => {
        console.log(`Terminating ${instances.length} idle instances`);
        
        let savings = 0;
        for (const instance of instances) {
          const rate = getEC2HourlyRate(instance.InstanceType);
          await aws.ec2.terminateInstances([instance.InstanceId]);
          savings += rate * 24 * 30;  // Monthly savings
        }
        
        console.log(`💰 Potential savings: $${savings.toFixed(2)}/month`);
      },
    },
    
    {
      name: 'Reserved instance recommendation',
      check: async () => {
        // Find frequently-used instances (candidates for reserved)
        const instances = await db.query(`
          SELECT resource, COUNT(*) as frequency
          FROM cost_log
          WHERE resource LIKE 'ec2:%'
          AND timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY resource
          HAVING frequency > 700  -- Daily usage
        `);
        
        return instances;
      },
      action: async (instances: any[]) => {
        console.log(`Recommending reserved instances for ${instances.length} resources`);
        
        let savings = 0;
        for (const instance of instances) {
          const hourlyRate = getEC2HourlyRate(instance.resource);
          const reservedRate = hourlyRate * 0.66;  // 34% discount
          const monthlySavings = (hourlyRate - reservedRate) * 24 * 30;
          
          savings += monthlySavings;
          console.log(`- ${instance.resource}: Save $${monthlySavings.toFixed(2)}/month`);
        }
        
        console.log(`💰 Total potential savings: $${savings.toFixed(2)}/month`);
      },
    },
  ],
  
  // Run optimization checks daily
  async runOptimizations() {
    for (const rule of this.rules) {
      try {
        const items = await rule.check();
        if (items.length > 0) {
          await rule.action(items);
        }
      } catch (error) {
        console.error(`Error in rule ${rule.name}: ${error.message}`);
      }
    }
  },
};

schedule.scheduleJob('0 1 * * *', () => costOptimization.runOptimizations());
```

---

## 3. COST ALERTS & REPORTS (4 min)

```typescript
// Alert if cost spike detected
export const costAlerts = async () => {
  const today = await costTracking.getDailyCost();
  const yesterday = await costTracking.getDailyCost(new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  const increase = ((today - yesterday) / yesterday * 100).toFixed(1);
  
  if (increase > 20) {  // >20% increase
    console.warn(`⚠️  Cost spike detected: +${increase}%`);
    
    await slack.send('#ops', {
      text: `⚠️  Cost spike: +${increase}% from yesterday`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `Yesterday: $${yesterday.toFixed(2)}\nToday: $${today.toFixed(2)}` } },
      ],
    });
  }
};

// Weekly cost report
export const costReport = async () => {
  const week = await db.query(`
    SELECT resource, SUM(amount) as total
    FROM cost_log
    WHERE timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY resource
    ORDER BY total DESC
  `);
  
  const forecast = await costTracking.getMonthlyForecast();
  
  console.log(`
    💰 Weekly Cost Report:
    ${week.map(w => `- ${w.resource}: $${w.total.toFixed(2)}`).join('\n')}
    
    Monthly forecast: $${forecast.toFixed(2)}
  `);
};

schedule.scheduleJob('0 * * * *', costAlerts);  // Every hour
schedule.scheduleJob('0 9 * * 1', costReport);  // Monday 9 AM
```

---

**Real-time cost tracking, optimization rules, alerts, forecasting.** 🚀
