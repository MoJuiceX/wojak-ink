/**
 * BattleView — split screen: your Wojak vs opponent with HP bars, turn log, and move controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { HPBar } from './HPBar';
import { TurnLog } from './TurnLog';
import { MoveButtons } from './MoveButtons';
import type { CombatType } from '@/lib/combat/types';

interface FighterDisplay {
  nft_id: string;
  edition?: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  moves: { id: string; name: string; power: number; accuracy: number; category: string }[];
  imageUrl?: string;
}

interface BattleData {
  id: number;
  status: string;
  currentTurn: number;
  maxTurns: number;
  winner: string | null;
  fighterA: FighterDisplay | null;
  fighterB: FighterDisplay | null;
  turns: any[];
  eloChangeA?: number;
  eloChangeB?: number;
  xpAwardedA?: number;
  xpAwardedB?: number;
}

interface BattleViewProps {
  battleId: number;
  playerNftId?: string;
}

export function BattleView({ battleId, playerNftId }: BattleViewProps) {
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch battle state
  const fetchBattle = useCallback(async () => {
    try {
      const res = await fetch(`/api/combat/battle?id=${battleId}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setBattle(data);
    } catch (err) {
      setError('Failed to load battle');
    }
  }, [battleId]);

  useEffect(() => {
    fetchBattle();
    // Poll for updates every 3 seconds during active battles
    const interval = setInterval(fetchBattle, 3000);
    return () => clearInterval(interval);
  }, [fetchBattle]);

  const handleSubmitMove = useCallback(async (moveId: string) => {
    if (!playerNftId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/combat/submit-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, nftId: playerNftId, moveId }),
      });
      const data = await res.json();
      if (data.turnResult) {
        await fetchBattle();
      }
    } catch (err) {
      console.error('[BattleView] Submit move error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [battleId, playerNftId, fetchBattle]);

  if (error) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-muted text-sm">Loading battle...</p>
      </div>
    );
  }

  const isComplete = battle.status === 'completed';
  const isPlayerA = playerNftId === battle.fighterA?.nft_id;
  const playerFighter = isPlayerA ? battle.fighterA : battle.fighterB;
  const opponentFighter = isPlayerA ? battle.fighterB : battle.fighterA;

  // Get HP from last turn result
  const lastTurn = battle.turns.length > 0 ? battle.turns[battle.turns.length - 1] : null;
  const hpA = lastTurn?.end_of_turn?.fighter_a_hp ?? 0;
  const hpB = lastTurn?.end_of_turn?.fighter_b_hp ?? 0;
  const playerHP = isPlayerA ? hpA : hpB;
  const opponentHP = isPlayerA ? hpB : hpA;

  // Compute max HP from stats (HP stat is maxHP)
  const playerMaxHP = playerFighter?.level ? Math.floor((2 * 80 + 31) * playerFighter.level / 100) + playerFighter.level + 10 : 100;
  const opponentMaxHP = opponentFighter?.level ? Math.floor((2 * 80 + 31) * opponentFighter.level / 100) + opponentFighter.level + 10 : 100;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Battle header */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Battle #{battle.id}</span>
        <span>Turn {battle.currentTurn}/{battle.maxTurns}</span>
      </div>

      {/* Fighter panels */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player side */}
        <div className="card p-3 flex flex-col gap-2">
          {playerFighter?.imageUrl && (
            <div className="battle-nft-image">
              <img src={playerFighter.imageUrl} alt="Your fighter" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className={`badge badge-${playerFighter?.type.toLowerCase()}`}>
              {playerFighter?.type}
            </span>
            <span className="text-xs text-muted">Lv.{playerFighter?.level}</span>
          </div>
          <HPBar
            current={battle.turns.length === 0 ? playerMaxHP : playerHP}
            max={playerMaxHP}
            label="HP"
          />
        </div>

        {/* Opponent side */}
        <div className="card p-3 flex flex-col gap-2">
          {opponentFighter?.imageUrl && (
            <div className="battle-nft-image">
              <img src={opponentFighter.imageUrl} alt="Opponent" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className={`badge badge-${opponentFighter?.type.toLowerCase()}`}>
              {opponentFighter?.type}
            </span>
            <span className="text-xs text-muted">Lv.{opponentFighter?.level}</span>
          </div>
          <HPBar
            current={battle.turns.length === 0 ? opponentMaxHP : opponentHP}
            max={opponentMaxHP}
            label="HP"
          />
        </div>
      </div>

      {/* Move buttons (manual mode only, when not complete) */}
      {!isComplete && playerFighter?.moves && playerNftId && (
        <MoveButtons
          moves={playerFighter.moves}
          onSubmit={handleSubmitMove}
          disabled={isSubmitting}
        />
      )}

      {/* Turn log */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Battle Log</h3>
        <TurnLog turns={battle.turns} />
      </div>

      {/* Battle result */}
      {isComplete && (
        <div className="card p-4 text-center">
          <p className="text-lg font-bold">
            {battle.winner === playerNftId
              ? 'Victory!'
              : battle.winner
                ? 'Defeat'
                : 'Draw'}
          </p>
          {battle.eloChangeA != null && (
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-secondary">
              <span>ELO: {(isPlayerA ? battle.eloChangeA : battle.eloChangeB) ?? 0 > 0 ? '+' : ''}{isPlayerA ? battle.eloChangeA : battle.eloChangeB}</span>
              <span>XP: +{isPlayerA ? battle.xpAwardedA : battle.xpAwardedB}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
