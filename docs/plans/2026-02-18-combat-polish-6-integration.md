# Combat Polish Phase 6: Auth Wiring, Battle Route & Arena Integration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the combat system actually work end-to-end: wire auth/wallet DID into CombatArena, create the missing battle detail route, add a fighters-by-owner API endpoint, wire BattleHistory into the arena page, fix hardcoded maxHP calculations, and add remaining UX polish (keyboard shortcuts, queue animations, leaderboard medals).

**Architecture:** Wire the existing `useSageWallet()` context to provide DID for queue/battle operations. Add a new API endpoint for fetching fighters by owner DID. Create the battle detail page route. Small component upgrades for UX polish.

**Tech Stack:** React, TypeScript, React Router, Cloudflare Pages Functions, D1

**Reference Files:**
- Auth context: `src/contexts/AuthContext.tsx`
- Wallet context: `src/sage-wallet/SageWalletProvider.tsx` (has `getDIDs()` method)
- Combat API: `functions/api/combat/` (10 endpoints)
- CombatArena page: `src/pages/CombatArena.tsx` (has TODO on line 31)
- BattleView: `src/components/combat/BattleView.tsx`
- Router config: Check `src/App.tsx` or `src/router.tsx` for route definitions

**Test Commands:**
- TypeScript: `npx tsc --noEmit`
- Unit: `npx vitest run src/lib/combat/`

**IMPORTANT:** This spec handles CRITICAL integration gaps. Without it, the combat system shows an empty state with no fighters and no working battles.

---

## IMPORTANT: Read Before Starting

1. Read `src/pages/CombatArena.tsx` — note the TODO on line 31 about auth wiring
2. Read `src/sage-wallet/SageWalletProvider.tsx` — understand how `getDIDs()` works
3. Read `functions/api/combat/fighter.ts` — currently only fetches by `nftId`
4. Read `functions/api/combat/queue.ts` — requires `ownerDid` parameter
5. Check the router config for existing `/games/combat` route
6. Commit after each task

---

### Task 1: Create fighters-by-owner API endpoint

**Files:**
- Create: `functions/api/combat/fighters.ts`

**Step 1: Create the endpoint**

```typescript
// functions/api/combat/fighters.ts
// GET /api/combat/fighters?ownerDid=xxx — list all combat fighters owned by a DID

import { jsonResponse, errorResponse, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const ownerDid = url.searchParams.get('ownerDid');

  if (!ownerDid) return errorResponse('Missing ownerDid parameter');

  const { results } = await context.env.DB.prepare(
    'SELECT * FROM combat_fighters WHERE owner_did = ? ORDER BY level DESC, elo_rating DESC'
  ).bind(ownerDid).all();

  if (!results || results.length === 0) {
    return jsonResponse([]);
  }

  return jsonResponse(results.map(buildFighterResponse));
};
```

**Step 2: Read `functions/api/combat/_shared.ts` first to verify `buildFighterResponse` exists and its signature**

If `buildFighterResponse` doesn't accept a full row object, adjust accordingly.

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add functions/api/combat/fighters.ts
git commit -m "feat(combat): add GET /api/combat/fighters endpoint — list fighters by owner DID"
```

---

### Task 2: Wire auth/wallet DID into CombatArena

**Files:**
- Modify: `src/pages/CombatArena.tsx`

**Step 1: Read the current CombatArena.tsx in full**

**Step 2: Import the wallet hook and add DID fetching**

At the top, add imports:

```typescript
import { useSageWallet } from '@/sage-wallet/SageWalletProvider';
import { BattleView } from '@/components/combat/BattleView';
import { BattleHistory } from '@/components/combat/BattleHistory';
```

**Step 3: Replace the TODO placeholder with actual DID and fighter fetching**

Inside the component, replace:
```typescript
const [fighters] = useState<FighterSummary[]>([]);
```

With state and fetching logic:

```typescript
const [fighters, setFighters] = useState<FighterSummary[]>([]);
const [ownerDid, setOwnerDid] = useState<string | null>(null);
const [isLoadingFighters, setIsLoadingFighters] = useState(false);
const { getDIDs, isConnected } = useSageWallet();
```

**Step 4: Replace the empty useEffect with DID fetching**

Replace:
```typescript
useEffect(() => {
  // TODO: Fetch fighters via /api/combat/fighter once auth is wired
}, []);
```

With:
```typescript
// Fetch owner DID from wallet
useEffect(() => {
  if (!isConnected) return;

  getDIDs().then((dids) => {
    if (dids.length > 0) {
      setOwnerDid(dids[0]);
    }
  }).catch((err) => {
    console.error('[CombatArena] Failed to get DIDs:', err);
  });
}, [isConnected, getDIDs]);

// Fetch combat fighters by owner DID
useEffect(() => {
  if (!ownerDid) return;
  setIsLoadingFighters(true);

  fetch(`/api/combat/fighters?ownerDid=${encodeURIComponent(ownerDid)}`)
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) {
        setFighters(data);
      }
    })
    .catch((err) => {
      console.error('[CombatArena] Failed to load fighters:', err);
    })
    .finally(() => {
      setIsLoadingFighters(false);
    });
}, [ownerDid]);
```

**Step 5: Fix the queue handler to pass real ownerDid**

Replace `ownerDid: ''` with `ownerDid: ownerDid ?? ''` in the handleQueue function:

```typescript
body: JSON.stringify({ nftId, ownerDid: ownerDid ?? '', battleMode }),
```

Do the same for handleLeaveQueue:

```typescript
body: JSON.stringify({ nftId: '...', ownerDid: ownerDid ?? '' }),
```

**Step 6: Add wallet connect prompt when not connected**

Add before the QueuePanel:

```tsx
{!isConnected && (
  <div className="card-static p-6 text-center flex flex-col gap-3">
    <p className="text-secondary text-sm">Connect your Sage wallet to access your combat fighters.</p>
  </div>
)}
```

**Step 7: Wire the active battle to BattleView**

Find the active battle placeholder and add:

```tsx
{activeBattleId && ownerDid && (
  <BattleView
    battleId={activeBattleId}
    playerNftId={fighters[0]?.nft_id}
  />
)}
```

**Step 8: Wire BattleHistory**

Replace the "No battle history yet" placeholder with:

```tsx
{ownerDid && fighters.length > 0 && (
  <div className="w-full">
    <h2 className="text-lg font-semibold mb-3">Recent Battles</h2>
    <BattleHistory nftId={fighters[0]?.nft_id} />
  </div>
)}
```

**Step 9: Verify**

```bash
npx tsc --noEmit
```

**Step 10: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat(combat): wire wallet DID into CombatArena — fetch fighters, pass DID to queue, show BattleView and BattleHistory"
```

---

### Task 3: Create battle detail page route

**Files:**
- Create: `src/pages/CombatBattle.tsx`
- Modify: Router config (likely `src/App.tsx` or `src/router.tsx`)

**Step 1: Search for the router config**

```bash
grep -rn "games/combat\|CombatArena" src/App.tsx src/router.tsx src/routes.tsx 2>/dev/null
```

**Step 2: Create the CombatBattle page**

```tsx
// src/pages/CombatBattle.tsx

/**
 * Combat Battle Detail Page — /games/combat/battle/:id
 *
 * Renders the full BattleView for a specific battle ID.
 */

import { useParams } from 'react-router-dom';
import { PageSEO } from '@/components/seo';
import { PageTransition } from '@/components/layout/PageTransition';
import { BattleView } from '@/components/combat/BattleView';
import { useSageWallet } from '@/sage-wallet/SageWalletProvider';
import { useState, useEffect } from 'react';

export default function CombatBattle() {
  const { id } = useParams<{ id: string }>();
  const battleId = id ? parseInt(id, 10) : null;
  const { getDIDs, isConnected } = useSageWallet();
  const [playerNftId, setPlayerNftId] = useState<string | undefined>();

  // Try to determine which fighter belongs to the current user
  useEffect(() => {
    if (!isConnected || !battleId) return;

    getDIDs().then(async (dids) => {
      if (dids.length === 0) return;
      const ownerDid = dids[0];

      // Fetch the user's fighters to find their NFT ID
      try {
        const res = await fetch(`/api/combat/fighters?ownerDid=${encodeURIComponent(ownerDid)}`);
        const fighters = await res.json();
        if (Array.isArray(fighters) && fighters.length > 0) {
          // Use the first fighter as the player's NFT ID
          // The BattleView will figure out which side they're on
          setPlayerNftId(fighters[0].nft_id);
        }
      } catch (err) {
        console.error('[CombatBattle] Failed to load fighters:', err);
      }
    });
  }, [isConnected, getDIDs, battleId]);

  if (!battleId || isNaN(battleId)) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center p-4 sm:p-6 gap-6 max-w-2xl mx-auto animate-fade-in">
          <PageSEO title="Battle Not Found" description="Invalid battle ID" />
          <div className="card-static p-6 text-center">
            <p className="text-error text-sm">Invalid battle ID.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col items-center p-4 sm:p-6 gap-6 max-w-2xl mx-auto animate-fade-in">
        <PageSEO
          title={`Battle #${battleId}`}
          description={`Combat Battle #${battleId}`}
        />
        <BattleView battleId={battleId} playerNftId={playerNftId} />
      </div>
    </PageTransition>
  );
}
```

**Step 3: Add the route to the router config**

Find the route for `/games/combat` and add a child route:

```tsx
{
  path: '/games/combat/battle/:id',
  lazy: () => import('./pages/CombatBattle'),
}
```

Or if using a different router pattern, adapt accordingly. Read the router config first to match the existing pattern.

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/pages/CombatBattle.tsx src/App.tsx
git commit -m "feat(combat): add /games/combat/battle/:id route and CombatBattle page"
```

---

### Task 4: Fix hardcoded maxHP in BattleView

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

**Step 1: Read the current BattleView on the main branch and find the maxHP calculation**

Look for lines like:
```typescript
Math.floor((2 * 80 + 31) * fighter.level / 100) + fighter.level + 10
```

**Step 2: Import the proper HP calculation function**

```typescript
import { getBaseStats } from '@/lib/combat/data/base-stats';
import { calculateHP } from '@/lib/combat/stat-calculator';
```

Or if these functions exist under different names, search for them:

```bash
grep -rn "calculateHP\|getBaseStats\|baseHP\|base_stats" src/lib/combat/
```

**Step 3: Replace the hardcoded calculation with the proper one**

Use the fighter's type to get correct base HP instead of hardcoding 80 for all types.

**Step 4: Do the same in BattleReplay.tsx**

Find `const maxHP_A = 100;` and replace with the proper calculation.

**Step 5: Verify**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/components/combat/BattleView.tsx src/components/combat/BattleReplay.tsx
git commit -m "fix(combat): use actual type-based HP calculation instead of hardcoded base stats"
```

---

### Task 5: MoveButtons — Keyboard Shortcuts (1-4 + Enter)

**Files:**
- Modify: `src/components/combat/MoveButtons.tsx`

**Step 1: Read the current MoveButtons.tsx on main**

**Step 2: Add useEffect for keyboard shortcuts**

```tsx
// Keyboard shortcuts: 1-4 to select move, Enter to confirm
useEffect(() => {
  if (disabled) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key >= '1' && e.key <= '4') {
      const index = parseInt(e.key) - 1;
      if (index < moves.length) {
        e.preventDefault();
        handleSelect(moves[index].id);
      }
    } else if (e.key === 'Enter' && selectedMove) {
      e.preventDefault();
      handleConfirm();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [disabled, moves, selectedMove, handleSelect, handleConfirm]);
```

**Step 3: Add a keyboard hint for desktop users**

```tsx
<p className="text-xs text-muted text-center hidden md:block">
  Press 1-4 to select a move, Enter to confirm
</p>
```

**Step 4: Add ARIA labels to move buttons**

```tsx
aria-pressed={selectedMove === move.id}
aria-label={`${move.name}${move.power > 0 ? `, Power ${move.power}` : ''}, Accuracy ${move.accuracy}%`}
```

**Step 5: Verify & Commit**

```bash
npx tsc --noEmit
git add src/components/combat/MoveButtons.tsx
git commit -m "feat(combat): add keyboard shortcuts 1-4 + Enter for move selection"
```

---

### Task 6: QueuePanel — Searching + Match Found Animations

**Files:**
- Modify: `src/components/combat/QueuePanel.tsx`
- Modify: `src/styles/theme.css`

**Step 1: Add queue animation CSS to theme.css**

Append to the combat section:

```css
/* Queue searching animation */
.queue-searching {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
}

.queue-searching-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: queue-dot-pulse 1.4s ease-in-out infinite;
}

.queue-searching-dot:nth-child(2) { animation-delay: 0.2s; }
.queue-searching-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes queue-dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.queue-match-found {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 107, 0, 0.08);
  border: 1px solid var(--color-primary);
  box-shadow: var(--glow-primary);
  animation: match-found-pulse 0.6s ease-out;
}

@keyframes match-found-pulse {
  0% { transform: scale(0.92); opacity: 0; }
  60% { transform: scale(1.03); }
  100% { transform: scale(1); opacity: 1; }
}
```

**Step 2: Read QueuePanel.tsx and update the queued/matched states**

Replace the static queue status with animated searching dots and the match found state with the glowing animation.

**Step 3: Verify & Commit**

```bash
npx tsc --noEmit
git add src/components/combat/QueuePanel.tsx src/styles/theme.css
git commit -m "feat(combat): add searching pulse + match found glow to queue panel"
```

---

### Task 7: CombatLeaderboard — Top-3 Medals + ELO Colors

**Files:**
- Modify: `src/components/combat/CombatLeaderboard.tsx`
- Modify: `src/styles/theme.css`

**Step 1: Add `.text-warning` class to theme.css if not present**

```css
.text-warning { color: #eab308; }
```

**Step 2: Read CombatLeaderboard.tsx and add medal/ELO helpers**

Before the component:

```tsx
const RANK_MEDALS: Record<number, string> = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

function eloColorClass(elo: number): string {
  if (elo >= 1200) return 'text-success';
  if (elo >= 900) return 'text-warning';
  return 'text-error';
}
```

**Step 3: Update rank display and ELO display in each row**

Replace rank number with medal for top 3. Add color class to ELO span.

**Step 4: Verify & Commit**

```bash
npx tsc --noEmit
git add src/components/combat/CombatLeaderboard.tsx src/styles/theme.css
git commit -m "feat(combat): add top-3 medals and ELO color coding to leaderboard"
```

---

### Task 8: Final Verification

**Step 1:** TypeScript check

```bash
npx tsc --noEmit
```

**Step 2:** Run combat tests

```bash
npx vitest run src/lib/combat/
```

**Step 3:** Verify route works

```bash
grep -rn "combat/battle" src/App.tsx src/router.tsx src/routes.tsx
```

**Step 4:** Verify no empty `ownerDid: ''` remains

```bash
grep -rn "ownerDid: ''" src/pages/CombatArena.tsx
```

Should return zero results.

**Step 5: Commit if fixes needed**

```bash
git add -A
git commit -m "fix(combat): final verification pass for combat integration"
```

---

## Summary

### New Files
- `functions/api/combat/fighters.ts` — GET fighters by owner DID
- `src/pages/CombatBattle.tsx` — Battle detail page at `/games/combat/battle/:id`

### Modified Files
- `src/pages/CombatArena.tsx` — Full auth wiring, fighter fetching, BattleHistory
- `src/components/combat/BattleView.tsx` — Fix hardcoded maxHP
- `src/components/combat/BattleReplay.tsx` — Fix hardcoded maxHP
- `src/components/combat/MoveButtons.tsx` — Keyboard shortcuts, ARIA
- `src/components/combat/QueuePanel.tsx` — Searching/match animations
- `src/components/combat/CombatLeaderboard.tsx` — Medals, ELO colors
- `src/styles/theme.css` — Queue animations, text-warning
- Router config — New `/games/combat/battle/:id` route

### What This Fixes
- **CombatArena shows "No fighters"** → Now fetches real fighters via DID
- **Queue sends empty ownerDid** → Now passes wallet DID
- **Clicking a battle 404s** → New battle detail route
- **All types show same maxHP** → Uses type-specific base stats
- **No keyboard controls** → 1-4 + Enter for moves
- **Static queue** → Animated searching/match found
- **Plain leaderboard** → Top-3 medals + ELO colors
