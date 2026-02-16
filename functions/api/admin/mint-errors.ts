/**
 * Admin: Mint Errors — /api/admin/mint-errors
 *
 * GET ?hours=24&severity=error
 *
 * Returns recent errors from the mint_audit_log table with summary breakdowns.
 * Internal admin endpoint — not linked in navigation.
 */

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;  // Set via wrangler secret
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface AuditLogRow {
  id: number;
  mint_id: number;
  step: string;
  status: string;
  data: string | null;
  error: string | null;
  created_at: string;
  wallet_address: string | null;
  mint_type: string | null;
}

interface MintErrorEntry {
  id: number;
  mintId: number;
  step: string;
  error: string | null;
  data: Record<string, unknown> | null;
  wallet: string | null;
  mintType: string | null;
  createdAt: string;
}

interface ErrorSummary {
  total: number;
  byStep: Record<string, number>;
  byCode: Record<string, number>;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Admin authentication (required — blocks access if ADMIN_SECRET not configured)
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

  try {
    // Parse query params
    const url = new URL(request.url);
    const hours = Math.min(Math.max(parseInt(url.searchParams.get('hours') || '24', 10), 1), 168); // 1-168 hours

    // Query mint_audit_log for error entries, joined with mint_jobs for wallet/type
    const result = await env.DB.prepare(
      `SELECT
        mal.id,
        mal.mint_id,
        mal.step,
        mal.status,
        mal.data,
        mal.error,
        mal.created_at,
        mj.wallet_address,
        mj.mint_type
       FROM mint_audit_log mal
       LEFT JOIN mint_jobs mj ON mal.mint_id = mj.id
       WHERE (mal.status = 'error' OR mal.status = 'failed')
         AND mal.created_at > datetime('now', ?)
       ORDER BY mal.created_at DESC
       LIMIT 500`
    ).bind(`-${hours} hours`).all<AuditLogRow>();

    const rows = result.results || [];

    // Build error entries
    const errors: MintErrorEntry[] = [];
    const byStep: Record<string, number> = {};
    const byCode: Record<string, number> = {};

    for (const row of rows) {
      // Parse data JSON if present
      let parsedData: Record<string, unknown> | null = null;
      let errorCode: string | null = null;

      if (row.data) {
        try {
          parsedData = JSON.parse(row.data);
          // Try to extract error_code from parsed data
          if (parsedData && typeof parsedData.error_code === 'string') {
            errorCode = parsedData.error_code;
          }
        } catch {
          // Invalid JSON, leave as null
        }
      }

      errors.push({
        id: row.id,
        mintId: row.mint_id,
        step: row.step,
        error: row.error,
        data: parsedData,
        wallet: row.wallet_address,
        mintType: row.mint_type,
        createdAt: row.created_at,
      });

      // Aggregate by step
      byStep[row.step] = (byStep[row.step] || 0) + 1;

      // Aggregate by error code (use step as fallback if no code)
      const codeKey = errorCode || row.step;
      byCode[codeKey] = (byCode[codeKey] || 0) + 1;
    }

    const summary: ErrorSummary = {
      total: errors.length,
      byStep,
      byCode,
    };

    return new Response(
      JSON.stringify({ errors, summary }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Admin Mint Errors] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
