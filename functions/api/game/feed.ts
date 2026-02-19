// GET /api/game/feed?did=<optional>&guestId=<optional>&limit=10
// Returns Wojaks for voting, weighted by recency (newer = more likely).
// For authenticated users: excludes already voted, own creations, own holdings.
// For guests: only excludes recently voted (if guestId provided).

import { resolveImageUri, isValidGuestId } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did');
    const guestId = url.searchParams.get('guestId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);

    // Validate guestId format if provided
    if (guestId && !isValidGuestId(guestId)) {
      return Response.json({ error: 'Invalid guest ID format' }, { status: 400 });
    }

    // Voter ID for cooldown tracking (DID takes priority over guestId)
    const voterId = did || guestId || null;

    // Get player info if DID provided (for creator/holdings exclusion)
    let player: Record<string, unknown> | null = null;
    if (did) {
      player = await context.env.DB.prepare(
        'SELECT wallet_address, phase1_verified FROM game_players WHERE did_id = ?'
      ).bind(did).first();
      // Note: We no longer require phase1_verified for feed access
    }

    // Build the query based on what exclusions we can apply
    let query: string;
    let bindings: unknown[];

    if (did && player) {
      // Authenticated user with player record: full exclusions
      query = `
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
          -- Exclude voted in last 24 hours (cooldown period)
          AND NOT EXISTS (
            SELECT 1 FROM wojak_votes wv
            WHERE wv.voter_did = ? AND wv.nft_id = pm.mintgarden_launcher_id
            AND wv.created_at > datetime('now', '-24 hours')
          )
          -- Exclude own creations
          AND pm.wallet_address != ?
          -- Exclude own holdings
          AND NOT EXISTS (
            SELECT 1 FROM did_holdings dh
            WHERE dh.did_id = ? AND dh.nft_id = pm.mintgarden_launcher_id
          )
        ORDER BY
          ABS(RANDOM()) / (
            (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
            (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at))) *
            CASE WHEN EXISTS (
              SELECT 1 FROM battles bl
              WHERE bl.status = 'active'
              AND (bl.nft_a_id = pm.mintgarden_launcher_id OR bl.nft_b_id = pm.mintgarden_launcher_id)
            ) THEN 5.0 ELSE 1.0 END
          )
        LIMIT ?
      `;
      bindings = [did, player.wallet_address, did, limit];
    } else if (voterId) {
      // Guest or unregistered user with voterId: only cooldown exclusion
      query = `
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
          -- Exclude voted in last 24 hours (cooldown period)
          AND NOT EXISTS (
            SELECT 1 FROM wojak_votes wv
            WHERE wv.voter_did = ? AND wv.nft_id = pm.mintgarden_launcher_id
            AND wv.created_at > datetime('now', '-24 hours')
          )
        ORDER BY
          ABS(RANDOM()) / (
            (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
            (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at))) *
            CASE WHEN EXISTS (
              SELECT 1 FROM battles bl
              WHERE bl.status = 'active'
              AND (bl.nft_a_id = pm.mintgarden_launcher_id OR bl.nft_b_id = pm.mintgarden_launcher_id)
            ) THEN 5.0 ELSE 1.0 END
          )
        LIMIT ?
      `;
      bindings = [voterId, limit];
    } else {
      // Anonymous user: no exclusions, fully random weighted feed
      query = `
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
        ORDER BY
          ABS(RANDOM()) / (
            (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
            (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at))) *
            CASE WHEN EXISTS (
              SELECT 1 FROM battles bl
              WHERE bl.status = 'active'
              AND (bl.nft_a_id = pm.mintgarden_launcher_id OR bl.nft_b_id = pm.mintgarden_launcher_id)
            ) THEN 5.0 ELSE 1.0 END
          )
        LIMIT ?
      `;
      bindings = [limit];
    }

    const feed = await context.env.DB.prepare(query).bind(...bindings).all();

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
