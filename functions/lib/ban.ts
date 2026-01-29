/**
 * Ban System Utilities
 *
 * Zero-tolerance cheater ban system with immediate permanent bans.
 * @see claude-specs/11-SERVER-STATE-SPEC.md
 */

// Env interface kept for documentation - DB binding used by functions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _Env {
  DB: D1Database;
}

/**
 * Check if a user is banned
 *
 * @returns true if user is banned (and appeal not approved), false otherwise
 */
export async function checkBanned(db: D1Database, userId: string): Promise<boolean> {
  const banned = await db
    .prepare("SELECT 1 FROM banned_users WHERE user_id = ? AND appeal_status != 'approved'")
    .bind(userId)
    .first();
  return !!banned;
}

/**
 * Ban a user for cheating or violation
 */
export async function banUser(
  db: D1Database,
  userId: string,
  reason: string,
  evidence: Record<string, unknown>
): Promise<void> {
  // Ban the user
  await db
    .prepare(
      `INSERT INTO banned_users (user_id, reason, evidence)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         reason = ?,
         evidence = ?,
         banned_at = CURRENT_TIMESTAMP`
    )
    .bind(userId, reason, JSON.stringify(evidence), reason, JSON.stringify(evidence))
    .run();

  // Void all their pending rewards
  await db
    .prepare(`DELETE FROM game_sessions WHERE user_id = ? AND reward_claimed = 0`)
    .bind(userId)
    .run();

  // Clear any active sessions
  await db.prepare(`DELETE FROM active_sessions WHERE user_id = ?`).bind(userId).run();

  console.warn(`[BAN] User ${userId} banned for: ${reason}`);
}

/**
 * Response helper for banned users
 */
export function bannedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Account suspended',
      message: 'Your account has been permanently suspended for violating terms of service.',
      appealUrl: 'https://wojak.ink/appeal',
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
