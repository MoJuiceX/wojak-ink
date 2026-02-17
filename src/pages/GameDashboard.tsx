import { useEffect, useState } from 'react';
import { useGame, GameProvider } from '@/contexts/GameContext';
import { PowerLevelDisplay } from '@/components/game/PowerLevelDisplay';
import { OnboardingChecklist } from '@/components/game/OnboardingChecklist';

interface Breakdown {
  holdings: { score: number; nftCount: number; uniqueCreators: number };
  creations: { score: number; quality: number; spread: number; uniqueCollectors: number };
}

function DashboardContent() {
  const { player, isRegistered } = useGame();
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

  useEffect(() => {
    if (isRegistered && player?.did) {
      fetch(`/api/game/power-level?did=${player.did}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) setBreakdown(data.breakdown);
        });
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
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Your Wojak Dashboard</h1>

      <PowerLevelDisplay
        level={player.powerLevel}
        breakdown={breakdown ?? undefined}
      />

      <OnboardingChecklist milestones={player.onboarding} />

      {/* Collection section - placeholder for now */}
      <div className="card-static p-4">
        <h3 className="font-semibold mb-2">Your Collection</h3>
        <p className="text-secondary text-sm">
          NFT collection display will be added with DID holdings integration.
        </p>
      </div>

      {/* Activity feed - placeholder */}
      <div className="card-static p-4">
        <h3 className="font-semibold mb-2">Activity</h3>
        <p className="text-secondary text-sm">
          Activity feed coming soon.
        </p>
      </div>
    </div>
  );
}

export default function GameDashboard() {
  return (
    <GameProvider>
      <DashboardContent />
    </GameProvider>
  );
}
