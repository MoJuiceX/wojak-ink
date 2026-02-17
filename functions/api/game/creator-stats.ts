// GET /api/game/creator-stats?wallet=xch1...
// Returns creator stats: minted count, total votes, avg score, battle record, top NFT.

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const wallet = url.searchParams.get('wallet');

    if (!wallet) {
      return Response.json({ error: 'wallet parameter required' }, { status: 400 });
    }

    // 1. Count of minted NFTs
    const minted = await context.env.DB.prepare(
      "SELECT COUNT(*) as count FROM phase2_mints WHERE wallet_address = ? AND status = 'minted'"
    ).bind(wallet).first();

    const mintedCount = (minted?.count as number) || 0;

    if (mintedCount === 0) {
      return Response.json({ success: true, hasStats: false });
    }

    // 2. Aggregate scores across all creations
    const scores = await context.env.DB.prepare(`
      SELECT COUNT(*) as nftCount,
             COALESCE(SUM(likes), 0) as totalLikes,
             COALESCE(SUM(dislikes), 0) as totalDislikes,
             COALESCE(SUM(net_score), 0) as totalNetScore,
             COALESCE(SUM(total_votes), 0) as totalVotes,
             COALESCE(AVG(net_score), 0) as avgNetScore
      FROM wojak_scores WHERE creator_wallet = ?
    `).bind(wallet).first();

    // 3. Top performer
    const topNft = await context.env.DB.prepare(`
      SELECT ws.nft_id, ws.edition_number, ws.net_score, ws.total_votes,
             COALESCE(nn.custom_name, nn.full_name, 'Your Wojak #' || ws.edition_number) as name
      FROM wojak_scores ws
      LEFT JOIN nft_names nn ON ws.edition_number = nn.edition_number
      WHERE ws.creator_wallet = ?
      ORDER BY ws.net_score DESC LIMIT 1
    `).bind(wallet).first();

    return Response.json({
      success: true,
      hasStats: true,
      stats: {
        mintedCount,
        scoredCount: (scores?.nftCount as number) || 0,
        totalLikes: (scores?.totalLikes as number) || 0,
        totalDislikes: (scores?.totalDislikes as number) || 0,
        totalVotes: (scores?.totalVotes as number) || 0,
        avgNetScore: Math.round(((scores?.avgNetScore as number) || 0) * 10) / 10,
        topNft: topNft ? {
          edition: topNft.edition_number,
          name: topNft.name,
          netScore: topNft.net_score,
          totalVotes: topNft.total_votes,
        } : null,
      },
    });
  } catch (err) {
    console.error('Creator stats error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
