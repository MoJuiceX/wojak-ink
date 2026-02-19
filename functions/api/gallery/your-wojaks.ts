/**
 * Your Wojaks Gallery API - GET /api/gallery/your-wojaks
 *
 * Returns ALL minted Your Wojaks with combat data when available.
 * Query params:
 * - limit: max items to return (default 100, max 200)
 * - offset: pagination offset (default 0)
 * - sort: power_desc | power_asc | edition_desc | edition_asc | level_desc | elo_desc
 * - type: combat type filter (FIRE, WATER, etc.) - only filters NFTs with combat data
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const sort = url.searchParams.get('sort') || 'edition_desc';
  const typeFilter = url.searchParams.get('type') || null;

  // Build ORDER BY clause - use COALESCE for combat fields that may be null
  let orderBy = 'pm.mint_number DESC';
  if (sort === 'power_desc') orderBy = 'COALESCE(cf.power_score, ws.net_score, 0) DESC';
  if (sort === 'power_asc') orderBy = 'COALESCE(cf.power_score, ws.net_score, 0) ASC';
  if (sort === 'edition_desc') orderBy = 'pm.mint_number DESC';
  if (sort === 'edition_asc') orderBy = 'pm.mint_number ASC';
  if (sort === 'level_desc') orderBy = 'COALESCE(cf.level, 1) DESC, pm.mint_number DESC';
  if (sort === 'elo_desc') orderBy = 'COALESCE(cf.elo_rating, 1000) DESC, pm.mint_number DESC';

  // Base WHERE clause - only minted NFTs
  let whereClause = "WHERE pm.status = 'minted' AND pm.mint_number IS NOT NULL";
  const bindings: (string | number)[] = [];

  // Type filter only applies to NFTs with combat data
  if (typeFilter) {
    whereClause += ' AND cf.combat_type = ?';
    bindings.push(typeFilter);
  }

  try {
    const query = `
      SELECT
        COALESCE(cf.nft_id, 'yw_' || pm.mint_number) as nft_id,
        pm.mint_number as edition,
        cf.combat_type as type,
        cf.nature,
        cf.ability,
        cf.move_1, cf.move_2, cf.move_3, cf.move_4,
        COALESCE(cf.level, 1) as level,
        COALESCE(cf.elo_rating, 1000) as elo,
        COALESCE(cf.power_score, ws.net_score, 0) as power,
        COALESCE(cf.vote_power, ws.net_score, 0) as votePower,
        COALESCE(cf.battle_power, 0) as battlePower,
        COALESCE(cf.total_combat_wins, 0) as wins,
        COALESCE(cf.total_combat_losses, 0) as losses,
        COALESCE(cf.total_combat_draws, 0) as draws,
        COALESCE(dp.display_name, '') as ownerName,
        cf.owner_did,
        pm.ipfs_image_uri as imageUri,
        nn.custom_name as customName
      FROM phase2_mints pm
      LEFT JOIN combat_fighters cf ON cf.edition_number = pm.mint_number
      LEFT JOIN wojak_scores ws ON ws.edition_number = pm.mint_number
      LEFT JOIN nft_names nn ON nn.edition_number = pm.mint_number
      LEFT JOIN did_profiles dp ON dp.did_id = cf.owner_did
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    bindings.push(limit, offset);

    const results = await env.DB.prepare(query).bind(...bindings).all();

    // Get total count for pagination
    let countWhereClause = "WHERE pm.status = 'minted' AND pm.mint_number IS NOT NULL";
    const countBindings: (string | number)[] = [];
    if (typeFilter) {
      countWhereClause += ' AND cf.combat_type = ?';
      countBindings.push(typeFilter);
    }

    const countQuery = typeFilter
      ? `SELECT COUNT(*) as total FROM phase2_mints pm LEFT JOIN combat_fighters cf ON cf.edition_number = pm.mint_number ${countWhereClause}`
      : `SELECT COUNT(*) as total FROM phase2_mints pm ${countWhereClause}`;

    const countResult = await env.DB.prepare(countQuery).bind(...countBindings).first<{ total: number }>();

    return new Response(JSON.stringify({
      wojaks: results.results,
      total: countResult?.total || 0,
      limit,
      offset,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Your Wojaks API] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};
