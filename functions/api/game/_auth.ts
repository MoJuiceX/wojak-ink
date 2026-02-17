import { authenticateRequest } from '../../lib/auth';

interface GameAuthEnv {
  DB: D1Database;
  CLERK_DOMAIN?: string;
}

/**
 * Verify that the authenticated Clerk user owns the claimed DID.
 * On first authenticated call by a legacy player, binds the Clerk userId to the DID.
 * Returns the auth result or an error Response.
 */
export async function verifyGameAuth(
  request: Request,
  env: GameAuthEnv,
  did: string
): Promise<{ userId: string } | Response> {
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const player = await env.DB.prepare(
    'SELECT clerk_user_id FROM game_players WHERE did_id = ?'
  ).bind(did).first<{ clerk_user_id: string | null }>();

  if (!player) {
    return Response.json({ error: 'Player not registered' }, { status: 404 });
  }

  // If DID is bound to a different Clerk user, reject
  if (player.clerk_user_id && player.clerk_user_id !== auth.userId) {
    return Response.json({ error: 'DID does not belong to your account' }, { status: 403 });
  }

  // First authenticated call by a legacy (pre-L3) player — bind now
  if (!player.clerk_user_id) {
    await env.DB.prepare(
      'UPDATE game_players SET clerk_user_id = ? WHERE did_id = ? AND clerk_user_id IS NULL'
    ).bind(auth.userId, did).run();
  }

  return { userId: auth.userId };
}

/** Type guard: returns true if the result is an error Response */
export function isAuthError(result: { userId: string } | Response): result is Response {
  return result instanceof Response;
}
