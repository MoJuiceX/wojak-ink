# Gallery — Your Wojak Collection Section

---

## Overview

The Gallery currently only shows the Wojak Farmers Plot collection (4,200 NFTs with character types). The new "Your Wojak" collection — the fighters users create in the Generator — needs its own section in the Gallery.

The two collections are fundamentally different:
- **Farmers Plot:** OG collection, 14 character types, browsed by character → thumbnails
- **Your Wojak:** New collection, combat fighters with types/moves/Power, browsed by filters (type, Power, price)

The Gallery should show Farmers Plot at the top (existing), then Your Wojak below.

---

## Task 1: Add Your Wojak Section to Gallery Page

**File:** `src/pages/Gallery.tsx`

Below the existing Farmers Plot character grid, add a new section for the Your Wojak collection:

```tsx
{/* Existing Farmers Plot section */}
<FarmersPlotSection />  {/* or whatever the current grid is */}

{/* Your Wojak Collection — NEW */}
<div className="mt-8">
  <YourWojakSection />
</div>
```

The key architectural question: where does the Your Wojak data come from?

**Data source:** The Your Wojak collection needs a new API endpoint that returns minted Wojaks with their combat data. The NFTs exist in `combat_fighters` table (created during mint) and potentially in `did_holdings`.

---

## Task 2: Create Your Wojak API Endpoint

**File:** `functions/api/gallery/your-wojaks.ts` (NEW)

An API that returns the Your Wojak collection with combat data for gallery browsing:

```typescript
// GET /api/gallery/your-wojaks?limit=100&offset=0&sort=power_desc&type=FIRE
export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const sort = url.searchParams.get('sort') || 'power_desc';
  const typeFilter = url.searchParams.get('type') || null;

  let orderBy = 'cf.power_score DESC';
  if (sort === 'power_asc') orderBy = 'cf.power_score ASC';
  if (sort === 'edition_desc') orderBy = 'cf.edition_number DESC';
  if (sort === 'edition_asc') orderBy = 'cf.edition_number ASC';
  if (sort === 'level_desc') orderBy = 'cf.level DESC';
  if (sort === 'elo_desc') orderBy = 'cf.elo_rating DESC';

  let whereClause = 'WHERE cf.edition_number IS NOT NULL';
  const bindings: any[] = [];

  if (typeFilter) {
    whereClause += ' AND cf.combat_type = ?';
    bindings.push(typeFilter);
  }

  const query = `
    SELECT
      cf.nft_id,
      cf.edition_number as edition,
      cf.combat_type as type,
      cf.nature,
      cf.ability,
      cf.move_1, cf.move_2, cf.move_3, cf.move_4,
      cf.level,
      cf.elo_rating as elo,
      cf.power_score as power,
      cf.vote_power as votePower,
      cf.battle_power as battlePower,
      cf.total_combat_wins as wins,
      cf.total_combat_losses as losses,
      cf.total_combat_draws as draws,
      COALESCE(dn.display_name, '') as ownerName,
      cf.owner_did
    FROM combat_fighters cf
    LEFT JOIN did_display_names dn ON dn.did = cf.owner_did
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  bindings.push(limit, offset);

  const results = await env.DB.prepare(query).bind(...bindings).all();

  // Get total count for pagination
  const countQuery = `SELECT COUNT(*) as total FROM combat_fighters cf ${whereClause}`;
  const countBindings = typeFilter ? [typeFilter] : [];
  const countResult = await env.DB.prepare(countQuery).bind(...countBindings).first();

  return new Response(JSON.stringify({
    wojaks: results.results,
    total: countResult?.total || 0,
    limit,
    offset,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Task 3: Create YourWojakSection Component

**File:** `src/components/gallery/YourWojakSection.tsx` (NEW)

A browsable grid of Your Wojak fighters with combat data visible on cards.

```tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Zap, Swords, Shield, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const COMBAT_TYPES = [
  'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE', 'MARTIAL',
  'VENOM', 'EARTH', 'AIR', 'PSYCHE', 'INSECT', 'STONE',
  'GHOST', 'DRAGON', 'SHADOW', 'METAL', 'MYSTIC', 'NEUTRAL',
];

// Type color map (shared with FighterRevealCard)
const TYPE_COLORS: Record<string, string> = {
  FIRE: '#ef4444', WATER: '#3b82f6', ELECTRIC: '#eab308',
  GRASS: '#22c55e', ICE: '#67e8f9', MARTIAL: '#f97316',
  VENOM: '#a855f7', EARTH: '#a16207', AIR: '#7dd3fc',
  PSYCHE: '#ec4899', INSECT: '#84cc16', STONE: '#78716c',
  GHOST: '#6366f1', DRAGON: '#7c3aed', SHADOW: '#1e293b',
  METAL: '#94a3b8', MYSTIC: '#f9a8d4', NEUTRAL: '#a0a0b0',
};

type SortOption = 'power_desc' | 'power_asc' | 'edition_desc' | 'level_desc' | 'elo_desc';

export function YourWojakSection() {
  const [sort, setSort] = useState<SortOption>('power_desc');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [limit] = useState(50);

  const { data, isLoading } = useQuery({
    queryKey: ['your-wojaks', sort, typeFilter, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ sort, limit: String(limit) });
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/gallery/your-wojaks?${params}`);
      if (!res.ok) throw new Error('Failed to load');
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
            {total} fighters created · Sorted by Power
          </p>
        </div>
        <Link to="/generator" className="btn btn-primary text-sm">
          Create New
        </Link>
      </div>

      {/* Type Filter Pills — horizontally scrollable */}
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
          { value: 'power_desc' as SortOption, label: 'Power ↓' },
          { value: 'edition_desc' as SortOption, label: 'Newest' },
          { value: 'level_desc' as SortOption, label: 'Level ↓' },
          { value: 'elo_desc' as SortOption, label: 'ELO ↓' },
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
          {wojaks.map((wojak: any) => (
            <WojakFighterCard key={wojak.nft_id} wojak={wojak} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 4: Create WojakFighterCard Component

**File:** `src/components/gallery/WojakFighterCard.tsx` (NEW)

Individual card for a Your Wojak fighter in the gallery grid. Shows the image + combat identity overlay.

```tsx
function WojakFighterCard({ wojak }: { wojak: any }) {
  const typeColor = TYPE_COLORS[wojak.type] || '#a0a0b0';
  const imageUrl = `https://assets.mintgarden.io/thumbnails/medium/${wojak.nft_id}.png`;

  return (
    <div className="wojak-fighter-card">
      {/* Image */}
      <div className="wojak-fighter-image">
        <img
          src={imageUrl}
          alt={`Wojak #${wojak.edition}`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Type badge overlay */}
        <span
          className="wojak-fighter-type"
          style={{ background: `${typeColor}cc`, color: '#fff' }}
        >
          {wojak.type}
        </span>
      </div>

      {/* Info */}
      <div className="wojak-fighter-info">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">#{wojak.edition}</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
            Lv.{wojak.level}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span className="flex items-center gap-0.5">
            <Zap size={10} />
            {wojak.power}
          </span>
          <span>{wojak.wins}W/{wojak.losses}L</span>
        </div>
        {wojak.ownerName && (
          <span className="text-xs text-muted truncate">{wojak.ownerName}</span>
        )}
      </div>
    </div>
  );
}
```

---

## Task 5: Add WojakFighterCard Styles to theme.css

**File:** `src/styles/theme.css`

```css
/* Wojak Fighter Card (Gallery) */
.wojak-fighter-card {
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.wojak-fighter-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card);
}

.wojak-fighter-image {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--color-white-5);
}

.wojak-fighter-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wojak-fighter-type {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.wojak-fighter-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

---

## Task 6: Handle Empty Collection (No Mints Yet)

If no Your Wojaks have been minted yet (total = 0), the section should still show but with a compelling empty state that drives to the Generator.

The empty state is already handled in Task 3 — the "No fighters yet" card with Generator CTA.

Also, if the API endpoint doesn't exist yet (404), fail gracefully:

```typescript
queryFn: async () => {
  const res = await fetch(`/api/gallery/your-wojaks?${params}`);
  if (!res.ok) return { wojaks: [], total: 0 };
  return res.json();
},
```

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Visual styles in `src/styles/theme.css`
- No `!important`
- The Your Wojak section appears BELOW the existing Farmers Plot section in the Gallery
- Fighter cards show: image, edition #, type badge, level, Power score, W/L record
- Type filter pills are horizontally scrollable on mobile
- Images use MintGarden thumbnail URL pattern: `https://assets.mintgarden.io/thumbnails/medium/{nft_id}.png`
- If MintGarden URL doesn't work for new mints, check how other images are resolved and follow that pattern
