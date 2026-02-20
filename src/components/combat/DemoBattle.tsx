/**
 * DemoBattle Component
 *
 * Auto-plays the demo battle immediately on mount.
 * Loops automatically: when battle ends, restarts after 3 seconds.
 * Replay button allows manual restart at any time.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { BattleView } from './BattleView';
import { DEMO_BATTLE } from '@/lib/combat/demo-battle';

export function DemoBattle() {
  const [key, setKey] = useState(0); // Incrementing remounts BattleView, restarting the demo
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReplay = useCallback(() => {
    // Cancel any pending auto-restart
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setKey(k => k + 1);
  }, []);

  const handleDemoComplete = useCallback(() => {
    // Auto-restart after 3 seconds
    replayTimerRef.current = setTimeout(() => {
      setKey(k => k + 1);
    }, 3000);
  }, []);

  // Clear timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Demo badge + manual replay button */}
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

      {/* Battle arena — key prop forces full remount on restart */}
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
