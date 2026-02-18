/**
 * Game auth — verifies the player's DID exists in the database.
 * No Clerk dependency. The DID trust chain is:
 *   WalletConnect (proves wallet) → getDIDs() (proves DID ownership) → register (creates player).
 * Rate limiting uses DID instead of Clerk userId.
 */

interface GameAuthEnv {
  DB: D1Database;
}

/**
 * Verify that the claimed DID is a registered game player.
 * Returns the DID for rate limiting, or an error Response.
 */
export async function verifyGamePlayer(
  env: GameAuthEnv,
  did: string
): Promise<{ did: string } | Response> {
  if (!did) {
    return Response.json({ error: 'DID required' }, { status: 400 });
  }

  const player = await env.DB.prepare(
    'SELECT did_id FROM game_players WHERE did_id = ?'
  ).bind(did).first();

  if (!player) {
    return Response.json({ error: 'Player not registered' }, { status: 404 });
  }

  return { did };
}

/** Type guard: returns true if the result is an error Response */
export function isAuthError(result: { did: string } | Response): result is Response {
  return result instanceof Response;
}
