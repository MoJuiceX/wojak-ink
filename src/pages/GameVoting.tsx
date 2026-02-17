// Voting page — /your-wojak
// Desktop: 3-column (leaderboard | card | stats). Mobile: stats bar + card.

import { GameProvider } from '@/contexts/GameContext';
import { useLayout } from '@/hooks/useLayout';
import { VotingFeed } from '@/components/game/VotingFeed';
import { MiniLeaderboard } from '@/components/game/MiniLeaderboard';
import { VotingStatsPanel } from '@/components/game/VotingStatsPanel';
import { MobileStatsBar } from '@/components/game/MobileStatsBar';

function VotingPageDesktop() {
  const { headerHeight } = useLayout();

  return (
    <div className="voting-page" style={{ paddingTop: 16, paddingBottom: 32 }}>
      {/* Left panel */}
      <div className="voting-page-side" style={{ top: headerHeight + 16 }}>
        <MiniLeaderboard />
      </div>

      {/* Center */}
      <div className="voting-page-center">
        <VotingFeed />
      </div>

      {/* Right panel */}
      <div className="voting-page-side" style={{ top: headerHeight + 16 }}>
        <VotingStatsPanel />
      </div>
    </div>
  );
}

function VotingPageMobile() {
  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh' }}>
      <MobileStatsBar />
      <div className="flex flex-col items-center p-4 gap-4" style={{ flex: 1 }}>
        <VotingFeed />
      </div>
    </div>
  );
}

export default function GameVoting() {
  const { isDesktop } = useLayout();

  return (
    <GameProvider>
      {isDesktop ? <VotingPageDesktop /> : <VotingPageMobile />}
    </GameProvider>
  );
}
