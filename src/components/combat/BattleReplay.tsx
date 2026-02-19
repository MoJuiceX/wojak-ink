/**
 * BattleReplay — step through battle turns with Next/Prev controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { HPBar } from './HPBar';

interface TurnData {
  turn: number;
  events?: Array<{
    type: string;
    message?: string;
    damage?: number;
    effectiveness?: string;
    isCrit?: boolean;
  }>;
  end_of_turn?: {
    fighter_a_hp: number;
    fighter_b_hp: number;
    fighter_a_status: string | null;
    fighter_b_status: string | null;
  };
}

interface BattleReplayProps {
  battleId: number;
}

export function BattleReplay({ battleId }: BattleReplayProps) {
  const [battle, setBattle] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/combat/battle?id=${battleId}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setBattle(data);
      } catch {
        setError('Failed to load battle');
      }
    })();
  }, [battleId]);

  const goNext = useCallback(() => {
    if (battle && currentStep < battle.turns.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [battle, currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  if (error) {
    return <div className="card-static p-4 text-center text-error text-sm">{error}</div>;
  }

  if (!battle) {
    return <div className="text-muted text-sm text-center py-4">Loading replay...</div>;
  }

  const turns: TurnData[] = battle.turns ?? [];
  const turn = turns[currentStep];
  const maxHP_A = 100; // Placeholder — would come from fighter stats
  const maxHP_B = 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Battle #{battleId} Replay
        </h3>
        <span className="text-xs text-muted">
          Turn {currentStep + 1} of {turns.length}
        </span>
      </div>

      {/* Fighter HP */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary">
            {battle.fighterA?.type ?? 'Fighter A'} Lv.{battle.fighterA?.level}
          </span>
          <HPBar
            current={turn?.end_of_turn?.fighter_a_hp ?? maxHP_A}
            max={maxHP_A}
          />
          {turn?.end_of_turn?.fighter_a_status && (
            <span className="badge text-xs">{turn.end_of_turn.fighter_a_status}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary">
            {battle.fighterB?.type ?? 'Fighter B'} Lv.{battle.fighterB?.level}
          </span>
          <HPBar
            current={turn?.end_of_turn?.fighter_b_hp ?? maxHP_B}
            max={maxHP_B}
          />
          {turn?.end_of_turn?.fighter_b_status && (
            <span className="badge text-xs">{turn.end_of_turn.fighter_b_status}</span>
          )}
        </div>
      </div>

      {/* Turn events */}
      {turn?.events && (
        <div className="flex flex-col gap-1">
          {turn.events.map((event, i) => {
            let className = 'turn-entry';
            if (event.isCrit) className = 'turn-entry turn-crit';
            else if (event.effectiveness === 'super_effective') className = 'turn-entry turn-super-effective';
            else if (event.effectiveness === 'not_very_effective') className = 'turn-entry turn-not-effective';
            return (
              <div key={i} className={className}>
                {event.message ?? `${event.type}: ${event.damage ?? 0} dmg`}
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 justify-center">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={goPrev}
          disabled={currentStep === 0}
        >
          Prev
        </button>
        <span className="text-sm text-muted tabular-nums">
          {currentStep + 1} / {turns.length}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={goNext}
          disabled={currentStep >= turns.length - 1}
        >
          Next
        </button>
      </div>

      {/* Battle result */}
      {currentStep === turns.length - 1 && battle.winner && (
        <div className="text-center text-sm font-semibold">
          Winner: {battle.winner}
        </div>
      )}
    </div>
  );
}
