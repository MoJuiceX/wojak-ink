// functions/api/combat/fighter.ts
// GET /api/combat/fighter?nftId=xxx — lookup a combat fighter by NFT ID

import { jsonResponse, errorResponse, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');

  if (!nftId) return errorResponse('Missing nftId parameter');

  const row = await context.env.DB.prepare(
    'SELECT * FROM combat_fighters WHERE nft_id = ?'
  ).bind(nftId).first();

  if (!row) return errorResponse('Fighter not found', 404);

  return jsonResponse(buildFighterResponse(row));
};
