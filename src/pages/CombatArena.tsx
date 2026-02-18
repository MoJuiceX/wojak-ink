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

interface FighterSummary {
  nft_id: string;
  edition: number;
  type: string;
  nature: string;
  ability: string;
  level: number;
  elo: number;
}

export default function CombatArena() {
  const [fighters] = useState<FighterSummary[]>([]);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBattleId, setActiveBattleId] = useState<number | null>(null);

  // Load fighters owned by current user (placeholder — needs DID from auth context)
  useEffect(() => {
    // TODO: Fetch fighters via /api/combat/fighter once auth is wired
  }, []);

  const handleQueue = useCallback(async (nftId: string, battleMode: 'manual' | 'auto') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/combat/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId, ownerDid: '', battleMode }),
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
      await fetch(`/api/combat/queue?nftId=${nftId}&ownerDid=`, { method: 'DELETE' });
      setQueueStatus(null);
    } catch (err) {
      console.error('[CombatArena] Leave queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <PageTransition>
      <PageSEO
        title="Combat Arena - Wojak Battles"
        description="Battle your Wojak NFTs in turn-based combat. 18 types, abilities, moves, ELO ranking."
        path="/games/combat"
        type="game"
      />
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Combat Arena</h1>
        <p className="text-secondary text-center text-sm">
          Send your Wojak into battle. Earn XP, climb the ELO ladder, and prove your fighter is the strongest.
        </p>

        {/* Queue Panel */}
        <div className="w-full">
          <QueuePanel
            fighters={fighters as any}
            onQueue={handleQueue}
            onLeaveQueue={handleLeaveQueue}
            queueStatus={queueStatus}
            isLoading={isLoading}
          />
        </div>

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

        {/* Placeholder for battle history */}
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-3">Recent Battles</h2>
          <div className="card-static p-4 text-center">
            <p className="text-muted text-sm">No battle history yet.</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
