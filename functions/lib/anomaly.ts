/**
 * Statistical Anomaly Detection
 *
 * Accepts all scores but flags outliers for review.
 * Does not block players - just logs suspicious activity.
 *
 * @see claude-specs/11-SERVER-STATE-SPEC.md
 */

export interface AnomalyCheck {
  isFlagged: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

interface GameStats {
  avg_score: number | null;
  max_score: number | null;
  avg_duration: number | null;
  total_games: number | null;
}

/**
 * Check for statistical anomalies in a game score
 *
 * Criteria:
 * 1. Score > 99th percentile (roughly 3x average)
 * 2. Impossibly fast completion (<10 seconds with high score)
 * 3. Suspicious points-per-second ratio (>5x average)
 */
export async function checkForAnomalies(
  db: D1Database,
  userId: string,
  gameId: string,
  score: number,
  durationSeconds: number
): Promise<AnomalyCheck> {
  // Get historical stats for this game
  const stats = await db
    .prepare(
      `SELECT
        AVG(final_score) as avg_score,
        MAX(final_score) as max_score,
        AVG(duration_seconds) as avg_duration,
        COUNT(*) as total_games
      FROM game_sessions
      WHERE game_id = ? AND completed_at IS NOT NULL`
    )
    .bind(gameId)
    .first<GameStats>();

  const avgScore = stats?.avg_score || 0;
  const maxScore = stats?.max_score || 0;
  const avgDuration = stats?.avg_duration || 60;
  const totalGames = stats?.total_games || 0;

  // Only apply checks if we have enough data (at least 100 games played)
  if (totalGames < 100) {
    return { isFlagged: false };
  }

  // Check 1: Score is > 99th percentile (roughly 3x average for most distributions)
  if (score > avgScore * 3 && score > maxScore) {
    return {
      isFlagged: true,
      reason: 'percentile_99',
      details: { score, avgScore, maxScore, threshold: avgScore * 3 },
    };
  }

  // Check 2: Impossibly fast completion
  const minReasonableTime = 10; // seconds
  if (durationSeconds < minReasonableTime && score > avgScore) {
    return {
      isFlagged: true,
      reason: 'impossible_time',
      details: { durationSeconds, minReasonableTime, score },
    };
  }

  // Check 3: Score/time ratio is suspicious (too many points per second)
  const pointsPerSecond = score / Math.max(durationSeconds, 1);
  const avgPointsPerSecond = avgScore / Math.max(avgDuration, 1);
  if (pointsPerSecond > avgPointsPerSecond * 5) {
    return {
      isFlagged: true,
      reason: 'pattern_anomaly',
      details: { pointsPerSecond, avgPointsPerSecond },
    };
  }

  return { isFlagged: false };
}

/**
 * Flag a score for review (does not block the reward)
 */
export async function flagScore(
  db: D1Database,
  userId: string,
  gameId: string,
  sessionId: string,
  score: number,
  reason: string,
  details: Record<string, unknown>
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO flagged_scores (user_id, game_id, session_id, score, flag_reason, flag_details)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(userId, gameId, sessionId, score, reason, JSON.stringify(details))
    .run();

  console.warn(`[ANOMALY] Flagged score for user ${userId}: ${reason}`, details);
}
