/**
 * DemoBattle Component
 *
 * Auto-plays the demo battle immediately on mount.
 * Battle order and first battle are randomized so different users see different demos.
 * Loops automatically: when battle ends, restarts after 3 seconds.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { BattleView } from './BattleView';
import { DEMO_BATTLES } from '@/lib/combat/demo-battle';
import { getBattleAudio } from '@/lib/combat/audio';
import type { BattleData } from './BattleView';

function shuffle<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function DemoBattle() {
  const [key, setKey] = useState(0);
  const orderedBattles = useMemo(() => shuffle(DEMO_BATTLES), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentBattle: BattleData = orderedBattles[currentIndex];

  const handleReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setKey(k => k + 1);
  }, []);

  const handleDemoComplete = useCallback(() => {
    replayTimerRef.current = setTimeout(() => {
      setCurrentIndex(i => (i + 1) % orderedBattles.length);
      setKey(k => k + 1);
    }, 3000);
  }, [orderedBattles.length]);

  // Clear timer and suspend audio on unmount
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
      // Suspend audio when leaving the demo
      getBattleAudio().suspend();
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
        battleId={currentBattle.id}
        playerNftId={currentBattle.fighterA!.nft_id}
        staticBattleData={currentBattle}
        autoPlay
        onDemoComplete={handleDemoComplete}
      />
    </div>
  );
}

export default DemoBattle;
