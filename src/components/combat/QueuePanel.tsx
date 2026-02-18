/**
 * QueuePanel — select an NFT fighter, choose battle mode, and enter the combat queue.
 */

import { useState, useCallback } from 'react';
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

interface QueuePanelProps {
  fighters: FighterSummary[];
  onQueue: (nftId: string, battleMode: 'manual' | 'auto') => Promise<void>;
  onLeaveQueue: (nftId: string) => Promise<void>;
  queueStatus: { status: string; position?: number; battleId?: number; opponent?: { nftId: string; elo: number } } | null;
  isLoading: boolean;
}

export function QueuePanel({ fighters, onQueue, onLeaveQueue, queueStatus, isLoading }: QueuePanelProps) {
  const [selectedFighter, setSelectedFighter] = useState<string>(fighters[0]?.nft_id ?? '');
  const [battleMode, setBattleMode] = useState<'manual' | 'auto'>('auto');

  const handleQueue = useCallback(async () => {
    if (!selectedFighter) return;
    await onQueue(selectedFighter, battleMode);
  }, [selectedFighter, battleMode, onQueue]);

  const handleLeave = useCallback(async () => {
    if (!selectedFighter) return;
    await onLeaveQueue(selectedFighter);
  }, [selectedFighter, onLeaveQueue]);

  const isQueued = queueStatus?.status === 'queued';
  const isMatched = queueStatus?.status === 'matched';

  if (fighters.length === 0) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-secondary text-sm">
          No combat-ready fighters found. Mint a new Wojak with combat moves to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-4">
      <h3 className="font-semibold">Enter the Arena</h3>

      {/* Fighter selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-secondary uppercase tracking-wider">Select Fighter</label>
        <select
          className="input"
          value={selectedFighter}
          onChange={(e) => setSelectedFighter(e.target.value)}
          disabled={isQueued || isLoading}
        >
          {fighters.map((f) => (
            <option key={f.nft_id} value={f.nft_id}>
              #{f.edition} — {f.type} Lv.{f.level} (ELO {f.elo})
            </option>
          ))}
        </select>
      </div>

      {/* Battle mode */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-secondary uppercase tracking-wider">Battle Mode</label>
        <div className="flex gap-2">
          <button
            className={`btn flex-1 ${battleMode === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBattleMode('auto')}
            disabled={isQueued || isLoading}
          >
            Auto
          </button>
          <button
            className={`btn flex-1 ${battleMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBattleMode('manual')}
            disabled={isQueued || isLoading}
          >
            Manual
          </button>
        </div>
        <p className="text-xs text-muted">
          {battleMode === 'auto'
            ? 'AI picks moves for both fighters. Watch the battle unfold.'
            : 'Pick your moves each turn. 30s timer per turn.'}
        </p>
      </div>

      {/* Queue action */}
      {!isQueued && !isMatched && (
        <button
          className="btn btn-primary w-full"
          onClick={handleQueue}
          disabled={isLoading || !selectedFighter}
        >
          {isLoading ? 'Joining...' : 'Join Queue'}
        </button>
      )}

      {/* Queue status */}
      {isQueued && (
        <div className="flex flex-col gap-2">
          <div className="combat-preview-badge justify-center">
            <span className="text-secondary">
              In queue — position {queueStatus?.position ?? '?'}
            </span>
          </div>
          <button
            className="btn btn-secondary w-full"
            onClick={handleLeave}
            disabled={isLoading}
          >
            Leave Queue
          </button>
        </div>
      )}

      {/* Matched */}
      {isMatched && queueStatus?.battleId && (
        <div className="combat-preview-badge justify-center">
          <span className="text-accent font-semibold">
            Match found! Battle #{queueStatus.battleId}
          </span>
        </div>
      )}
    </div>
  );
}
