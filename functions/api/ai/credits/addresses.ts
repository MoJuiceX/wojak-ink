// functions/api/ai/credits/addresses.ts
// Admin endpoint to manage the payment address pool.
// GET: returns pool stats (available, assigned, total)
// POST: adds new addresses to the pool (requires admin auth via env secret)
import { jsonResponse, errorResponse, optionsResponse } from '../_shared';
import type { AIEnv } from '../_shared';
import { isValidChiaAddress } from '../../../lib/validation';

interface AddressEnv extends AIEnv {
  AI_ADMIN_SECRET?: string;
}

export const onRequest: PagesFunction<AddressEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();

  // Simple admin auth via shared secret in header
  const adminSecret = env.AI_ADMIN_SECRET;
  if (!adminSecret) {
    return errorResponse('Admin endpoint not configured', 503);
  }
  const authHeader = request.headers.get('X-Admin-Secret');
  if (authHeader !== adminSecret) {
    return errorResponse('Unauthorized', 401);
  }

  if (request.method === 'GET') {
    const stats = await env.DB
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN purchase_id IS NULL THEN 1 ELSE 0 END) AS available,
          SUM(CASE WHEN purchase_id IS NOT NULL THEN 1 ELSE 0 END) AS assigned
         FROM ai_payment_addresses`
      )
      .first<{ total: number; available: number; assigned: number }>();

    return jsonResponse(stats ?? { total: 0, available: 0, assigned: 0 });
  }

  if (request.method === 'POST') {
    let body: { addresses?: string[] };
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON', 400);
    }

    const { addresses } = body;
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return errorResponse('Missing addresses array', 400);
    }

    // Validate all addresses first
    const invalid = addresses.filter((a) => !isValidChiaAddress(a));
    if (invalid.length > 0) {
      return errorResponse(`Invalid Chia addresses: ${invalid.slice(0, 3).join(', ')}...`, 400);
    }

    let added = 0;
    let skipped = 0;
    for (const addr of addresses) {
      try {
        await env.DB
          .prepare(`INSERT INTO ai_payment_addresses (address) VALUES (?)`)
          .bind(addr)
          .run();
        added++;
      } catch {
        // Duplicate address — skip silently
        skipped++;
      }
    }

    return jsonResponse({ added, skipped, total: addresses.length });
  }

  return errorResponse('Method not allowed', 405);
};
