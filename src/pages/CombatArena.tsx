/**
 * Combat Arena Page — /arena
 *
 * Main entry point for the combat system.
 * Shows queue panel, active battle, and recent history.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageSEO } from '@/components/seo';
import { PageTransition } from '@/components/layout/PageTransition';
import { QueuePanel } from '@/components/combat/QueuePanel';
import { BattleView } from '@/components/combat/BattleView';
import { BattleHistory } from '@/components/combat/BattleHistory';
import { ArenaNav } from '@/components/combat/ArenaNav';
import { useSageWallet } from '@/sage-wallet/SageWalletProvider';

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
  const navigate = useNavigate();
  const { getDIDs, status } = useSageWallet();
  const isConnected = status === 'connected';
  const [ownerDid, setOwnerDid] = useState<string | null>(null);
  const [fighters, setFighters] = useState<FighterSummary[]>([]);
  const [selectedFighter, setSelectedFighter] = useState<string | null>(null);
  const [isLoadingFighters, setIsLoadingFighters] = useState(false);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBattleId, setActiveBattleId] = useState<number | null>(null);

  // Resolve DID from wallet
  useEffect(() => {
    if (!isConnected) return;

    getDIDs().then((dids) => {
      if (dids.length > 0) {
        setOwnerDid(dids[0]);
      }
    }).catch((err) => {
      console.error('[CombatArena] Failed to get DIDs:', err);
    });
  }, [isConnected, getDIDs]);

  // Load fighters by DID (uses /api/combat/fighter?ownerDid=)
  useEffect(() => {
    if (!ownerDid) return;
    setIsLoadingFighters(true);

    fetch(`/api/combat/fighter?ownerDid=${encodeURIComponent(ownerDid)}`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data) => {
        const list = data.fighters ?? [];
        setFighters(list);
        if (list.length > 0) {
          setSelectedFighter(list[0].nft_id);
        }
      })
      .catch((err) => {
        console.error('[CombatArena] Failed to load fighters:', err);
      })
      .finally(() => {
        setIsLoadingFighters(false);
      });
  }, [ownerDid]);

  const handleQueue = useCallback(async (nftId: string, battleMode: 'manual' | 'auto') => {
    if (!ownerDid) return;
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
  }, [ownerDid]);

  const handleLeaveQueue = useCallback(async (nftId: string) => {
    if (!ownerDid) return;
    setIsLoading(true);
    try {
      await fetch(`/api/combat/queue?nftId=${encodeURIComponent(nftId)}&ownerDid=${encodeURIComponent(ownerDid)}`, { method: 'DELETE' });
      setQueueStatus(null);
    } catch (err) {
      console.error('[CombatArena] Leave queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerDid]);

  return (
    <PageTransition>
      <PageSEO
        title="Combat Arena - Wojak Battles"
        description="Battle your Wojak NFTs in turn-based combat. 18 types, abilities, moves, ELO ranking."
        path="/arena"
        type="game"
      />
      <ArenaNav />
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Combat Arena</h1>
        <p className="text-secondary text-center text-sm">
          Send your Wojak into battle. Earn XP, climb the leaderboard, and prove your fighter is the strongest.
        </p>

        {/* Wallet connect prompt */}
        {!isConnected && (
          <div className="card-static p-6 text-center flex flex-col gap-3 w-full">
            <p className="text-secondary text-sm">Connect your Sage wallet to access your combat fighters.</p>
          </div>
        )}

        {/* Loading fighters */}
        {isConnected && isLoadingFighters && (
          <div className="text-muted text-sm text-center py-4">Loading fighters...</div>
        )}

        {/* Queue Panel */}
        {isConnected && !isLoadingFighters && (
          <div className="w-full">
            <QueuePanel
              fighters={fighters as any}
              onQueue={handleQueue}
              onLeaveQueue={handleLeaveQueue}
              queueStatus={queueStatus}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Active battle — inline BattleView */}
        {activeBattleId && selectedFighter && (
          <div className="w-full">
            <BattleView
              battleId={activeBattleId}
              playerNftId={selectedFighter}
            />
          </div>
        )}

        {/* Active battle link (when no inline view) */}
        {activeBattleId && !selectedFighter && (
          <div className="card p-4 w-full text-center">
            <p className="text-secondary text-sm mb-2">Active Battle</p>
            <Link
              to={`/arena/battle/${activeBattleId}`}
              className="btn btn-primary"
            >
              Go to Battle #{activeBattleId}
            </Link>
          </div>
        )}

        {/* Battle history */}
        {selectedFighter && (
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-3">Recent Battles</h2>
            <BattleHistory
              nftId={selectedFighter}
              limit={10}
              onSelectBattle={(id) => navigate(`/arena/battle/${id}`)}
            />
          </div>
        )}

        {/* Empty state for no fighters when connected */}
        {isConnected && !isLoadingFighters && fighters.length === 0 && ownerDid && (
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-3">Recent Battles</h2>
            <div className="card-static p-4 text-center">
              <p className="text-muted text-sm">No battle history yet.</p>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
