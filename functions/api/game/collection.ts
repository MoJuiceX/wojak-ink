// Collection API — returns all NFTs held by a player's DID with scores.
interface Env {
  DB: D1Database;
}

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
              nn.custom_name, nn.full_name,
              pm.ipfs_image_uri,
              (SELECT COUNT(*) FROM battles b
               WHERE b.nft_a_id = dh.nft_id OR b.nft_b_id = dh.nft_id) as battle_count,
              (SELECT COUNT(*) FROM battles b
               WHERE b.winner_nft_id = dh.nft_id) as battle_wins
       FROM did_holdings dh
       LEFT JOIN wojak_scores ws ON dh.nft_id = ws.nft_id
       LEFT JOIN nft_names nn ON dh.edition_number = nn.edition_number
       LEFT JOIN phase2_mints pm ON dh.edition_number = pm.mint_number
       WHERE dh.did_id = ?
       ORDER BY COALESCE(ws.net_score, 0) DESC`
    ).bind(did).all();

    const nfts = (results || []).map((row: Record<string, unknown>) => ({
      nftId: row.nft_id,
      editionNumber: row.edition_number,
      collection: row.collection,
      creatorWallet: row.creator_wallet,
      name: (row.custom_name as string) || (row.full_name as string) || `Your Wojak #${row.edition_number}`,
      imageUri: resolveImageUri(row.ipfs_image_uri as string | null),
      likes: (row.likes as number) || 0,
      dislikes: (row.dislikes as number) || 0,
      netScore: (row.net_score as number) || 0,
      totalVotes: (row.total_votes as number) || 0,
      battleCount: (row.battle_count as number) || 0,
      battleWins: (row.battle_wins as number) || 0,
    }));

    return Response.json({ success: true, nfts, count: nfts.length });
  } catch (_err) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
