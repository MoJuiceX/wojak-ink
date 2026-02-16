/**
 * Admin: CAT Token Whitelist — /api/admin/cat-whitelist
 *
 * GET  — List all whitelisted CAT tokens
 * PUT  — Add or remove tokens from whitelist
 *
 * Protected by ADMIN_SECRET Bearer token.
 */

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT token_code, added_at, added_by FROM cat_credit_whitelist ORDER BY added_at'
    ).all<{ token_code: string; added_at: string; added_by: string }>();

    return new Response(JSON.stringify({
      tokens: rows.results || [],
      count: (rows.results || []).length,
    }), { headers: corsHeaders });
  }

  if (request.method === 'PUT') {
    const body = await request.json() as { add?: string[]; remove?: string[] };

    const added: string[] = [];
    const removed: string[] = [];

    if (body.add) {
      for (const token of body.add) {
        try {
          await env.DB.prepare(
            'INSERT OR IGNORE INTO cat_credit_whitelist (token_code, added_by) VALUES (?, ?)'
          ).bind(token, 'admin_api').run();
          added.push(token);
        } catch (e) {
          console.error(`[CAT Whitelist] Failed to add ${token}:`, e);
        }
      }
    }

    if (body.remove) {
      for (const token of body.remove) {
        try {
          await env.DB.prepare(
            'DELETE FROM cat_credit_whitelist WHERE token_code = ?'
          ).bind(token).run();
          removed.push(token);
        } catch (e) {
          console.error(`[CAT Whitelist] Failed to remove ${token}:`, e);
        }
      }
    }

    return new Response(JSON.stringify({ added, removed }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders,
  });
};
