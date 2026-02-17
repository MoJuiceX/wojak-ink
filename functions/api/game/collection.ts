// Collection API — returns all NFTs held by a player's DID with scores.
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const did = url.searchParams.get('did');

  if (!did) {
    return Response.json({ error: 'DID required' }, { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT dh.nft_id, dh.edition_number, dh.collection, dh.creator_wallet,
              ws.likes, ws.dislikes, ws.net_score, ws.total_votes,
              nn.custom_name, nn.full_name
       FROM did_holdings dh
       LEFT JOIN wojak_scores ws ON dh.nft_id = ws.nft_id
       LEFT JOIN nft_names nn ON dh.edition_number = nn.edition_number
       WHERE dh.did_id = ?
       ORDER BY COALESCE(ws.net_score, 0) DESC`
    ).bind(did).all();

    const nfts = (results || []).map((row: Record<string, unknown>) => ({
      nftId: row.nft_id,
      editionNumber: row.edition_number,
      collection: row.collection,
      creatorWallet: row.creator_wallet,
      name: (row.custom_name as string) || (row.full_name as string) || `Your Wojak #${row.edition_number}`,
      likes: (row.likes as number) || 0,
      dislikes: (row.dislikes as number) || 0,
      netScore: (row.net_score as number) || 0,
      totalVotes: (row.total_votes as number) || 0,
    }));

    return Response.json({ success: true, nfts, count: nfts.length });
  } catch (_err) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
