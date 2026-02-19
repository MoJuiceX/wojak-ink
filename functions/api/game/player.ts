// GET /api/game/player?wallet=...
// Lookup a player by wallet address to get their DID.
// Used by FightClub and Account pages to resolve wallet → DID.

import { isValidChiaAddress } from '../../lib/validation';

interface Env {
  DB: D1Database;
}

interface GamePlayer {
  did_id: string;
  wallet_address: string;
  power_level: number;
  phase1_verified: number;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const wallet = url.searchParams.get('wallet');

    if (!wallet) {
      return Response.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    if (!isValidChiaAddress(wallet)) {
      return Response.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    const player = await context.env.DB.prepare(
      'SELECT did_id, wallet_address, power_level, phase1_verified FROM game_players WHERE wallet_address = ?'
    ).bind(wallet).first<GamePlayer>();

    if (!player) {
      return Response.json({ player: null });
    }

    return Response.json({
      player: {
        did: player.did_id,
        wallet: player.wallet_address,
        powerLevel: player.power_level,
        phase1Verified: !!player.phase1_verified,
      },
    });
  } catch (err) {
    console.error('Game player lookup error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
