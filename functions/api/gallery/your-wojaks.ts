/**
 * Your Wojaks Gallery API - GET /api/gallery/your-wojaks
 *
 * Returns the Your Wojak collection with combat data for gallery browsing.
 * Query params:
 * - limit: max items to return (default 100, max 200)
 * - offset: pagination offset (default 0)
 * - sort: power_desc | power_asc | edition_desc | edition_asc | level_desc | elo_desc
 * - type: combat type filter (FIRE, WATER, etc.)
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
  const sort = url.searchParams.get('sort') || 'power_desc';
  const typeFilter = url.searchParams.get('type') || null;

  let orderBy = 'cf.power_score DESC';
  if (sort === 'power_asc') orderBy = 'cf.power_score ASC';
  if (sort === 'edition_desc') orderBy = 'cf.edition_number DESC';
  if (sort === 'edition_asc') orderBy = 'cf.edition_number ASC';
  if (sort === 'level_desc') orderBy = 'cf.level DESC';
  if (sort === 'elo_desc') orderBy = 'cf.elo_rating DESC';

  let whereClause = 'WHERE cf.edition_number IS NOT NULL';
  const bindings: (string | number)[] = [];

  if (typeFilter) {
    whereClause += ' AND cf.combat_type = ?';
    bindings.push(typeFilter);
  }

  try {
    const query = `
      SELECT
        cf.nft_id,
        cf.edition_number as edition,
        cf.combat_type as type,
        cf.nature,
        cf.ability,
        cf.move_1, cf.move_2, cf.move_3, cf.move_4,
        cf.level,
        cf.elo_rating as elo,
        cf.power_score as power,
        cf.vote_power as votePower,
        cf.battle_power as battlePower,
        cf.total_combat_wins as wins,
        cf.total_combat_losses as losses,
        cf.total_combat_draws as draws,
        COALESCE(dp.display_name, '') as ownerName,
        cf.owner_did
      FROM combat_fighters cf
      LEFT JOIN did_profiles dp ON dp.did_id = cf.owner_did
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    bindings.push(limit, offset);

    const results = await env.DB.prepare(query).bind(...bindings).all();

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM combat_fighters cf ${whereClause}`;
    const countBindings = typeFilter ? [typeFilter] : [];
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
