// functions/api/combat/fighters.ts
// GET /api/combat/fighters?ownerDid=xxx — list all combat fighters owned by a DID

import { jsonResponse, errorResponse, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const ownerDid = url.searchParams.get('ownerDid');

  if (!ownerDid) return errorResponse('Missing ownerDid parameter');

  const { results } = await context.env.DB.prepare(
    'SELECT * FROM combat_fighters WHERE owner_did = ? ORDER BY level DESC, elo_rating DESC'
  ).bind(ownerDid).all();

  if (!results || results.length === 0) {
    return jsonResponse([]);
  }

  return jsonResponse(results.map(buildFighterResponse));
};
