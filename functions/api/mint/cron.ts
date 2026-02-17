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
    // Fix 7: Cleanup mutex — prevent concurrent runs.
    // Check if another cleanup is already running (started <5 min ago).
    const lockRow = await env.DB.prepare(
      "SELECT value FROM server_state WHERE key = 'cleanup_running'"
    ).first<{ value: string }>();

    if (lockRow?.value) {
      const lockTime = new Date(lockRow.value).getTime();
      const elapsed = Date.now() - lockTime;
      if (elapsed < 5 * 60 * 1000) {
        return jsonResponse({
          success: false,
          skipped: true,
          message: `Cleanup already running (started ${Math.round(elapsed / 1000)}s ago)`,
        });
      }
      // Lock is stale (>5 min) — proceed and overwrite
    }

    // Acquire lock
    await env.DB.prepare(
      "INSERT OR REPLACE INTO server_state (key, value, updated_at) VALUES ('cleanup_running', ?, datetime('now'))"
    ).bind(new Date().toISOString()).run();

    let stats;
    try {
      stats = await cleanupStaleJobs(env);
    } finally {
      // Release lock
      await env.DB.prepare(
        "DELETE FROM server_state WHERE key = 'cleanup_running'"
      ).run();
    }

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
    // Release lock on error
    try {
      await env.DB.prepare(
        "DELETE FROM server_state WHERE key = 'cleanup_running'"
      ).run();
    } catch { /* best effort */ }
    return errorResponse('Cleanup failed', 500);
  }
};
