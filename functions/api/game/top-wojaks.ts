// Top Wojaks API — NFTs ranked by net vote score.
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  try {
    const { results } = await env.DB.prepare(
      `SELECT ws.nft_id, ws.edition_number, ws.likes, ws.dislikes,
              ws.net_score, ws.total_votes,
              nn.custom_name, nn.full_name,
              dh.did_id AS owner_did, dh.creator_wallet
       FROM wojak_scores ws
       LEFT JOIN nft_names nn ON ws.edition_number = nn.edition_number
       LEFT JOIN did_holdings dh ON ws.nft_id = dh.nft_id
       WHERE ws.total_votes > 0
       ORDER BY ws.net_score DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM wojak_scores WHERE total_votes > 0`
    ).first<{ total: number }>();

    const wojaks = (results || []).map((row: Record<string, unknown>, i: number) => ({
      rank: offset + i + 1,
      nftId: row.nft_id,
      editionNumber: row.edition_number,
      name: (row.custom_name as string) || (row.full_name as string) || `Your Wojak #${row.edition_number}`,
      netScore: (row.net_score as number) || 0,
      likes: (row.likes as number) || 0,
      dislikes: (row.dislikes as number) || 0,
      totalVotes: (row.total_votes as number) || 0,
      creatorWallet: row.creator_wallet || null,
      ownerDid: row.owner_did || null,
    }));

    return Response.json({
      success: true,
      wojaks,
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (_err) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
