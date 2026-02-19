import { PageTransition } from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';
import { ArenaNav } from '@/components/combat/ArenaNav';
import { CombatLeaderboard } from '@/components/combat/CombatLeaderboard';

export default function ArenaLeaderboard() {
  return (
    <PageTransition>
      <PageSEO
        title="Arena Leaderboard - Strongest Fighters"
        description="See the top-ranked Wojak fighters by XP, ELO, and wins."
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
