/**
 * Combat Battle Detail Page — /arena/battle/:id
 *
 * Renders the full BattleView for a specific battle ID.
 */

import { useParams } from 'react-router-dom';
import { PageSEO } from '@/components/seo';
import { PageTransition } from '@/components/layout/PageTransition';
import { BattleView } from '@/components/combat/BattleView';
import { ArenaNav } from '@/components/combat/ArenaNav';
import { useSageWallet } from '@/sage-wallet/SageWalletProvider';
import { useState, useEffect } from 'react';

export default function CombatBattle() {
  const { id } = useParams<{ id: string }>();
  const battleId = id ? parseInt(id, 10) : null;
  const { getDIDs, status } = useSageWallet();
  const isConnected = status === 'connected';
  const [playerNftId, setPlayerNftId] = useState<string | undefined>();

  // Try to determine which fighter belongs to the current user
  useEffect(() => {
    if (!isConnected || !battleId) return;

    getDIDs().then(async (dids) => {
      if (dids.length === 0) return;
      const ownerDid = dids[0];

      try {
        const res = await fetch(`/api/combat/fighter?ownerDid=${encodeURIComponent(ownerDid)}`);
        const data = await res.json();
        const fighters = data.fighters ?? [];
        if (fighters.length > 0) {
          setPlayerNftId(fighters[0].nft_id);
        }
      } catch (err) {
        console.error('[CombatBattle] Failed to load fighters:', err);
      }
    });
  }, [isConnected, getDIDs, battleId]);

  if (!battleId || isNaN(battleId)) {
    return (
      <PageTransition>
        <ArenaNav />
        <div className="flex flex-col items-center p-4 sm:p-6 gap-6 max-w-2xl mx-auto animate-fade-in">
          <PageSEO title="Battle Not Found" description="Invalid battle ID" path="/arena" />
          <div className="card-static p-6 text-center">
            <p className="text-error text-sm">Invalid battle ID.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <ArenaNav />
      <div className="flex flex-col items-center p-4 sm:p-6 gap-6 max-w-2xl mx-auto animate-fade-in">
        <PageSEO
          title={`Battle #${battleId}`}
          description={`Combat Battle #${battleId}`}
          path={`/arena/battle/${battleId}`}
        />
        <BattleView battleId={battleId} playerNftId={playerNftId} />
      </div>
    </PageTransition>
  );
}
