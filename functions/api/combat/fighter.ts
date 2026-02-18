// functions/api/combat/fighter.ts
// GET /api/combat/fighter?nftId=xxx — lookup a combat fighter by NFT ID
// GET /api/combat/fighter?ownerDid=xxx — lookup ALL combat fighters owned by a DID

import { jsonResponse, errorResponse, buildFighterResponse, isValidDid } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');
  const ownerDid = url.searchParams.get('ownerDid');

  if (ownerDid) {
    if (!isValidDid(ownerDid)) return errorResponse('Invalid DID format');

    const results = await context.env.DB.prepare(
      'SELECT * FROM combat_fighters WHERE owner_did = ? ORDER BY level DESC, xp DESC'
    ).bind(ownerDid).all();

    const fighters = (results.results ?? []).map((row: any) => buildFighterResponse(row));
    return jsonResponse({ ownerDid, fighters });
  }

  if (!nftId) return errorResponse('Missing nftId or ownerDid parameter');

  const row = await context.env.DB.prepare(
    'SELECT * FROM combat_fighters WHERE nft_id = ?'
  ).bind(nftId).first();

  if (!row) return errorResponse('Fighter not found', 404);

  return jsonResponse(buildFighterResponse(row));
};
