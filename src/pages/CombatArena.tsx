/**
 * Combat Arena Page — /arena
 *
 * Main entry point for the combat system.
 * Shows agent dashboard (if agent exists), queue panel, active battle, and recent history.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Plus, Swords } from 'lucide-react';
import { PageSEO } from '@/components/seo';
import { PageTransition } from '@/components/layout/PageTransition';
import { QueuePanel } from '@/components/combat/QueuePanel';
import { BattleView } from '@/components/combat/BattleView';
import { BattleHistory } from '@/components/combat/BattleHistory';
import { ArenaNav } from '@/components/combat/ArenaNav';
import { AgentDashboard } from '@/components/combat/AgentDashboard';
import { AgentSetupModal } from '@/components/combat/AgentSetupModal';
import { AgentProvider, useAgent } from '@/contexts/AgentContext';
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

function CombatArenaInner() {
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
  const [showAgentModal, setShowAgentModal] = useState(false);
  const { hasAgent } = useAgent();

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

  // Load fighters by DID
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

  const handleQueue = useCallback(async (nftId: string, battleMode: 'manual' | 'auto' | 'agent') => {
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
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Swords size={28} style={{ color: 'var(--color-primary)' }} />
            <h1 className="text-2xl font-bold">Combat Arena</h1>
          </div>
          <p className="text-secondary text-center text-sm" style={{ maxWidth: 480 }}>
            Pick a fighter, choose your moves, and battle other Wojaks. Winners earn XP and climb the ELO ladder.
            Each fighter has a type, ability, and unique moves based on their traits.
          </p>
        </div>

        {/* Agent Dashboard (if agent exists) */}
        {hasAgent && (
          <AgentDashboard onSettings={() => setShowAgentModal(true)} />
        )}

        {/* Create Agent CTA (if no agent and connected) */}
        {!hasAgent && isConnected && ownerDid && (
          <motion.button
            className="agent-action-row w-full"
            onClick={() => setShowAgentModal(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'rgba(255, 107, 0, 0.1)' }}>
              <Bot size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium">Create AI Agent</span>
              <span className="text-xs text-muted">Control your fighters with your own AI via API</span>
            </div>
            <Plus size={16} style={{ color: 'var(--color-text-muted)' }} />
          </motion.button>
        )}

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
              onCreateAgent={() => setShowAgentModal(true)}
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
          <motion.div
            className="card p-4 w-full text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-secondary text-sm mb-2">Active Battle</p>
            <Link
              to={`/arena/battle/${activeBattleId}`}
              className="btn btn-primary"
            >
              <Swords size={16} />
              Go to Battle #{activeBattleId}
            </Link>
          </motion.div>
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

      {/* Agent Setup Modal */}
      <AgentSetupModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
      />
    </PageTransition>
  );
}

// Wrap with AgentProvider — resolves ownerDid from wallet
export default function CombatArena() {
  const { getDIDs, status } = useSageWallet();
  const isConnected = status === 'connected';
  const [ownerDid, setOwnerDid] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    getDIDs().then((dids) => {
      if (dids.length > 0) setOwnerDid(dids[0]);
    }).catch(() => {});
  }, [isConnected, getDIDs]);

  return (
    <AgentProvider ownerDid={ownerDid}>
      <CombatArenaInner />
    </AgentProvider>
  );
}
