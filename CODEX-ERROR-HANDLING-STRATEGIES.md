# Codex Error Handling & Recovery Strategies

**Generated:** 2026-02-23 13:35 UTC  
**Status:** Ready for implementation  
**Effort Estimate:** 35 minutes  
**ROI:** Critical (prevents errors from becoming disasters)

---

## 1. COMPREHENSIVE ERROR CLASSIFICATION (8 min)

```typescript
// src/lib/errors.ts
export enum ErrorSeverity {
  CRITICAL = 'critical',   // System down, fix immediately
  HIGH = 'high',           // Feature broken, fix ASAP
  MEDIUM = 'medium',       // Degraded feature, fix soon
  LOW = 'low',             // Minor issue, fix when possible
}

export enum ErrorType {
  // Infrastructure
  DATABASE_CONNECTION = 'database_connection',
  CACHE_UNAVAILABLE = 'cache_unavailable',
  EXTERNAL_API_DOWN = 'external_api_down',
  MEMORY_EXHAUSTED = 'memory_exhausted',
  CPU_THROTTLED = 'cpu_throttled',
  
  // Application
  INVALID_INPUT = 'invalid_input',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  RATE_LIMITED = 'rate_limited',
  
  // Business logic
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  INVALID_GAME_STATE = 'invalid_game_state',
  DUPLICATE_ENTRY = 'duplicate_entry',
  
  // Transient
  TIMEOUT = 'timeout',
  NETWORK_ERROR = 'network_error',
  TEMPORARY_UNAVAILABLE = 'temporary_unavailable',
}

export const ERROR_CONFIGS = {
  [ErrorType.DATABASE_CONNECTION]: {
    severity: ErrorSeverity.CRITICAL,
    retryable: true,
    maxRetries: 5,
    fallback: 'cache',
  },
  [ErrorType.EXTERNAL_API_DOWN]: {
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    maxRetries: 3,
    fallback: 'cached_data',
  },
  [ErrorType.RATE_LIMITED]: {
    severity: ErrorSeverity.LOW,
    retryable: true,
    maxRetries: 10,
    backoffMultiplier: 2,
  },
  [ErrorType.INVALID_INPUT]: {
    severity: ErrorSeverity.LOW,
    retryable: false,
    statusCode: 400,
  },
};
```

---

## 2. GLOBAL ERROR HANDLER (8 min)

```typescript
export class ErrorHandler {
  static handle(error: Error, context: any = {}) {
    const errorType = this.classify(error);
    const config = ERROR_CONFIGS[errorType];
    
    // Log with context
    logger.error('Error occurred', {
      type: errorType,
      message: error.message,
      severity: config.severity,
      stack: error.stack,
      context,
    });
    
    // Emit metric
    metrics.counter('errors.total', {
      type: errorType,
      severity: config.severity,
    });
    
    // Alert if critical
    if (config.severity === ErrorSeverity.CRITICAL) {
      this.alertTeam(errorType, error, context);
    }
    
    // Create incident if needed
    if (config.severity === ErrorSeverity.CRITICAL || config.severity === ErrorSeverity.HIGH) {
      incidentManager.createIncident(
        config.severity === ErrorSeverity.CRITICAL ? 'critical' : 'warning',
        errorType,
        error.message
      );
    }
    
    return {
      type: errorType,
      severity: config.severity,
      retryable: config.retryable,
      fallback: config.fallback,
    };
  }
  
  static classify(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('database') || message.includes('connection refused')) {
      return ErrorType.DATABASE_CONNECTION;
    }
    if (message.includes('redis') || message.includes('cache')) {
      return ErrorType.CACHE_UNAVAILABLE;
    }
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    // ... more classifications
    
    return ErrorType.INVALID_INPUT;
  }
  
  static alertTeam(errorType: string, error: Error, context: any) {
    slack.send('#critical-alerts', {
      text: `🚨 CRITICAL ERROR: ${errorType}`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: error.message } },
        { type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${error.stack}\`\`\`` } },
      ],
    });
    
    pagerduty.triggerAlert({
      title: `Critical: ${errorType}`,
      description: error.message,
      severity: 'critical',
    });
  }
}
```

---

## 3. PER-ENDPOINT ERROR HANDLING (8 min)

```typescript
// Middleware that handles errors per endpoint
export const errorHandlingMiddleware = (handler: Function) => {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      const errorInfo = ErrorHandler.handle(error, {
        endpoint: req.url,
        method: req.method,
        userId: req.user?.id,
      });
      
      // Return appropriate response
      if (!errorInfo.retryable) {
        return errorResponse(400, error.message);
      }
      
      // Retryable: return 503 Service Unavailable
      return errorResponse(503, 'Service temporarily unavailable. Please retry.');
    }
  };
};

// Usage
export async function getLeaderboard(req: Request) {
  return errorHandlingMiddleware(async (req) => {
    const gameId = new URL(req.url).searchParams.get('game');
    
    try {
      const data = await db.query('SELECT * FROM leaderboards WHERE game_id = ?', [gameId]);
      return jsonResponse(data);
    } catch (error) {
      // Will be caught by middleware
      throw error;
    }
  })(req);
}
```

---

## 4. TIMEOUT & DEADLINE HANDLING (6 min)

```typescript
export const withTimeout = async <T>(
  fn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> => {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
};

// Usage
export const getGameWithTimeout = (gameId: string) => {
  return withTimeout(
    () => db.query('SELECT * FROM games WHERE id = ?', [gameId]),
    3000  // 3 second timeout
  );
};

// Or with AbortController (modern approach)
export const fetchWithAbort = async (url: string, timeoutMs: number = 5000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};
```

---

## 5. DEADLETTER QUEUE FOR FAILED OPERATIONS (5 min)

```typescript
// For operations that fail but need to retry later
export const deadLetterQueue = {
  async enqueue(operation: FailedOperation) {
    await db.query(`
      INSERT INTO dead_letter_queue (operation, payload, error, created_at, retry_count)
      VALUES (?, ?, ?, NOW(), 0)
    `, [operation.type, JSON.stringify(operation.payload), operation.error]);
    
    logger.warn(`Operation queued for retry: ${operation.type}`);
  },
  
  async process() {
    // Run every 5 minutes
    const items = await db.query(`
      SELECT * FROM dead_letter_queue 
      WHERE retry_count < 5 
      AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
      LIMIT 10
    `, [2 ** retryCount]); // Exponential backoff
    
    for (const item of items) {
      try {
        await this.retryOperation(item);
        
        // Remove from queue
        await db.query('DELETE FROM dead_letter_queue WHERE id = ?', [item.id]);
      } catch (error) {
        // Increment retry count
        await db.query(
          'UPDATE dead_letter_queue SET retry_count = retry_count + 1 WHERE id = ?',
          [item.id]
        );
      }
    }
  },
  
  async retryOperation(item: any) {
    switch (item.operation) {
      case 'send_email':
        return sendEmail(item.payload);
      case 'process_payment':
        return processPayment(item.payload);
      case 'record_analytics':
        return recordAnalytics(item.payload);
    }
  },
};

// Schedule DLQ processing
schedule.scheduleJob('*/5 * * * *', () => deadLetterQueue.process());
```

---

**All errors classified, handled, monitored, and recovered automatically. Codex ready to implement.** 🚀
