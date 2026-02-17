// Compact stats bar for mobile — replaces side panels.
// 2 segments: power level + votes remaining. Tap navigates to dashboard.

import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';

export function MobileStatsBar() {
  const { player } = useGame();
  const navigate = useNavigate();

  const handleTap = () => navigate('/games/your-wojak/dashboard');

  if (!player) return null;

  return (
    <div className="voting-stats-bar" onClick={handleTap} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleTap()}>
      <div className="voting-stats-bar-segment">
        <span className="voting-stats-bar-value">{player.powerLevel.toLocaleString()}</span>
        <span className="voting-stats-bar-label">Power Level</span>
      </div>
      <div className="voting-stats-bar-segment">
        <span className="voting-stats-bar-value">{player.votesRemaining}/10</span>
        <span className="voting-stats-bar-label">votes left</span>
      </div>
    </div>
  );
}
