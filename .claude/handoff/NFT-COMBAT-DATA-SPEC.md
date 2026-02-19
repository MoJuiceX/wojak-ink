# NFT Combat Data — Show Fighter Identity in Gallery Explorer

---

## Overview

When a user clicks on a Your Wojak fighter in the Gallery (or anywhere NFT details are shown), they should see the full combat identity: type, nature, ability, moves, Power score, battle record, and level.

Currently the NFT explorer shows: name, traits, rarity, price, sales history. For Your Wojak fighters, it needs a **Combat tab** with the fighter's identity and stats.

---

## Task 1: Create Combat Data API for Individual Fighter

**File:** `functions/api/combat/fighter-detail.ts` (NEW)

An API that returns full combat data for a single fighter by nft_id or edition number:

```typescript
// GET /api/combat/fighter-detail?nftId=xxx OR ?edition=123
export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');
  const edition = url.searchParams.get('edition');

  if (!nftId && !edition) {
    return new Response(JSON.stringify({ error: 'nftId or edition required' }), { status: 400 });
  }

  const query = nftId
    ? 'SELECT * FROM combat_fighters WHERE nft_id = ?'
    : 'SELECT * FROM combat_fighters WHERE edition_number = ?';
  const binding = nftId || edition;

  const fighter = await env.DB.prepare(query).bind(binding).first();

  if (!fighter) {
    return new Response(JSON.stringify({ fighter: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get owner display name
  let ownerName = '';
  if (fighter.owner_did) {
    const nameResult = await env.DB.prepare(
      'SELECT display_name FROM did_display_names WHERE did = ?'
    ).bind(fighter.owner_did).first();
    ownerName = nameResult?.display_name || '';
  }

  // Get rank (position in power leaderboard)
  const rankResult = await env.DB.prepare(
    'SELECT COUNT(*) + 1 as rank FROM combat_fighters WHERE power_score > ?'
  ).bind(fighter.power_score || 0).first();

  return new Response(JSON.stringify({
    fighter: {
      nftId: fighter.nft_id,
      edition: fighter.edition_number,
      type: fighter.combat_type,
      nature: fighter.nature,
      ability: fighter.ability,
      moves: [fighter.move_1, fighter.move_2, fighter.move_3, fighter.move_4].filter(Boolean),
      level: fighter.level,
      xp: fighter.xp,
      elo: fighter.elo_rating,
      powerScore: fighter.power_score,
      votePower: fighter.vote_power,
      battlePower: fighter.battle_power,
      wins: fighter.total_combat_wins,
      losses: fighter.total_combat_losses,
      draws: fighter.total_combat_draws,
      ownerName,
      ownerDid: fighter.owner_did,
      rank: rankResult?.rank || null,
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Task 2: Create FighterStatsPanel Component

**File:** `src/components/combat/FighterStatsPanel.tsx` (NEW)

A panel showing a fighter's full combat identity, used in the Gallery NFT explorer and potentially in Fight Club.

```tsx
import { useQuery } from '@tanstack/react-query';
import { Swords, Shield, Zap, Star, Trophy, Target } from 'lucide-react';
import { getMoveById } from '@/lib/combat/data/moves';

// Type color map (consider extracting to shared constant)
const TYPE_COLORS: Record<string, string> = {
  FIRE: '#ef4444', WATER: '#3b82f6', ELECTRIC: '#eab308',
  GRASS: '#22c55e', ICE: '#67e8f9', MARTIAL: '#f97316',
  VENOM: '#a855f7', EARTH: '#a16207', AIR: '#7dd3fc',
  PSYCHE: '#ec4899', INSECT: '#84cc16', STONE: '#78716c',
  GHOST: '#6366f1', DRAGON: '#7c3aed', SHADOW: '#1e293b',
  METAL: '#94a3b8', MYSTIC: '#f9a8d4', NEUTRAL: '#a0a0b0',
};

interface FighterStatsPanelProps {
  nftId?: string;
  edition?: number;
}

export function FighterStatsPanel({ nftId, edition }: FighterStatsPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['fighter-detail', nftId, edition],
    queryFn: async () => {
      const params = nftId ? `nftId=${nftId}` : `edition=${edition}`;
      const res = await fetch(`/api/combat/fighter-detail?${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.fighter;
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
  const moves = (data.moves || []).map((id: string) => getMoveById(id)).filter(Boolean);
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
          <span className="text-xs text-secondary">{totalBattles} battles · {winRate}% win rate</span>
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
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 block">Moves</span>
        <div className="flex flex-col gap-1.5">
          {moves.map((move: any) => (
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
                <span>{move.category === 'physical' ? 'PHY' : move.category === 'special' ? 'SPC' : 'SKL'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 3: Add Fighter Stats Panel Styles to theme.css

**File:** `src/styles/theme.css`

```css
/* Fighter Type Badge */
.fighter-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## Task 4: Integrate into Gallery NFT Explorer

**File:** `src/components/gallery/NFTInfoCard.tsx` (or wherever the NFT detail tabs live)

The NFT explorer currently has tabs: **Main | Attributes | History**. Add a fourth tab: **Combat**.

```tsx
// Add "Combat" tab alongside Main, Attributes, History
const TABS = ['Main', 'Attributes', 'Combat', 'History'];

// In the tab content:
{activeTab === 'Combat' && (
  <FighterStatsPanel nftId={nft.nftId} edition={nft.edition} />
)}
```

**Important:** The Combat tab should only appear for Your Wojak collection NFTs, not for Farmers Plot NFTs. Detect this by:
- Checking if the NFT has a `combat_fighters` entry (the FighterStatsPanel handles this — shows "No combat data" if none found)
- Or checking the collection ID if available

The simplest approach: always show the Combat tab, let the panel show "No combat data available" for non-fighter NFTs. This is low-effort and future-proof.

---

## Task 5: Integrate into WojakFighterCard Click

When a user clicks a WojakFighterCard in the Gallery Your Wojak section (from GALLERY-YOUR-WOJAK-SPEC), it should open a detail view showing the FighterStatsPanel.

Check how the existing Gallery NFT explorer works (click card → explorer opens). Either:
- Reuse the existing explorer with the new Combat tab
- Or create a simpler fighter detail modal/panel

The simplest approach: when clicking a Your Wojak card, navigate to the same NFT explorer but with the Combat tab active by default. Pass a query param or state.

If the existing explorer doesn't support Your Wojak NFTs (it's only for Farmers Plot), create a simpler FighterDetailModal:

```tsx
// Simple modal that shows fighter image + FighterStatsPanel
function FighterDetailModal({ nftId, edition, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <img src={`https://assets.mintgarden.io/thumbnails/medium/${nftId}.png`} />
        <FighterStatsPanel nftId={nftId} edition={edition} />
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Visual styles in `src/styles/theme.css`
- No `!important`
- The FighterStatsPanel is reusable — it can appear in Gallery, Fight Club, or anywhere
- Combat data comes from the `combat_fighters` table via API
- Move details are resolved client-side using `getMoveById` from `src/lib/combat/data/moves.ts`
- Handle missing data gracefully (fighter not found = "No combat data available")
- Type colors should match FighterRevealCard and YourWojakSection (consider extracting to shared file)
