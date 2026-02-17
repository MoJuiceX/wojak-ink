// Game Dashboard — player HQ with Power Level, quick actions, collection, battles.
import { useEffect, useState } from 'react';
import { useGame, GameProvider } from '@/contexts/GameContext';
import { PowerLevelDisplay } from '@/components/game/PowerLevelDisplay';
import { OnboardingChecklist } from '@/components/game/OnboardingChecklist';
import { QuickActions } from '@/components/game/QuickActions';
import { LatestEventBanner } from '@/components/game/LatestEventBanner';
import { CollectionScroll } from '@/components/game/CollectionScroll';
import { ActiveBattleCard } from '@/components/game/ActiveBattleCard';
import PageTransition from '@/components/layout/PageTransition';

interface PowerData {
  rank?: number;
  credits?: number;
  breakdown?: {
    holdings: { score: number; nftCount: number; uniqueCreators: number };
    creations: { score: number; quality: number; spread: number; uniqueCollectors: number };
  };
}

function DashboardContent() {
  const { player, isRegistered, isVerified } = useGame();
  const [powerData, setPowerData] = useState<PowerData>({});

  useEffect(() => {
    if (isRegistered && player?.did) {
      fetch(`/api/game/power-level?did=${player.did}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setPowerData({
              rank: data.rank,
              credits: data.credits,
              breakdown: data.breakdown,
            });
          }
        })
        .catch(() => { /* silent */ });
    }
  }, [isRegistered, player?.did]);

  if (!player) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Your Wojak Dashboard</h2>
        <p className="text-secondary">Connect your wallet to see your game profile.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 640, margin: '0 auto', padding: '16px 12px' }}>
      <LatestEventBanner did={player.did} />

      <PowerLevelDisplay
        level={player.powerLevel}
        rank={powerData.rank}
        credits={powerData.credits}
        breakdown={powerData.breakdown}
      />

      <QuickActions
        votesRemaining={player.votesRemaining}
        isVerified={isVerified}
      />

      <CollectionScroll did={player.did} />

      <ActiveBattleCard did={player.did} />

      <OnboardingChecklist milestones={player.onboarding} />
    </div>
  );
}

export default function GameDashboard() {
  return (
    <GameProvider>
      <PageTransition>
        <DashboardContent />
      </PageTransition>
    </GameProvider>
  );
}
