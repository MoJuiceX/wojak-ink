# Demo Battle System — Fight Club Showcase

---

## Overview

Fight Club currently shows empty states on all tabs for new users. The Battle tab says "No fighters ready", Rankings says "No rankings yet", etc. This makes the main feature look dead on arrival.

**Solution:** A self-playing demo battle that showcases the combat system using real Wojak NFT images from the gallery. Users see what fighting looks like immediately — before they even own anything.

---

## Architecture

### Approach: Client-Side Demo with Static Data

We do NOT need a server-side demo engine. Wojak already has:
- `BattleView` with full animations, particles, audio
- `useBattlePlayback` hook that animates `TurnResult[]` data
- 18 type-specific particle effects, 14 WAV sounds, 40+ CSS animations

We just need to:
1. Add a `staticBattleData` prop to BattleView so it doesn't need API
2. Create hardcoded demo battle data (2 Wojaks, 6-8 turns, entertaining matchup)
3. Show it on the Fight Club Battle tab when user has no fighters
4. Auto-play it so users just watch

---

## Task 1: Make BattleView Accept Static Data

**File:** `src/components/combat/BattleView.tsx`

Add an optional prop to bypass API polling:

```typescript
interface BattleViewProps {
  battleId: number;
  playerNftId?: string;
  // NEW: Static data for demo mode — skips API polling
  staticBattleData?: BattleData;
  // NEW: Auto-play mode — no move buttons, plays both sides
  autoPlay?: boolean;
  // NEW: Callback when demo battle finishes
  onDemoComplete?: () => void;
}
```

Modify the `useEffect` that fetches battle data:

```typescript
// If static data provided, use it directly instead of fetching
useEffect(() => {
  if (staticBattleData) {
    setBattle(staticBattleData);
    // Initialize HP from fighter data
    const maxA = computeMaxHP(staticBattleData.fighterA!.type, staticBattleData.fighterA!.level);
    const maxB = computeMaxHP(staticBattleData.fighterB!.type, staticBattleData.fighterB!.level);
    setHpA({ current: maxA, ghost: maxA });
    setHpB({ current: maxB, ghost: maxB });
    return; // Skip API polling
  }
  // ... existing API polling logic
}, [staticBattleData, battleId]);
```

When `autoPlay` is true:
- Hide the MoveButtons component
- Hide the TurnTimer
- Auto-advance all turns using useBattlePlayback
- Show a "Watch Demo" label or badge in the corner

When the battle finishes and `onDemoComplete` is provided, call it.

---

## Task 2: Create Demo Battle Data

**File:** `src/lib/combat/demo-battle.ts` (NEW)

Create a hardcoded battle between two entertaining Wojaks. Use actual NFT images from the gallery for visual appeal.

```typescript
import type { CombatType } from './types';
import type { TurnResult } from './battle-state';

// Pick two visually distinctive Wojaks from the gallery
// Use their actual IPFS image URLs for realism
const DEMO_FIGHTER_A = {
  nft_id: 'demo_fighter_a',
  edition: 42,
  type: 'FIRE' as CombatType,
  nature: 'Brave',
  ability: 'Blaze',
  level: 15,
  elo: 1200,
  moves: [
    { id: 'ember', name: 'Ember', power: 40, accuracy: 100, category: 'special' },
    { id: 'flame_burst', name: 'Flame Burst', power: 70, accuracy: 85, category: 'special' },
    { id: 'quick_strike', name: 'Quick Strike', power: 40, accuracy: 100, category: 'physical' },
    { id: 'fire_shield', name: 'Fire Shield', power: 0, accuracy: 100, category: 'status' },
  ],
  // Use a real Wojak image URL from the gallery (pick a recognizable one)
  imageUrl: '/api/nft/image?edition=42',
};

const DEMO_FIGHTER_B = {
  nft_id: 'demo_fighter_b',
  edition: 88,
  type: 'WATER' as CombatType,
  nature: 'Calm',
  ability: 'Torrent',
  level: 14,
  elo: 1180,
  moves: [
    { id: 'water_gun', name: 'Water Gun', power: 40, accuracy: 100, category: 'special' },
    { id: 'tidal_wave', name: 'Tidal Wave', power: 65, accuracy: 90, category: 'special' },
    { id: 'shell_slam', name: 'Shell Slam', power: 50, accuracy: 95, category: 'physical' },
    { id: 'aqua_heal', name: 'Aqua Heal', power: 0, accuracy: 100, category: 'status' },
  ],
  imageUrl: '/api/nft/image?edition=88',
};
```

Create 7 turns of scripted battle data that showcases:
- Turn 1: Both use basic moves. Normal damage.
- Turn 2: Fighter A lands a critical hit. Screen shake + orange flash.
- Turn 3: Fighter B uses super-effective Water move on Fire. Green callout.
- Turn 4: Fighter A applies a burn status. Status icon appears.
- Turn 5: Fighter B heals. Green damage number (heal).
- Turn 6: Fighter A uses a big move. Not very effective callout.
- Turn 7: Fighter B lands the finishing blow. Knockout animation.

This showcases: normal hits, crits, super effective, not very effective, status effects, healing, and a knockout — the full combat experience in 7 turns.

**Important:** Use actual move IDs from `src/lib/combat/data/` so the particle system and audio play correctly. Check `move-data.ts` for valid move IDs and their assigned types/patterns.

Export the complete `BattleData` object:

```typescript
export const DEMO_BATTLE: BattleData = {
  id: 0,
  status: 'completed',
  currentTurn: 7,
  maxTurns: 50,
  winner: DEMO_FIGHTER_B.nft_id,
  fighterA: DEMO_FIGHTER_A,
  fighterB: DEMO_FIGHTER_B,
  turns: DEMO_TURNS,
  eloChangeA: -12,
  eloChangeB: 15,
  xpAwardedA: 45,
  xpAwardedB: 80,
};
```

---

## Task 3: Demo Battle Component

**File:** `src/components/combat/DemoBattle.tsx` (NEW)

A wrapper that presents the demo battle with context:

```tsx
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Swords } from 'lucide-react';
import { BattleView } from './BattleView';
import { DEMO_BATTLE } from '@/lib/combat/demo-battle';

export function DemoBattle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [key, setKey] = useState(0); // Force remount for replay

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleReplay = useCallback(() => {
    setKey(k => k + 1); // Remount BattleView
    setIsPlaying(true);
  }, []);

  const handleDemoComplete = useCallback(() => {
    // Could show a CTA here
  }, []);

  if (!isPlaying) {
    // Show a teaser card with a "Watch Demo" button
    return (
      <div className="card p-6 flex flex-col items-center gap-4 text-center">
        <div
          className="p-4 rounded-full"
          style={{ background: 'var(--color-primary-15)' }}
        >
          <Swords size={32} className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">See How Battles Work</h3>
          <p className="text-secondary text-sm mt-1">
            Watch a demo battle between two Wojak fighters.
            Type matchups, abilities, critical hits — the full experience.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary flex items-center gap-2"
          onClick={handlePlay}
        >
          <Play size={16} />
          Watch Demo Battle
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Demo badge */}
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

      {/* The actual battle view */}
      <BattleView
        key={key}
        battleId={0}
        playerNftId={DEMO_BATTLE.fighterA!.nft_id}
        staticBattleData={DEMO_BATTLE}
        autoPlay
        onDemoComplete={handleDemoComplete}
      />
    </div>
  );
}
```

---

## Task 4: Integrate Demo Into Fight Club Battle Tab

**File:** `src/pages/FightClub.tsx`

In the Battle tab section, show the DemoBattle when user has no fighters:

```tsx
{activeTab === 'battle' && (
  <>
    {accessData?.wojakCount === 0 && <MintFighterBanner />}
    <GameErrorBoundary gameName="Combat Arena">
      <Suspense fallback={<GameLoading gameName="Combat Arena" />}>
        {/* Show demo when user has no fighters, real arena when they do */}
        {accessData?.wojakCount === 0 ? (
          <DemoBattle />
        ) : (
          <CombatArena />
        )}
      </Suspense>
    </GameErrorBoundary>
  </>
)}
```

Import DemoBattle at the top (can be lazy loaded):
```tsx
const DemoBattle = lazy(() => import('@/components/combat/DemoBattle').then(m => ({ default: m.DemoBattle })));
```

---

## Task 5: Fix Fight Club Loading State

**File:** `src/pages/FightClub.tsx`

The access loading state (screenshot 3) shows a bare spinner in white void. Replace with a skeleton that includes the tab bar:

```tsx
if (accessLoading) {
  return (
    <PageTransition>
      <div
        style={{
          padding: contentPadding,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        {/* Skeleton tab bar */}
        <div className="fight-club-tabs">
          {['Battle', 'Vote', 'Rankings', 'Burn'].map((label) => (
            <div key={label} className="fight-club-tab" style={{ opacity: 0.3 }}>
              {label}
            </div>
          ))}
        </div>
        {/* Skeleton content */}
        <div className="flex flex-col gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-static p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg" style={{ background: 'var(--color-white-8)' }} />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 w-32 rounded" style={{ background: 'var(--color-white-8)' }} />
                  <div className="h-3 w-48 rounded" style={{ background: 'var(--color-white-5)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
```

---

## Task 6: Fix Wallet Icon Color

**File:** `src/pages/FightClub.tsx`

In `ConnectWalletPrompt`, the Wallet icon appears brown/invisible. The `className="text-primary"` should make it orange, but verify the icon renders correctly. If it's using a filled variant, it may appear solid dark.

Check if `Wallet` from lucide-react renders as outline. If it looks dark:
- Add explicit `style={{ color: 'var(--color-primary)' }}` to the icon
- Or swap to a different wallet icon that's clearer at 32px

---

## Task 7: Use Real Wojak Images in Demo

The demo fighters need real images. Two approaches:

**Option A (Recommended):** Use two well-known Wojak NFT images from the collection. Pick visually distinctive ones (e.g., one with fire background, one with water/ocean background). Hardcode their IPFS gateway URLs:
```typescript
imageUrl: 'https://nftstorage.link/ipfs/bafybei.../42.png',
```

**Option B:** Use the Gallery's NFT image API if it supports edition lookup:
```typescript
imageUrl: '/api/nft/image?edition=42',
```

Check if this API exists. If not, use IPFS URLs.

---

## Task 8: Improve Demo Battle Image Fallbacks

**File:** `src/components/combat/BattleView.tsx`

If Wojak images fail to load (IPFS timeout), show a styled placeholder:

```tsx
{fighter.imageUrl ? (
  <img
    src={fighter.imageUrl}
    alt={`Wojak #${fighter.edition}`}
    className="battle-nft-image"
    onError={(e) => {
      // Replace broken image with type-colored placeholder
      (e.target as HTMLImageElement).style.display = 'none';
      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
    }}
  />
) : null}
<div className={`battle-nft-placeholder hidden`}>
  <Swords size={48} style={{ color: 'var(--color-text-muted)' }} />
  <span className="text-xs text-muted">#{fighter.edition}</span>
</div>
```

---

## Implementation Notes

- The demo uses the EXISTING BattleView, useBattlePlayback, BattleCanvas, HPBar, etc. — no new visual components needed.
- All 18 type particles, 14 sounds, and 40+ animations already work. The demo just feeds them static data.
- The `autoPlay` prop makes BattleView auto-advance all turns without waiting for user input.
- The scripted turns should feel natural — not every turn is a crit or super effective. Mix in normal hits.
- Total demo duration: ~25-30 seconds at 1x speed (7 turns × ~3.5s per turn).

## Demo Battle Fighters — Picking Real Editions

Check the gallery for two visually distinctive Wojaks. Ideal:
- Fighter A: A Wojak with a fire/red/aggressive background or outfit
- Fighter B: A Wojak with a water/blue/calm background or outfit

Use `SELECT edition, image_urls FROM nfts WHERE collection_id = 'col1fgqe3rl99t6vdv5cykqq0ngrpx93wzw4ufvf3awsv67mkvxw8qsu9g53e' ORDER BY RANDOM() LIMIT 10` or browse the gallery to pick good ones.

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- No `!important`
- Visual styles in theme.css
- Check `src/lib/combat/data/move-data.ts` for valid move IDs
- Check `src/lib/combat/types.ts` for valid CombatType values
- Test that particle effects fire correctly for the chosen move types
