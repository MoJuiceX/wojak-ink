// Compact stats bar for mobile — replaces side panels.
// 2 segments: Player Score + Rank. Tap navigates to rankings.

import { useNavigate } from 'react-router-dom';
import { useFightClubMyScore } from '@/hooks/useFightClubMyScore';
import { useGame } from '@/contexts/GameContext';

export function MobileStatsBar() {
  const { player } = useGame();
  const { data: scoreData } = useFightClubMyScore();
  const navigate = useNavigate();

  const handleTap = () => navigate('/fight-club/rankings');

  if (!player) return null;

  const playerScore = scoreData?.playerScore ?? 0;
  const ranked = scoreData?.ranked ?? false;
  const rank = scoreData?.rank ?? null;
  const eligibleCount = scoreData?.eligibleWojakCount ?? 0;

  return (
    <div className="voting-stats-bar" onClick={handleTap} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleTap()}>
      <div className="voting-stats-bar-segment">
        <span className="voting-stats-bar-value">{playerScore.toLocaleString()}</span>
        <span className="voting-stats-bar-label">Player Score</span>
      </div>
      <div className="voting-stats-bar-segment">
        <span className="voting-stats-bar-value">{ranked ? `#${rank}` : `${eligibleCount} eligible`}</span>
        <span className="voting-stats-bar-label">{ranked ? 'Rank' : 'Wojaks'}</span>
      </div>
    </div>
  );
}
