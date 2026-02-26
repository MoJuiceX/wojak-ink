// Game Dashboard — player HQ with Power Level, quick actions, collection, battles.
import { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useSageWallet } from '@/sage-wallet';
import { GateChecklist } from '@/components/game/GateChecklist';
import { PowerLevelDisplay } from '@/components/game/PowerLevelDisplay';
import { OnboardingChecklist } from '@/components/game/OnboardingChecklist';
import { QuickActions } from '@/components/game/QuickActions';
import { LatestEventBanner } from '@/components/game/LatestEventBanner';
import { CollectionScroll } from '@/components/game/CollectionScroll';
import { ActiveBattleCard } from '@/components/game/ActiveBattleCard';
import { CreatorStatsCard } from '@/components/game/CreatorStatsCard';
import PageTransition from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';

interface PowerData {
  rank?: number;
  credits?: number;
  voteStreak?: number;
  breakdown?: {
    plotPower: number;
    plotCount: number;
    wojakPower: number;
    wojakCount: number;
    collectionBonus: number;
    collectedCount: number;
  };
}

function DashboardContent() {
  const { player, isRegistered, isVerified, register } = useGame();
  const { address, status: walletStatus } = useSageWallet();
  const [powerData, setPowerData] = useState<PowerData>({});

  useEffect(() => {
    if (isRegistered && player?.did) {
      fetch(`/api/fight-club/my-score?did=${player.did}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setPowerData({
              rank: data.rank,
              breakdown: data.power ? {
                plotPower: data.power.plotPower || 0,
                plotCount: data.power.plotCount || 0,
                wojakPower: data.power.wojakPower || 0,
                wojakCount: data.power.wojakCount || 0,
                collectionBonus: data.power.collectionBonus || 0,
                collectedCount: data.power.collectedWojakCount || 0,
              } : undefined,
            });
          }
        })
        .catch(() => { /* silent */ });
    }
  }, [isRegistered, player?.did]);

  const walletConnected = walletStatus === 'connected' && !!address;

  if (!player) {
    return (
      <div className="flex flex-col items-center p-4 gap-4">
        <GateChecklist
          walletConnected={walletConnected}
          hasDid={isRegistered}
          hasPhase1={isVerified}
          onLinkDid={async (did) => { if (address) await register(did, address); }}
          onAutoVerify={async () => false}
          onVerifyNft={async () => false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 640, margin: '0 auto', padding: '16px 12px' }}>
      <LatestEventBanner did={player.did} />

      <PowerLevelDisplay
        level={powerData.breakdown ?
          (powerData.breakdown.plotPower + powerData.breakdown.wojakPower + powerData.breakdown.collectionBonus) :
          player.powerLevel}
        rank={powerData.rank}
        credits={powerData.credits}
        voteStreak={powerData.voteStreak}
        breakdown={powerData.breakdown}
      />

      <QuickActions
        votesRemaining={player.votesRemaining}
        isVerified={isVerified}
      />

      <CollectionScroll did={player.did} />

      <CreatorStatsCard walletAddress={player.walletAddress} />

      <ActiveBattleCard did={player.did} />

      <OnboardingChecklist milestones={player.onboarding} />
    </div>
  );
}

export default function GameDashboard() {
  return (
    <>
      <PageSEO
        title="Wojak Swipe Dashboard"
        description="Track your power level, collection, and swipe stats"
        path="/swipe/dashboard"
      />
      <PageTransition>
        <DashboardContent />
      </PageTransition>
    </>
  );
}
