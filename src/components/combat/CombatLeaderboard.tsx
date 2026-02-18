/**
 * CombatLeaderboard — top fighters by ELO, level, or wins.
 */

import { useState, useEffect } from 'react';
import type { CombatType } from '@/lib/combat/types';

interface LeaderboardFighter {
  nft_id: string;
  edition: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  record: { wins: number; losses: number; draws: number };
}

type SortBy = 'elo' | 'level' | 'wins';

export function CombatLeaderboard() {
  const [fighters, setFighters] = useState<LeaderboardFighter[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('elo');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/combat/leaderboard?sortBy=${sortBy}&limit=50`);
        const data = await res.json();
        setFighters(data.fighters ?? []);
      } catch (err) {
        console.error('[CombatLeaderboard] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sortBy]);

  return (
    <div className="flex flex-col gap-4">
      {/* Sort tabs */}
      <div className="flex gap-2">
        {(['elo', 'level', 'wins'] as SortBy[]).map((s) => (
          <button
            key={s}
            className={`btn ${sortBy === s ? 'btn-primary' : 'btn-ghost'} text-sm`}
            onClick={() => setSortBy(s)}
          >
            {s === 'elo' ? 'ELO Rating' : s === 'level' ? 'Level' : 'Wins'}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-muted text-sm text-center py-4">Loading...</div>
      ) : fighters.length === 0 ? (
        <div className="card-static p-4 text-center text-muted text-sm">
          No combat fighters yet.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted font-semibold uppercase tracking-wider">
            <span className="w-8">#</span>
            <span className="flex-1">Fighter</span>
            <span className="w-16 text-right">ELO</span>
            <span className="w-12 text-right">Lv.</span>
            <span className="w-20 text-right">Record</span>
          </div>

          {fighters.map((f, i) => (
            <div
              key={f.nft_id}
              className="card flex items-center gap-2 px-3 py-2"
            >
              <span className="w-8 text-xs text-muted font-semibold">{i + 1}</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className={`badge badge-${f.type.toLowerCase()} text-xs`}>
                  {f.type}
                </span>
                <span className="text-sm truncate">#{f.edition}</span>
              </div>
              <span className="w-16 text-right text-sm font-semibold tabular-nums">{f.elo}</span>
              <span className="w-12 text-right text-xs text-secondary tabular-nums">{f.level}</span>
              <span className="w-20 text-right text-xs text-muted tabular-nums">
                {f.record.wins}W {f.record.losses}L {f.record.draws}D
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
