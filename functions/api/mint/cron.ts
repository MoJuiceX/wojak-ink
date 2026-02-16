/**
 * Mint Cron — POST /api/mint/cron
 *
 * Admin-protected endpoint to run stale job cleanup.
 * Trigger externally every 5 minutes via cron service.
 *
 * Authorization: Bearer <ADMIN_API_KEY>
 */

import { cleanupStaleJobs } from './cleanup';
import { jsonResponse, errorResponse, optionsResponse } from './_shared';
import type { ProcessEnv } from './process';

interface Env extends ProcessEnv {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
  ADMIN_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Admin auth
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_API_KEY || !token || token !== env.ADMIN_API_KEY) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const stats = await cleanupStaleJobs(env);

    // Query recent error counts from mint_audit_log
    const [errors1h, errors24h] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS count FROM mint_audit_log
         WHERE (status = 'error' OR status = 'failed')
         AND created_at > datetime('now', '-1 hour')`
      ).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count FROM mint_audit_log
         WHERE (status = 'error' OR status = 'failed')
         AND created_at > datetime('now', '-24 hours')`
      ).first<{ count: number }>(),
    ]);

    return jsonResponse({
      success: true,
      stats,
      recentErrors1h: errors1h?.count ?? 0,
      recentErrors24h: errors24h?.count ?? 0,
    });
  } catch (error) {
    console.error('[Mint Cron] Error:', error);
    return errorResponse('Cleanup failed', 500);
  }
};
