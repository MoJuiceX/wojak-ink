/**
 * DemoBattle Component
 *
 * A wrapper that presents the demo battle with context.
 * Shows a teaser card before playing, then the actual battle.
 */

import { useState, useCallback } from 'react';
import { Play, RotateCcw, Swords } from 'lucide-react';
import { BattleView } from './BattleView';
import { DEMO_BATTLE } from '@/lib/combat/demo-battle';

export function DemoBattle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [key, setKey] = useState(0); // Force remount for replay

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleReplay = useCallback(() => {
    setKey(k => k + 1); // Remount BattleView to reset
    setIsPlaying(true);
  }, []);

  const handleDemoComplete = useCallback(() => {
    // Demo finished — could show CTA here in the future
  }, []);

  // Show teaser card before playing
  if (!isPlaying) {
    return (
      <div className="card-static p-6 flex flex-col items-center gap-4 text-center">
        <div
          className="p-4 rounded-full"
          style={{ background: 'var(--color-primary-15)' }}
        >
          <Swords size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
        <div>
          <h3 className="text-lg font-bold">See How Battles Work</h3>
          <p className="text-secondary text-sm mt-1">
            Watch a demo battle between two Wojak fighters.
            Type matchups, abilities, critical hits — the full experience.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary flex items-center gap-2"
          onClick={handlePlay}
        >
          <Play size={16} />
          Watch Demo Battle
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Demo badge and replay button */}
      <div className="flex items-center justify-between">
        <span
          className="badge"
          style={{ background: 'var(--color-primary-15)', color: 'var(--color-primary)' }}
        >
          Demo Battle
        </span>
        <button
          type="button"
          className="btn btn-ghost flex items-center gap-1 text-sm"
          onClick={handleReplay}
        >
          <RotateCcw size={14} />
          Replay
        </button>
      </div>

      {/* The actual battle view */}
      <BattleView
        key={key}
        battleId={0}
        playerNftId={DEMO_BATTLE.fighterA!.nft_id}
        staticBattleData={DEMO_BATTLE}
        autoPlay
        onDemoComplete={handleDemoComplete}
      />
    </div>
  );
}

export default DemoBattle;
