/**
 * Combat Arena Page — /games/combat
 *
 * Main entry point for the combat system.
 * Shows queue panel, active battle, and recent history.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageSEO } from '@/components/seo';
import { PageTransition } from '@/components/layout/PageTransition';
import { QueuePanel } from '@/components/combat/QueuePanel';
import { useSageWallet } from '@/sage-wallet';
import { ArenaNav } from '@/components/combat/ArenaNav';
import type { CombatType } from '@/lib/combat/types';

interface FighterSummary {
  nft_id: string;
  edition: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  imageUrl?: string;
}

export default function CombatArena() {
  const { status, getDIDs } = useSageWallet();
  const [fighters, setFighters] = useState<FighterSummary[]>([]);
  const [queueStatus, setQueueStatus] = useState<{ status: string; position?: number; battleId?: number; opponent?: { nftId: string; elo: number } } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBattleId, setActiveBattleId] = useState<number | null>(null);
  const [ownerDid, setOwnerDid] = useState<string>('');

  // Detect DID from wallet
  useEffect(() => {
    if (status !== 'connected') return;
    (async () => {
      try {
        const dids = await getDIDs();
        if (dids.length > 0) setOwnerDid(dids[0]);
      } catch (err) {
        console.error('[CombatArena] getDIDs error:', err);
      }
    })();
  }, [status, getDIDs]);

  // Load fighters owned by this DID
  useEffect(() => {
    if (!ownerDid) return;
    (async () => {
      try {
        const res = await fetch(`/api/combat/fighter?ownerDid=${encodeURIComponent(ownerDid)}`);
        if (!res.ok) return;
        const data = await res.json();
        setFighters(data.fighters || []);
      } catch (err) {
        console.error('[CombatArena] Fighter fetch error:', err);
      }
    })();
  }, [ownerDid]);

  const handleQueue = useCallback(async (nftId: string, battleMode: 'manual' | 'auto') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/combat/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId, ownerDid, battleMode }),
      });
      const data = await res.json();
      setQueueStatus(data);
      if (data.battleId) {
        setActiveBattleId(data.battleId);
      }
    } catch (err) {
      console.error('[CombatArena] Queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLeaveQueue = useCallback(async (nftId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/combat/queue?nftId=${nftId}&ownerDid=${encodeURIComponent(ownerDid)}`, { method: 'DELETE' });
      setQueueStatus(null);
    } catch (err) {
      console.error('[CombatArena] Leave queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <PageTransition>
      <ArenaNav />
      <PageSEO
        title="Combat Arena - Wojak Battles"
        description="Battle your Wojak NFTs in turn-based combat. 18 types, abilities, moves, ELO ranking."
        path="/games/combat"
        type="game"
      />
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Combat Arena</h1>
        <p className="text-secondary text-center text-sm" style={{ maxWidth: 480 }}>
          Pick a fighter, choose your moves, and battle other Wojaks. Winners earn XP and climb the ELO ladder.
          Each fighter has a type, ability, and unique moves based on their traits.
        </p>

        {/* Wallet connection prompt */}
        {status !== 'connected' && (
          <div className="card-static p-6 text-center w-full">
            <p className="text-secondary text-sm">
              Connect your Sage wallet to see your fighters.
            </p>
          </div>
        )}

        {/* Queue Panel — only when wallet connected */}
        {status === 'connected' && (
          <div className="w-full">
            <QueuePanel
              fighters={fighters}
              onQueue={handleQueue}
              onLeaveQueue={handleLeaveQueue}
              queueStatus={queueStatus}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Active battle link */}
        {activeBattleId && (
          <div className="card p-4 w-full text-center">
            <p className="text-secondary text-sm mb-2">Active Battle</p>
            <a
              href={`/games/combat/battle/${activeBattleId}`}
              className="btn btn-primary"
            >
              Go to Battle #{activeBattleId}
            </a>
          </div>
        )}

        {/* Battle history — empty state until first fight */}
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-3">Recent Battles</h2>
          <div className="card-static p-6 flex flex-col items-center gap-2 text-center">
            <span className="text-muted text-sm">No battles yet.</span>
            <span className="text-muted text-xs">
              Select a fighter above and join the queue to start your first battle.
            </span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
