// FighterStatsPanel.tsx
// Displays full combat identity for a fighter: type, nature, ability, moves, power, battle record

import { useQuery } from '@tanstack/react-query';
import { Swords, Shield, Zap, Star, Trophy } from 'lucide-react';
import { getMoveById } from '@/lib/combat/data/moves';
import type { CombatMove } from '@/lib/combat/types';

// Type color map (matches FighterRevealCard and YourWojakSection)
const TYPE_COLORS: Record<string, string> = {
  FIRE: '#ef4444',
  WATER: '#3b82f6',
  ELECTRIC: '#eab308',
  GRASS: '#22c55e',
  ICE: '#67e8f9',
  MARTIAL: '#f97316',
  VENOM: '#a855f7',
  EARTH: '#a16207',
  AIR: '#7dd3fc',
  PSYCHE: '#ec4899',
  INSECT: '#84cc16',
  STONE: '#78716c',
  GHOST: '#6366f1',
  DRAGON: '#7c3aed',
  SHADOW: '#1e293b',
  METAL: '#94a3b8',
  MYSTIC: '#f9a8d4',
  NEUTRAL: '#a0a0b0',
};

interface FighterStatsPanelProps {
  nftId?: string;
  edition?: number;
}

interface FighterDetail {
  nftId: string;
  edition: number;
  type: string;
  nature: string;
  ability: string;
  moves: string[];
  level: number;
  xp: number;
  elo: number;
  powerScore: number;
  votePower: number;
  battlePower: number;
  wins: number;
  losses: number;
  draws: number;
  ownerName: string;
  ownerDid: string;
  rank: number | null;
}

export function FighterStatsPanel({ nftId, edition }: FighterStatsPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['fighter-detail', nftId, edition],
    queryFn: async () => {
      const params = nftId ? `nftId=${nftId}` : `edition=${edition}`;
      const res = await fetch(`/api/combat/fighter-detail?${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.fighter as FighterDetail | null;
    },
    enabled: !!(nftId || edition),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ background: 'var(--color-white-8)' }} />
        <div className="h-20 rounded-lg" style={{ background: 'var(--color-white-5)' }} />
        <div className="h-32 rounded-lg" style={{ background: 'var(--color-white-5)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-4 text-secondary text-sm">
        No combat data available for this NFT.
      </div>
    );
  }

  const typeColor = TYPE_COLORS[data.type] || '#a0a0b0';
  const moves: CombatMove[] = (data.moves || [])
    .map((id: string) => getMoveById(id))
    .filter((m): m is CombatMove => m !== undefined);
  const totalBattles = data.wins + data.losses + data.draws;
  const winRate = totalBattles > 0 ? Math.round((data.wins / totalBattles) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Type / Nature / Ability header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="fighter-type-badge"
          style={{ background: `${typeColor}20`, color: typeColor, borderColor: typeColor }}
        >
          {data.type}
        </span>
        <span className="text-sm text-secondary">{data.nature}</span>
        <span className="text-xs text-muted">· {data.ability}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card-static p-2 text-center">
          <Zap size={14} className="mx-auto mb-1" style={{ color: 'var(--color-primary)' }} />
          <p className="text-lg font-bold">{data.powerScore || 0}</p>
          <p className="text-xs text-muted">Power</p>
        </div>
        <div className="card-static p-2 text-center">
          <Star size={14} className="mx-auto mb-1" style={{ color: 'var(--color-cyan)' }} />
          <p className="text-lg font-bold">Lv.{data.level}</p>
          <p className="text-xs text-muted">Level</p>
        </div>
        <div className="card-static p-2 text-center">
          <Trophy size={14} className="mx-auto mb-1" style={{ color: '#eab308' }} />
          <p className="text-lg font-bold">#{data.rank || '—'}</p>
          <p className="text-xs text-muted">Rank</p>
        </div>
      </div>

      {/* Battle Record */}
      <div className="card-static p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Battle Record</span>
          <span className="text-xs text-secondary">
            {totalBattles} battles · {winRate}% win rate
          </span>
        </div>
        <div className="flex gap-3 text-sm">
          <span style={{ color: 'var(--color-success)' }}>{data.wins}W</span>
          <span style={{ color: 'var(--color-error)' }}>{data.losses}L</span>
          <span className="text-secondary">{data.draws}D</span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted">
          <span>ELO: {Math.round(data.elo)}</span>
          <span>·</span>
          <span>Vote Power: {data.votePower || 0}</span>
          <span>·</span>
          <span>Battle Power: {data.battlePower || 0}</span>
        </div>
      </div>

      {/* Moves */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 block">
          Moves
        </span>
        <div className="flex flex-col gap-1.5">
          {moves.map((move) => (
            <div
              key={move.id}
              className="card-static p-2 flex items-center justify-between"
              style={{
                borderLeftWidth: 3,
                borderLeftStyle: 'solid',
                borderLeftColor: move.category === 'status' ? 'var(--color-cyan)' : typeColor,
              }}
            >
              <div className="flex items-center gap-2">
                {move.category === 'status' ? (
                  <Shield size={12} style={{ color: 'var(--color-cyan)' }} />
                ) : (
                  <Swords size={12} style={{ color: typeColor }} />
                )}
                <span className="text-sm font-medium">{move.name}</span>
              </div>
              <div className="flex gap-2 text-xs text-muted">
                {move.power > 0 && <span>Pow {move.power}</span>}
                <span>Acc {move.accuracy}%</span>
                <span>
                  {move.category === 'physical' ? 'PHY' : move.category === 'special' ? 'SPC' : 'SKL'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
