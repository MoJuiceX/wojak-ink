/**
 * Admin Flagged Mints — GET /api/mint/admin/flagged
 *
 * Returns mint_jobs in failed/refunded state for the admin safety rail panel.
 * Admin-only endpoint (requires ADMIN_SECRET).
 */

import { jsonResponse, errorResponse, optionsResponse } from '../_shared';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

interface FlaggedJobRow {
  id: number;
  mint_number: number | null;
  wallet_address: string;
  step: string;
  mint_type: string;
  error_message: string | null;
  error_code: string | null;
  mintgarden_launcher_id: string | null;
  phase2_mint_id: number | null;
  created_at: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();

  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const result = await env.DB.prepare(
      `SELECT id, mint_number, wallet_address, step, mint_type,
              error_message, error_code, mintgarden_launcher_id, phase2_mint_id, created_at
       FROM mint_jobs
       WHERE step IN ('failed', 'refunded')
       ORDER BY created_at DESC
       LIMIT 50`
    ).all<FlaggedJobRow>();

    return jsonResponse({ jobs: result.results || [] });
  } catch (error) {
    console.error('[Admin Flagged] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
