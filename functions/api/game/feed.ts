// GET /api/game/feed?did=<voter_did>&limit=10
// Returns Wojaks for voting, weighted by recency (newer = more likely).
// Excludes: already voted, own creations, own holdings.

interface Env {
  DB: D1Database;
}

// ipfs_image_uri can be a plain URL string or a JSON array of gateway URLs.
// Extract the first usable HTTP URL.
function resolveImageUri(raw: string | null): string {
  if (!raw) return '';
  if (raw.startsWith('[')) {
    try {
      const urls = JSON.parse(raw) as string[];
      return urls.find(u => u.startsWith('https://')) || urls[0] || '';
    } catch {
      return raw;
    }
  }
  return raw;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);

    if (!did) {
      return Response.json({ error: 'DID required' }, { status: 400 });
    }

    // Get player's wallet for creator exclusion
    const player = await context.env.DB.prepare(
      'SELECT wallet_address, phase1_verified FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    if (!player || !player.phase1_verified) {
      return Response.json({ error: 'Player not verified' }, { status: 403 });
    }

    // Weighted random feed:
    // - Start with all Phase 2 NFTs not yet voted on by this user
    // - Exclude NFTs the user holds or created
    // - Weight by: (1 / (1 + total_votes)) * recency_factor
    // - recency_factor = 1 / (1 + days_since_mint)
    //
    // Using a simplified approach: ORDER BY a score that combines
    // inverse vote count with recency, plus randomness.
    const feed = await context.env.DB.prepare(`
      SELECT
        pm.mint_number as edition_number,
        pm.mintgarden_launcher_id as nft_id,
        pm.wallet_address as creator_wallet,
        pm.layers_json,
        pm.ipfs_image_uri,
        nn.custom_name,
        nn.full_name,
        COALESCE(ws.total_votes, 0) as total_votes,
        COALESCE(ws.likes, 0) as likes,
        COALESCE(ws.dislikes, 0) as dislikes
      FROM phase2_mints pm
      LEFT JOIN wojak_scores ws ON ws.edition_number = pm.mint_number
      LEFT JOIN nft_names nn ON nn.edition_number = pm.mint_number
      WHERE pm.status = 'minted'
        AND pm.mintgarden_launcher_id IS NOT NULL
        -- Exclude already voted
        AND NOT EXISTS (
          SELECT 1 FROM wojak_votes wv
          WHERE wv.voter_did = ? AND wv.nft_id = pm.mintgarden_launcher_id
        )
        -- Exclude own creations
        AND pm.wallet_address != ?
        -- Exclude own holdings
        AND NOT EXISTS (
          SELECT 1 FROM did_holdings dh
          WHERE dh.did_id = ? AND dh.nft_id = pm.mintgarden_launcher_id
        )
      ORDER BY
        -- Weighted random: newer + fewer votes = higher chance
        -- ABS(RANDOM()) gives random ordering, divided by weight for bias
        ABS(RANDOM()) / (
          (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
          (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at)))
        )
      LIMIT ?
    `).bind(did, player.wallet_address, did, limit).all();

    return Response.json({
      success: true,
      feed: feed.results.map((row: Record<string, unknown>) => ({
        nftId: row.nft_id,
        editionNumber: row.edition_number,
        creatorWallet: row.creator_wallet,
        name: row.full_name || `Your Wojak #${row.edition_number}`,
        customName: row.custom_name,
        imageUri: resolveImageUri(row.ipfs_image_uri as string),
        totalVotes: row.total_votes,
        likes: row.likes,
        dislikes: row.dislikes,
      })),
    });
  } catch (err) {
    console.error('Feed error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
