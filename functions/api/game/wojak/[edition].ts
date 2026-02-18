// GET /api/game/wojak/:edition — NFT profile data.
import { resolveImageUri } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const edition = parseInt(context.params.edition as string);
    if (isNaN(edition) || edition < 1) {
      return Response.json({ error: 'Invalid edition number' }, { status: 400 });
    }

    // NFT core data: phase2_mints + nft_names + wojak_scores + did_holdings + game_players
    const nft = await context.env.DB.prepare(`
      SELECT
        dh.nft_id,
        dh.edition_number,
        dh.did_id AS owner_did,
        dh.creator_wallet,
        nn.custom_name,
        nn.full_name,
        ws.likes,
        ws.dislikes,
        ws.net_score,
        ws.total_votes,
        pm.ipfs_image_uri,
        gp.wallet_address AS owner_wallet
      FROM did_holdings dh
      LEFT JOIN nft_names nn ON dh.edition_number = nn.edition_number
      LEFT JOIN wojak_scores ws ON dh.nft_id = ws.nft_id
      LEFT JOIN phase2_mints pm ON dh.edition_number = pm.mint_number
      LEFT JOIN game_players gp ON dh.did_id = gp.did_id
      WHERE dh.edition_number = ? AND dh.collection = 'phase2'
      LIMIT 1
    `).bind(edition).first();

    if (!nft) {
      // Fallback: try phase2_mints directly (NFT might not be in did_holdings yet)
      const mint = await context.env.DB.prepare(`
        SELECT pm.mint_number, pm.wallet_address, pm.ipfs_image_uri, pm.mintgarden_launcher_id,
               nn.custom_name, nn.full_name,
               ws.likes, ws.dislikes, ws.net_score, ws.total_votes
        FROM phase2_mints pm
        LEFT JOIN nft_names nn ON pm.mint_number = nn.edition_number
        LEFT JOIN wojak_scores ws ON pm.mintgarden_launcher_id = ws.nft_id
        WHERE pm.mint_number = ? AND pm.status = 'minted'
        LIMIT 1
      `).bind(edition).first();

      if (!mint) {
        return Response.json({ error: 'NFT not found' }, { status: 404 });
      }

      const customName = (mint.custom_name as string) || null;
      const baseName = `Your Wojak #${edition}`;
      return Response.json({
        success: true,
        nft: {
          nftId: mint.mintgarden_launcher_id || null,
          edition,
          name: customName || baseName,
          customName,
          fullName: (mint.full_name as string) || baseName,
          imageUri: resolveImageUri(mint.ipfs_image_uri as string | null),
          ownerWallet: (mint.wallet_address as string) || null,
          ownerDid: null,
          creatorWallet: (mint.wallet_address as string) || null,
        },
        scores: {
          likes: (mint.likes as number) || 0,
          dislikes: (mint.dislikes as number) || 0,
          netScore: (mint.net_score as number) || 0,
          totalVotes: (mint.total_votes as number) || 0,
        },
        battles: { total: 0, wins: 0, losses: 0, draws: 0, history: [] },
        sales: [],
      });
    }

    const nftId = nft.nft_id as string;
    const customName = (nft.custom_name as string) || null;
    const baseName = `Your Wojak #${edition}`;

    // Battle history for this NFT
    const battleResults = await context.env.DB.prepare(`
      SELECT b.id, b.nft_a_id, b.nft_a_edition, b.nft_b_id, b.nft_b_edition,
             b.status, b.winner_nft_id, b.resolved_at,
             b.nft_a_score_start, b.nft_b_score_start,
             b.nft_a_score_end, b.nft_b_score_end,
             na.full_name AS name_a, nb.full_name AS name_b
      FROM battles b
      LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
      LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
      WHERE (b.nft_a_id = ? OR b.nft_b_id = ?)
        AND b.status IN ('completed', 'draw')
      ORDER BY b.resolved_at DESC
      LIMIT 20
    `).bind(nftId, nftId).all();

    let wins = 0, losses = 0, draws = 0;
    const history = (battleResults.results || []).map((b) => {
      const isA = b.nft_a_id === nftId;
      const won = b.winner_nft_id === nftId;
      const isDraw = b.status === 'draw';

      if (isDraw) draws++;
      else if (won) wins++;
      else losses++;

      const startA = (b.nft_a_score_start as number) ?? 0;
      const startB = (b.nft_b_score_start as number) ?? 0;
      const endA = b.nft_a_score_end as number | null;
      const endB = b.nft_b_score_end as number | null;
      const myDelta = isA
        ? (endA != null ? endA - startA : 0)
        : (endB != null ? endB - startB : 0);

      return {
        id: b.id,
        opponentEdition: isA ? b.nft_b_edition : b.nft_a_edition,
        opponentName: (isA ? b.name_b : b.name_a) || `Your Wojak #${isA ? b.nft_b_edition : b.nft_a_edition}`,
        result: isDraw ? 'draw' : (won ? 'win' : 'loss'),
        scoreDelta: myDelta,
        resolvedAt: b.resolved_at,
      };
    });

    // Sales history
    const salesResults = await context.env.DB.prepare(`
      SELECT completed_at, original_amount, currency, xch_equivalent, usd_value, source, token_code
      FROM sales_history
      WHERE nft_edition = ?
      ORDER BY completed_at_unix DESC
      LIMIT 20
    `).bind(edition).all();

    const sales = (salesResults.results || []).map((s) => ({
      date: s.completed_at,
      price: String(s.original_amount),
      currency: s.currency,
      tokenCode: s.token_code || null,
      xchEquivalent: s.xch_equivalent,
      usdValue: s.usd_value,
      source: s.source,
    }));

    return Response.json({
      success: true,
      nft: {
        nftId,
        edition,
        name: customName || baseName,
        customName,
        fullName: (nft.full_name as string) || baseName,
        imageUri: resolveImageUri(nft.ipfs_image_uri as string | null),
        ownerWallet: (nft.owner_wallet as string) || null,
        ownerDid: (nft.owner_did as string) || null,
        creatorWallet: (nft.creator_wallet as string) || null,
      },
      scores: {
        likes: (nft.likes as number) || 0,
        dislikes: (nft.dislikes as number) || 0,
        netScore: (nft.net_score as number) || 0,
        totalVotes: (nft.total_votes as number) || 0,
      },
      battles: {
        total: wins + losses + draws,
        wins,
        losses,
        draws,
        history,
      },
      sales,
    });
  } catch (err) {
    console.error('Wojak profile error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
