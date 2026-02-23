import { Pool, PoolClient } from 'pg';
import { logger } from './logger';
import { metrics } from './metrics';

// Write pool (primary database)
export const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  application_name: 'wojak-app-write',
});

// Read pool (replica database for read-heavy queries)
export const readPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL,
  max: 100,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  application_name: 'wojak-app-read',
});

// Handle pool errors
writePool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err,
    client: client?.constructor?.name,
  });
  metrics.counter('db.pool.error', 1, { pool: 'write' });
});

readPool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err,
    client: client?.constructor?.name,
  });
  metrics.counter('db.pool.error', 1, { pool: 'read' });
});

// Monitor pool health every 30 seconds
setInterval(() => {
  const writeStats = {
    idle: writePool.idleCount,
    total: writePool.totalCount,
    waiting: writePool.waitingCount,
  };

  const readStats = {
    idle: readPool.idleCount,
    total: readPool.totalCount,
    waiting: readPool.waitingCount,
  };

  // Record metrics
  metrics.gauge('db.pool.write.idle', writeStats.idle);
  metrics.gauge('db.pool.write.total', writeStats.total);
  metrics.gauge('db.pool.write.waiting', writeStats.waiting);

  metrics.gauge('db.pool.read.idle', readStats.idle);
  metrics.gauge('db.pool.read.total', readStats.total);
  metrics.gauge('db.pool.read.waiting', readStats.waiting);

  logger.debug('Pool status', {
    write: writeStats,
    read: readStats,
  });

  // Alert if pool under stress
  if (writeStats.waiting > 10 || writeStats.idle === 0) {
    logger.warn('⚠️ Write pool under stress', writeStats);
    metrics.counter('db.pool.stress', 1, { pool: 'write' });
  }

  if (readStats.waiting > 20 || readStats.idle === 0) {
    logger.warn('⚠️ Read pool under stress', readStats);
    metrics.counter('db.pool.stress', 1, { pool: 'read' });
  }
}, 30000);

// Export a function to use read pool for queries
export async function queryRead<T = any>(
  text: string,
  values?: any[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await readPool.query(text, values);
    const duration = Date.now() - start;

    metrics.histogram('db.query.duration', duration, {
      type: 'read',
      status: 'success',
    });

    return result.rows as T[];
  } catch (error) {
    const duration = Date.now() - start;
    metrics.histogram('db.query.duration', duration, {
      type: 'read',
      status: 'error',
    });
    throw error;
  }
}

// Export a function to use write pool for mutations
export async function queryWrite<T = any>(
  text: string,
  values?: any[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await writePool.query(text, values);
    const duration = Date.now() - start;

    metrics.histogram('db.query.duration', duration, {
      type: 'write',
      status: 'success',
    });

    return result.rows as T[];
  } catch (error) {
    const duration = Date.now() - start;
    metrics.histogram('db.query.duration', duration, {
      type: 'write',
      status: 'error',
    });
    throw error;
  }
}

// Graceful shutdown
export async function closePools() {
  logger.info('Closing database pools...');
  await Promise.all([writePool.end(), readPool.end()]);
  logger.info('Database pools closed');
}

// Export pool instances for direct access if needed
export { Pool, PoolClient };
