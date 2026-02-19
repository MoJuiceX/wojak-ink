import { PageTransition } from '@/components/layout/PageTransition';
import { ArenaNav } from '@/components/combat/ArenaNav';
import { CombatLeaderboard } from '@/components/combat/CombatLeaderboard';
import { PageSEO } from '@/components/seo';

export default function ArenaLeaderboard() {
  return (
    <PageTransition>
      <PageSEO
        title="Arena Leaderboard"
        description="The strongest Wojak fighters ranked by XP and level. Battle your way to the top."
        path="/arena/leaderboard"
      />
      <ArenaNav />
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Strongest Fighters</h1>
        <p className="text-secondary text-center text-sm">
          The top Wojak fighters ranked by total XP and level.
        </p>
        <div className="w-full">
          <CombatLeaderboard />
        </div>
      </div>
    </PageTransition>
  );
}
