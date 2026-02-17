// POST /api/game/burn
// Records a burn done through our UI (Path B).
// The actual on-chain burn is handled by the wallet.
// This endpoint just records it and awards credits.

interface Env {
  DB: D1Database;
}

const BURN_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy';

// Credit formula based on vote ratio
function calculateBurnCredits(likes: number, dislikes: number): number {
  const total = likes + dislikes;
  if (total === 0) return 500; // Unvoted = small reward (5 credits)

  const dislikeRatio = dislikes / total;

  // Heavily disliked (>70% dislikes): 2000 credits (20 credits)
  // Moderately disliked (50-70%): 1200 credits (12 credits)
  // Neutral (30-50% dislikes): 500 credits (5 credits)
  // Liked (<30% dislikes): 200 credits (2 credits)
  if (dislikeRatio > 0.7) return 2000;
  if (dislikeRatio > 0.5) return 1200;
  if (dislikeRatio > 0.3) return 500;
  return 200;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      nftId: string;
      editionNumber: number;
      burnerDid: string;
      burnerWallet: string;
    };

    const { nftId, editionNumber, burnerDid, burnerWallet } = body;

    if (!nftId || !editionNumber || !burnerWallet) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current vote scores for this NFT
    const scores = await context.env.DB.prepare(
      'SELECT likes, dislikes, net_score FROM wojak_scores WHERE nft_id = ?'
    ).bind(nftId).first();

    const likes = (scores?.likes as number) || 0;
    const dislikes = (scores?.dislikes as number) || 0;
    const netScore = (scores?.net_score as number) || 0;
    const credits = calculateBurnCredits(likes, dislikes);

    // Record burn and award credits
    try {
      await context.env.DB.batch([
        context.env.DB.prepare(`
          INSERT INTO wojak_burns (nft_id, edition_number, burner_did, burner_wallet, net_score_at_burn, credits_awarded, detected_via)
          VALUES (?, ?, ?, ?, ?, ?, 'ui')
        `).bind(nftId, editionNumber, burnerDid || null, burnerWallet, netScore, credits),
        // Award credits
        context.env.DB.prepare(`
          INSERT INTO credit_events (wallet_address, nft_id, edition_number, credits_earned, source, created_at)
          VALUES (?, ?, ?, ?, 'burn', datetime('now'))
        `).bind(burnerWallet, nftId, editionNumber, credits),
        // Remove from did_holdings
        context.env.DB.prepare(
          'DELETE FROM did_holdings WHERE nft_id = ?'
        ).bind(nftId),
        // Log activity
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'burn', ?)
        `).bind(
          burnerDid || '',
          JSON.stringify({
            editionNumber,
            nftId,
            netScore,
            creditsEarned: credits,
            likes,
            dislikes,
          })
        ),
      ]);
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('UNIQUE')) {
        return Response.json({ error: 'This NFT has already been burned' }, { status: 409 });
      }
      throw e;
    }

    return Response.json({
      success: true,
      creditsEarned: credits,
      burnAddress: BURN_ADDRESS,
      message: `Burned Your Wojak #${editionNumber}. Earned ${credits / 100} credits.`,
    });
  } catch (err) {
    console.error('Burn error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
