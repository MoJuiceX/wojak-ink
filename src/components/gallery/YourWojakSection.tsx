/**
 * YourWojakSection - Your Wojak Fighters collection in the Gallery
 *
 * A browsable grid of Your Wojak fighters with combat data visible on cards.
 * Features type filters and sorting options.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WojakFighterCard } from './WojakFighterCard';
import { FighterDetailModal } from './FighterDetailModal';

const COMBAT_TYPES = [
  'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE', 'MARTIAL',
  'VENOM', 'EARTH', 'AIR', 'PSYCHE', 'INSECT', 'STONE',
  'GHOST', 'DRAGON', 'SHADOW', 'METAL', 'MYSTIC', 'NEUTRAL',
];

// Type color map (shared with FighterRevealCard)
export const TYPE_COLORS: Record<string, string> = {
  FIRE: '#ef4444', WATER: '#3b82f6', ELECTRIC: '#eab308',
  GRASS: '#22c55e', ICE: '#67e8f9', MARTIAL: '#f97316',
  VENOM: '#a855f7', EARTH: '#a16207', AIR: '#7dd3fc',
  PSYCHE: '#ec4899', INSECT: '#84cc16', STONE: '#78716c',
  GHOST: '#6366f1', DRAGON: '#7c3aed', SHADOW: '#1e293b',
  METAL: '#94a3b8', MYSTIC: '#f9a8d4', NEUTRAL: '#a0a0b0',
};

type SortOption = 'power_desc' | 'power_asc' | 'edition_desc' | 'level_desc' | 'elo_desc';

interface WojakFighter {
  nft_id: string;
  edition: number;
  type: string;
  nature: string;
  ability: string;
  move_1: string;
  move_2: string;
  move_3: string;
  move_4: string;
  level: number;
  elo: number;
  power: number;
  votePower: number;
  battlePower: number;
  wins: number;
  losses: number;
  draws: number;
  ownerName: string;
  owner_did: string;
}

interface ApiResponse {
  wojaks: WojakFighter[];
  total: number;
  limit: number;
  offset: number;
}

export function YourWojakSection() {
  const [sort, setSort] = useState<SortOption>('power_desc');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [limit] = useState(50);
  const [selectedFighter, setSelectedFighter] = useState<WojakFighter | null>(null);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['your-wojaks', sort, typeFilter, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ sort, limit: String(limit) });
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/gallery/your-wojaks?${params}`);
      if (!res.ok) return { wojaks: [], total: 0, limit, offset: 0 };
      return res.json();
    },
    staleTime: 30000,
  });

  const wojaks = data?.wojaks || [];
  const total = data?.total || 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Your Wojak Fighters</h2>
          <p className="text-sm text-secondary">
            {total} fighters created
          </p>
        </div>
        <Link to="/generator" className="btn btn-primary text-sm">
          Create New
        </Link>
      </div>

      {/* Type Filter Pills - horizontally scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          type="button"
          className={`badge ${!typeFilter ? 'badge-active' : ''}`}
          onClick={() => setTypeFilter(null)}
          style={{ whiteSpace: 'nowrap' }}
        >
          All Types
        </button>
        {COMBAT_TYPES.map(t => (
          <button
            key={t}
            type="button"
            className={`badge ${typeFilter === t ? 'badge-active' : ''}`}
            onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            style={{
              whiteSpace: 'nowrap',
              borderColor: typeFilter === t ? TYPE_COLORS[t] : undefined,
              color: typeFilter === t ? TYPE_COLORS[t] : undefined,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="flex gap-2 text-xs">
        {[
          { value: 'power_desc' as SortOption, label: 'Power' },
          { value: 'edition_desc' as SortOption, label: 'Newest' },
          { value: 'level_desc' as SortOption, label: 'Level' },
          { value: 'elo_desc' as SortOption, label: 'ELO' },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`btn btn-ghost text-xs ${sort === opt.value ? 'text-primary' : ''}`}
            onClick={() => setSort(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Fighter Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card-static p-3 animate-pulse">
              <div className="aspect-square rounded-lg mb-2" style={{ background: 'var(--color-white-8)' }} />
              <div className="h-3 w-20 rounded" style={{ background: 'var(--color-white-8)' }} />
            </div>
          ))}
        </div>
      ) : wojaks.length === 0 ? (
        <div className="card-static p-8 text-center">
          <Swords size={48} className="text-muted mx-auto mb-3" />
          <p className="font-medium mb-1">No fighters yet</p>
          <p className="text-sm text-secondary mb-4">
            Create your first Wojak fighter in the Generator.
          </p>
          <Link to="/generator" className="btn btn-primary">
            Create Fighter
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {wojaks.map((wojak) => (
            <WojakFighterCard
              key={wojak.nft_id}
              wojak={wojak}
              onClick={() => setSelectedFighter(wojak)}
            />
          ))}
        </div>
      )}

      {/* Fighter Detail Modal */}
      <FighterDetailModal
        isOpen={selectedFighter !== null}
        onClose={() => setSelectedFighter(null)}
        nftId={selectedFighter?.nft_id || ''}
        edition={selectedFighter?.edition || 0}
      />
    </div>
  );
}
