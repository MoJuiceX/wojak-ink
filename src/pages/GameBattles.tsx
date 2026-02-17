import { useEffect } from 'react';
import { GameProvider } from '@/contexts/GameContext';
import { BattleView } from '@/components/game/BattleView';

export default function GameBattles() {
  useEffect(() => { document.title = 'Battles — Your Wojak'; }, []);

  return (
    <GameProvider>
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Wojak Battles</h1>
        <p className="text-secondary text-center">
          Two Wojaks enter. Community votes. Only one wins.
        </p>
        <BattleView />
      </div>
    </GameProvider>
  );
}
