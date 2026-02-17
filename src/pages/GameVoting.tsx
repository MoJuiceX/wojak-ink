import { VotingFeed } from '@/components/game/VotingFeed';
import { GameProvider } from '@/contexts/GameContext';

export default function GameVoting() {
  return (
    <GameProvider>
      <div className="flex flex-col items-center p-4 gap-6">
        <h1 className="text-2xl font-bold">Your Wojak</h1>
        <p className="text-secondary text-center">
          Vote on community Wojaks. Swipe right to like, left to dislike.
        </p>
        <VotingFeed />
      </div>
    </GameProvider>
  );
}
