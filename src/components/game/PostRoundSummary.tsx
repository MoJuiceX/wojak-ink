// Post-round summary shown after 10th vote.
// Shows session stats, power level delta, and navigation CTAs.

import { motion } from 'framer-motion';
import { defaultSpring } from '@/config/springs';
import { Link } from 'react-router-dom';

interface PostRoundSummaryProps {
  likes: number;
  dislikes: number;
  powerLevel: number;
  powerLevelDelta: number;
  voteStreak?: number;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 100];

function getNextMilestone(streak: number): number | null {
  for (const m of STREAK_MILESTONES) {
    if (streak < m) return m;
  }
  return null;
}

export function PostRoundSummary({
  likes,
  dislikes,
  powerLevel,
  powerLevelDelta,
  voteStreak,
}: PostRoundSummaryProps) {
  const totalVotes = likes + dislikes;

  return (
    <motion.div
      className="card-static p-8 flex flex-col items-center gap-4"
      style={{ maxWidth: 380, width: '100%' }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={defaultSpring}
    >
      <h2 className="text-xl font-bold">Session Complete</h2>
      <p className="text-secondary text-sm">
        You voted on {totalVotes} Wojak{totalVotes !== 1 ? 's' : ''}
      </p>

      {/* Like / dislike counts */}
      <div className="flex items-center gap-4" style={{ fontSize: 16 }}>
        <span className="text-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {likes} liked
        </span>
        <span className="text-muted">&middot;</span>
        <span className="text-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
          {dislikes} disliked
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

      {/* Power Level */}
      <div className="flex items-center gap-2" style={{ fontSize: 16 }}>
        <span className="font-bold">Power Level: {powerLevel.toLocaleString()}</span>
        {powerLevelDelta !== 0 && (
          <span style={{ color: powerLevelDelta > 0 ? 'var(--color-success)' : 'var(--color-error)', fontSize: 14 }}>
            ({powerLevelDelta > 0 ? '+' : ''}{powerLevelDelta})
          </span>
        )}
      </div>

      {voteStreak != null && voteStreak > 0 && (
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold text-accent" style={{ fontSize: 14 }}>
            {voteStreak}-day vote streak!
          </span>
          {(() => {
            const next = getNextMilestone(voteStreak);
            return next ? (
              <span className="text-muted" style={{ fontSize: 12 }}>
                Next bonus at {next} days
              </span>
            ) : null;
          })()}
        </div>
      )}

      <p className="text-secondary text-sm text-center">
        Come back tomorrow for 10 more votes.
      </p>

      {/* CTAs */}
      <div className="flex flex-col gap-2 w-full">
        <Link to="/swipe/leaderboard" className="btn btn-primary text-center">
          View Leaderboard
        </Link>
        <Link to="/swipe/dashboard" className="btn btn-secondary text-center">
          Go to Dashboard
        </Link>
      </div>
    </motion.div>
  );
}
