export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface HealthCheckDetail {
  status: CheckStatus;
  provider: string;
  latencyMs?: number;
  error?: string;
  reason?: string;
}

interface D1PreparedLike {
  first<T = unknown>(): Promise<T | null>;
}

interface D1Like {
  prepare(sql: string): D1PreparedLike;
}

function isD1Like(value: unknown): value is D1Like {
  return (
    typeof value === 'object' &&
    value !== null &&
    'prepare' in value &&
    typeof (value as { prepare?: unknown }).prepare === 'function'
  );
}

async function probeD1(db: D1Like, provider: string): Promise<HealthCheckDetail> {
  const started = Date.now();
  try {
    await db.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    return {
      status: 'pass',
      provider,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      status: 'fail',
      provider,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface DatabaseHealth {
  primary: HealthCheckDetail;
  replica: HealthCheckDetail;
}

export async function checkDatabaseHealth(env: Record<string, unknown>): Promise<DatabaseHealth> {
  const primaryDb = env.DB;
  const replicaDb = env.DB_REPLICA;

  const primary = isD1Like(primaryDb)
    ? await probeD1(primaryDb, 'd1')
    : { status: 'skip', provider: 'none', reason: 'DB binding not configured' as const };

  const replica = isD1Like(replicaDb)
    ? await probeD1(replicaDb, 'd1-replica')
    : { status: 'skip', provider: 'none', reason: 'DB_REPLICA binding not configured' as const };

  return { primary, replica };
}
