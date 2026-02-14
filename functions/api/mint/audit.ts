/**
 * Mint Audit API — /api/mint/audit
 *
 * GET - Admin endpoint to download complete audit report
 *
 * Query params:
 *   ?format=json (default) | csv
 *   ?status=all | pending | failed | needs_refund
 *   ?since=2026-01-01 (optional date filter)
 *
 * Returns comprehensive report of all mints for refund processing,
 * troubleshooting, and verification.
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

interface MintRecord {
  id: number;
  mint_number: number | null;
  wallet_address: string;
  mint_type: string;
  status: string;
  created_at: string;
  minted_at: string | null;
  expires_at: string | null;

  // IPFS
  ipfs_image_uri: string | null;
  ipfs_metadata_uri: string | null;
  ipfs_upload_started_at: string | null;
  ipfs_upload_completed_at: string | null;

  // MintGarden
  mintgarden_launcher_id: string | null;
  mintgarden_called_at: string | null;
  mintgarden_completed_at: string | null;
  offer_file: string | null;

  // Payment (for paid mints)
  total_price_xch: number | null;
  payment_verified: number;
  payment_amount_xch: number | null;
  payment_txid: string | null;

  // Errors
  error_message: string | null;
  error_code: string | null;

  // Refunds
  refund_needed: number;
  refund_reason: string | null;
  refund_issued: number;
  refund_issued_at: string | null;
  refund_txid: string | null;
  admin_notes: string | null;
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
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const statusFilter = url.searchParams.get('status') || 'all';
    const since = url.searchParams.get('since');

    // Build query based on filters
    let query = `SELECT * FROM phase2_mints WHERE 1=1`;
    const bindings: unknown[] = [];

    if (statusFilter === 'pending') {
      query += ` AND status = 'pending'`;
    } else if (statusFilter === 'failed') {
      query += ` AND status = 'failed'`;
    } else if (statusFilter === 'needs_refund') {
      query += ` AND refund_needed = 1 AND refund_issued = 0`;
    }

    if (since) {
      query += ` AND created_at >= ?`;
      bindings.push(since);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await env.DB.prepare(query).bind(...bindings).all<MintRecord>();
    const mints = result.results || [];

    // Calculate summary statistics
    const summary = {
      total_mints: mints.length,
      minted: mints.filter((m) => m.status === 'minted').length,
      pending: mints.filter((m) => m.status === 'pending').length,
      expired: mints.filter((m) => m.status === 'expired').length,
      failed: mints.filter((m) => m.status === 'failed').length,
      needs_refund: mints.filter((m) => m.refund_needed && !m.refund_issued).length,
      refunds_issued: mints.filter((m) => m.refund_issued).length,
      free_mints: mints.filter((m) => m.mint_type === 'free').length,
      paid_mints: mints.filter((m) => m.mint_type === 'paid').length,
    };

    // Categorize mints for easy review
    const categories = {
      successful: mints.filter((m) => m.status === 'minted' && m.mintgarden_launcher_id),

      pending_paid: mints.filter(
        (m) => m.status === 'pending' && m.mint_type === 'paid' && !isExpired(m.expires_at)
      ),

      expired_offers: mints.filter(
        (m) => m.status === 'pending' && isExpired(m.expires_at)
      ),

      failed_mints: mints.filter((m) => m.status === 'failed' || m.error_message),

      needs_refund: mints.filter((m) => m.refund_needed && !m.refund_issued),

      paid_not_confirmed: mints.filter(
        (m) => m.mint_type === 'paid' && m.status === 'pending' && m.offer_file && !m.mintgarden_launcher_id
      ),

      ipfs_upload_failed: mints.filter(
        (m) => m.ipfs_upload_started_at && !m.ipfs_upload_completed_at
      ),

      mintgarden_call_failed: mints.filter(
        (m) => m.mintgarden_called_at && !m.mintgarden_completed_at && !m.mintgarden_launcher_id
      ),
    };

    if (format === 'csv') {
      // CSV export for Excel/Sheets
      const csv = generateCSV(mints);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="mint-audit-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON response with full details
    return new Response(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        summary,
        categories,
        all_mints: mints,
      }, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Disposition': `attachment; filename="mint-audit-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error) {
    console.error('[Mint Audit] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function generateCSV(mints: MintRecord[]): string {
  const headers = [
    'ID', 'Mint#', 'Wallet', 'Type', 'Status', 'Created', 'Minted',
    'Launcher ID', 'IPFS Image', 'IPFS Metadata', 'Price XCH',
    'Refund Needed', 'Refund Reason', 'Refund Issued', 'Error', 'Notes'
  ];

  const rows = mints.map((m) => [
    m.id,
    m.mint_number || '',
    m.wallet_address,
    m.mint_type,
    m.status,
    m.created_at,
    m.minted_at || '',
    m.mintgarden_launcher_id || '',
    m.ipfs_image_uri || '',
    m.ipfs_metadata_uri || '',
    m.total_price_xch ? (m.total_price_xch / 100000).toFixed(5) : '',
    m.refund_needed ? 'YES' : 'NO',
    m.refund_reason || '',
    m.refund_issued ? `YES (${m.refund_txid || 'pending'})` : 'NO',
    m.error_message || '',
    m.admin_notes || ''
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}
