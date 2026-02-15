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
    return jsonResponse({ success: true, stats });
  } catch (error) {
    console.error('[Mint Cron] Error:', error);
    return errorResponse('Cleanup failed', 500);
  }
};
