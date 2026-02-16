/**
 * Admin: Credit Audit — /api/admin/credit-audit
 *
 * GET  — Find duplicate credit entries (same NFT credited multiple times to same wallet)
 * POST — Deduplicate: keep the earliest entry per NFT+wallet, delete extras, recalc balances
 *
 * Duplicates happen when the same trade is recorded through both paths:
 * 1. MintGarden events API (nft_id = hex coin ID, event_id = {coin}_{idx}_{ts})
 * 2. sales_history CAT processing (nft_id = nft_edition_XXXX, event_id = cat_{trade_id})
 *
 * Protected by ADMIN_SECRET Bearer token.
 */

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface DuplicateGroup {
  wallet_address: string;
  nft_edition: number | null;
  nft_name: string | null;
  entry_count: number;
  total_credits: number;
  event_ids: string[];
  nft_ids: string[];
  keep_id: number;       // ID of the earliest entry (keep this one)
  delete_ids: number[];   // IDs to delete
  credits_to_remove: number;
}

/**
 * Extract nft_edition from either format:
 * - "nft_edition_1360" → 1360
 * - hex coin ID → look up in sales_history via mg_event_id
 */
function extractEditionFromNftId(nftId: string): number | null {
  if (nftId.startsWith('nft_edition_')) {
    return parseInt(nftId.substring(12), 10) || null;
  }
  return null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin authentication
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
    return handleAudit(env);
  }

  if (request.method === 'POST') {
    return handleDedup(env);
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders,
  });
};

/**
 * GET — Audit: find all duplicate credit entries.
 *
 * Strategy: For each credit_event with nft_id = "nft_edition_XXXX", the edition is known.
 * For hex coin IDs, we look up the edition via sales_history.mg_event_id.
 * Then we group by (wallet_address, nft_edition) and flag groups with count > 1.
 */
async function handleAudit(env: Env): Promise<Response> {
  try {
    // Step 1: Find credit_events that share the same wallet + same NFT edition
    // This catches cross-path duplicates where one record uses hex coin ID and
    // the other uses nft_edition_XXXX format.
    //
    // We resolve hex coin IDs to editions via sales_history.mg_event_id which
    // contains the MintGarden coin ID as a prefix.
    const allEvents = await env.DB.prepare(
      `SELECT
        ce.id,
        ce.wallet_address,
        ce.nft_id,
        ce.event_id,
        ce.price_xch,
        ce.credits_earned,
        ce.event_timestamp,
        ce.source,
        sh.nft_edition AS resolved_edition,
        sh.nft_name AS resolved_name
      FROM credit_events ce
      LEFT JOIN sales_history sh
        ON (
          -- Match nft_edition_XXXX format
          (ce.nft_id LIKE 'nft_edition_%' AND sh.nft_edition = CAST(SUBSTR(ce.nft_id, 13) AS INTEGER))
          OR
          -- Match hex coin ID via mg_event_id prefix
          (ce.nft_id NOT LIKE 'nft_edition_%' AND ce.nft_id NOT LIKE 'holder_%' AND sh.mg_event_id LIKE ce.nft_id || '%')
        )
      WHERE ce.event_type IS NULL OR ce.event_type != 'holder_airdrop'
      ORDER BY ce.wallet_address, ce.event_timestamp ASC`
    ).all<{
      id: number;
      wallet_address: string;
      nft_id: string;
      event_id: string;
      price_xch: number;
      credits_earned: number;
      event_timestamp: string;
      source: string;
      resolved_edition: number | null;
      resolved_name: string | null;
    }>();

    const events = allEvents.results || [];

    // Group by wallet + edition
    const groups = new Map<string, typeof events>();

    for (const event of events) {
      // Determine edition: from nft_id format or from resolved sales_history lookup
      let edition = extractEditionFromNftId(event.nft_id);
      if (!edition) {
        edition = event.resolved_edition;
      }
      if (!edition) continue; // Can't resolve — skip (e.g. holder_airdrop)

      const key = `${event.wallet_address}::${edition}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }

    // Find groups with more than one entry (duplicates)
    const duplicates: DuplicateGroup[] = [];
    let totalExtraCredits = 0;

    for (const [, entries] of groups) {
      if (entries.length <= 1) continue;

      // Sort by timestamp (earliest first) — keep the first one
      entries.sort((a, b) => a.event_timestamp.localeCompare(b.event_timestamp));
      const keep = entries[0];
      const extras = entries.slice(1);

      const creditsToRemove = extras.reduce((sum, e) => sum + e.credits_earned, 0);
      totalExtraCredits += creditsToRemove;

      const edition = extractEditionFromNftId(keep.nft_id) || keep.resolved_edition;

      duplicates.push({
        wallet_address: keep.wallet_address,
        nft_edition: edition,
        nft_name: keep.resolved_name || entries.find(e => e.resolved_name)?.resolved_name || null,
        entry_count: entries.length,
        total_credits: entries.reduce((sum, e) => sum + e.credits_earned, 0),
        event_ids: entries.map(e => e.event_id),
        nft_ids: entries.map(e => e.nft_id),
        keep_id: keep.id,
        delete_ids: extras.map(e => e.id),
        credits_to_remove: creditsToRemove,
      });
    }

    // Sort by credits_to_remove descending (biggest offenders first)
    duplicates.sort((a, b) => b.credits_to_remove - a.credits_to_remove);

    // Summary by wallet
    const walletSummary = new Map<string, { count: number; extraCredits: number }>();
    for (const dup of duplicates) {
      const existing = walletSummary.get(dup.wallet_address) || { count: 0, extraCredits: 0 };
      existing.count += dup.delete_ids.length;
      existing.extraCredits += dup.credits_to_remove;
      walletSummary.set(dup.wallet_address, existing);
    }

    return new Response(JSON.stringify({
      totalDuplicateGroups: duplicates.length,
      totalExtraEntries: duplicates.reduce((sum, d) => sum + d.delete_ids.length, 0),
      totalExtraCredits: totalExtraCredits / 100, // display units
      affectedWallets: walletSummary.size,
      walletSummary: Object.fromEntries(
        [...walletSummary.entries()].map(([w, s]) => [w, {
          duplicateNfts: s.count,
          extraCredits: s.extraCredits / 100,
        }])
      ),
      duplicates: duplicates.map(d => ({
        ...d,
        total_credits: d.total_credits / 100,
        credits_to_remove: d.credits_to_remove / 100,
      })),
    }), { headers: corsHeaders });
  } catch (error) {
    console.error('[Credit Audit] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * POST — Deduplicate: delete extra entries, keeping only the earliest per NFT+wallet.
 * Returns a summary of what was removed.
 */
async function handleDedup(env: Env): Promise<Response> {
  try {
    // First, run the same audit logic to find duplicates
    const auditResponse = await handleAudit(env);
    const auditData = await auditResponse.json() as {
      totalDuplicateGroups: number;
      duplicates: Array<{ delete_ids: number[]; credits_to_remove: number }>;
    };

    if (auditData.totalDuplicateGroups === 0) {
      return new Response(JSON.stringify({
        message: 'No duplicates found. Database is clean.',
        deleted: 0,
      }), { headers: corsHeaders });
    }

    // Collect all IDs to delete (these are the raw IDs from the audit before display-unit conversion)
    // We need to re-run the logic to get raw delete_ids
    const allEvents = await env.DB.prepare(
      `SELECT
        ce.id,
        ce.wallet_address,
        ce.nft_id,
        ce.event_id,
        ce.credits_earned,
        ce.event_timestamp,
        sh.nft_edition AS resolved_edition
      FROM credit_events ce
      LEFT JOIN sales_history sh
        ON (
          (ce.nft_id LIKE 'nft_edition_%' AND sh.nft_edition = CAST(SUBSTR(ce.nft_id, 13) AS INTEGER))
          OR
          (ce.nft_id NOT LIKE 'nft_edition_%' AND ce.nft_id NOT LIKE 'holder_%' AND sh.mg_event_id LIKE ce.nft_id || '%')
        )
      WHERE ce.event_type IS NULL OR ce.event_type != 'holder_airdrop'
      ORDER BY ce.wallet_address, ce.event_timestamp ASC`
    ).all<{
      id: number;
      wallet_address: string;
      nft_id: string;
      event_id: string;
      credits_earned: number;
      event_timestamp: string;
      resolved_edition: number | null;
    }>();

    const events = allEvents.results || [];
    const groups = new Map<string, typeof events>();

    for (const event of events) {
      let edition = extractEditionFromNftId(event.nft_id);
      if (!edition) edition = event.resolved_edition;
      if (!edition) continue;
      const key = `${event.wallet_address}::${edition}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }

    const deleteIds: number[] = [];
    let creditsRemoved = 0;

    for (const [, entries] of groups) {
      if (entries.length <= 1) continue;
      entries.sort((a, b) => a.event_timestamp.localeCompare(b.event_timestamp));
      const extras = entries.slice(1);
      for (const e of extras) {
        deleteIds.push(e.id);
        creditsRemoved += e.credits_earned;
      }
    }

    if (deleteIds.length === 0) {
      return new Response(JSON.stringify({
        message: 'No duplicates found. Database is clean.',
        deleted: 0,
      }), { headers: corsHeaders });
    }

    // Delete in batches of 50
    let deleted = 0;
    for (let i = 0; i < deleteIds.length; i += 50) {
      const batch = deleteIds.slice(i, i + 50);
      const placeholders = batch.map(() => '?').join(',');
      const result = await env.DB.prepare(
        `DELETE FROM credit_events WHERE id IN (${placeholders})`
      ).bind(...batch).run();
      deleted += result.meta?.changes ?? batch.length;
    }

    return new Response(JSON.stringify({
      message: `Deduplication complete. Removed ${deleted} duplicate entries.`,
      deleted,
      creditsRemoved: creditsRemoved / 100, // display units
      affectedGroups: groups.size,
    }), { headers: corsHeaders });
  } catch (error) {
    console.error('[Credit Dedup] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
