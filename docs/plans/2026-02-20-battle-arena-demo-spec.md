# Battle Arena Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static "Coming Soon" card on the Battle tab with an auto-playing arena demo using real Wojak collection images, followed by a polished info section explaining what's coming.

**Architecture:** Four changes — (1) strip the teaser card from DemoBattle and make it auto-play/loop, (2) verify demo fighter images exist on IPFS, (3) create a new BattleTeaser info component, (4) wire both into the FightClub battle tab replacing the current static card.

**Tech Stack:** React, TypeScript, Tailwind (layout only), theme.css classes, existing BattleView + useBattlePlayback components.

---

## Context Files — Read These First

1. `src/components/combat/DemoBattle.tsx` — current implementation (full file)
2. `src/lib/combat/demo-battle.ts` — hardcoded 7-turn demo battle data
3. `src/pages/FightClub.tsx` — battle tab is lines 324–341 (the static Coming Soon card)
4. `src/components/combat/BattleView.tsx` — understand `autoPlay` and `onDemoComplete` props
5. `docs/plans/2026-02-20-battle-demo-design.md` — approved design doc

**Design decisions:**
- ⚠️ This spec **supersedes** `docs/plans/2026-02-20-battle-coming-soon-spec.md` — do not implement that spec
- No holder gate changes needed — the battle tab is already ungated
- No changes to BattleView, battle-arena.css, or any combat logic
- All layout via Tailwind, all visuals via existing theme.css + battle-arena.css

---

## Task 1: Update DemoBattle — Auto-Play, No Teaser Card, Auto-Restart Loop

**File:** `src/components/combat/DemoBattle.tsx`

**What to remove:** The entire `if (!isPlaying)` block (the teaser card with "Watch Demo Battle" button). The demo must start immediately — no button.

**What to change:** Start playing immediately on mount. When the battle completes, wait 3 seconds then auto-restart. Keep the Replay button visible at all times for manual restart.

**Step 1:** Replace the entire file with this implementation:

```tsx
/**
 * DemoBattle Component
 *
 * Auto-plays the demo battle immediately on mount.
 * Loops automatically: when battle ends, restarts after 3 seconds.
 * Replay button allows manual restart at any time.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { BattleView } from './BattleView';
import { DEMO_BATTLE } from '@/lib/combat/demo-battle';

export function DemoBattle() {
  const [key, setKey] = useState(0); // Incrementing remounts BattleView, restarting the demo
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReplay = useCallback(() => {
    // Cancel any pending auto-restart
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setKey(k => k + 1);
  }, []);

  const handleDemoComplete = useCallback(() => {
    // Auto-restart after 3 seconds
    replayTimerRef.current = setTimeout(() => {
      setKey(k => k + 1);
    }, 3000);
  }, []);

  // Clear timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Demo badge + manual replay button */}
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

      {/* Battle arena — key prop forces full remount on restart */}
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

export default DemoBattle;
```

**Step 2:** Build check:
```bash
npx tsc --noEmit
```
Expected: no errors in DemoBattle.tsx.

**Step 3:** Commit:
```bash
git add src/components/combat/DemoBattle.tsx
git commit -m "feat(battle): auto-play demo, remove teaser card, add loop restart

Demo starts immediately on mount. Auto-restarts after 3s when
battle ends. Manual replay button always visible."
```

---

## Task 2: Verify + Fix Demo Fighter Images

**File:** `src/lib/combat/demo-battle.ts`

The demo uses `getNftImageUrl(42)` and `getNftImageUrl(88)`. These resolve to:
- `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/0042.png`
- `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/0088.png`

**Step 1:** Verify both URLs return HTTP 200:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/0042.png"
curl -s -o /dev/null -w "%{http_code}" "https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/0088.png"
```

**Step 2 (if both return 200):** No change needed. Skip to Task 3.

**Step 2 (if either returns 404):** Try editions 1–14 until you find two that load. Pick two visually distinct editions. Update `demo-battle.ts`:
- Change `edition: 42` to the chosen edition A number
- Change `edition: 88` to the chosen edition B number
- Update `imageUrl: getNftImageUrl(42)` to `getNftImageUrl(<editionA>)`
- Update `imageUrl: getNftImageUrl(88)` to `getNftImageUrl(<editionB>)`

The fighter types (FIRE and WATER) and all turn data stay the same — only the `edition` number and `imageUrl` change.

**Step 3 (only if images were changed):** Commit:
```bash
git add src/lib/combat/demo-battle.ts
git commit -m "fix(demo): use verified IPFS edition numbers for demo fighters"
```

---

## Task 3: Create BattleTeaser Component

**File to create:** `src/components/combat/BattleTeaser.tsx`

This is the info section that appears below the demo arena. Explains what the battle system is, how it works, and when it launches.

**Step 1:** Create the file:

```tsx
/**
 * BattleTeaser Component
 *
 * Info section displayed below the demo arena on the Battle tab.
 * Explains the battle system and signals the upcoming launch.
 */

import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '⚔️',
    title: 'Queue your Wojak',
    body: 'Enter the battle queue and get matched by ELO rating',
  },
  {
    icon: '🤖',
    title: 'Auto-resolved',
    body: 'The server plays both sides — check back for your results',
  },
  {
    icon: '🏆',
    title: 'Earn battle power',
    body: 'Wins add to your power score and push you up the leaderboard',
  },
  {
    icon: '📈',
    title: 'Climb ELO',
    body: 'Your rating rises and falls with every result',
  },
] as const;

export function BattleTeaser() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-8 py-4">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Battle Arena</h2>
          <span className="badge badge-cyan">Coming Soon</span>
        </div>
        <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>
          Pit your Wojak against others in turn-based combat. The strongest survive.
        </p>
      </div>

      {/* How it works */}
      <div className="flex flex-col gap-3">
        <h3
          className="text-muted"
          style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          How it works
        </h3>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          {FEATURES.map(({ icon, title, body }) => (
            <div key={title} className="card-static p-4 flex flex-col gap-2">
              <div style={{ fontSize: '1.5rem' }}>{icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</div>
              <p className="text-secondary" style={{ fontSize: '0.8125rem', lineHeight: 1.55 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Type system */}
      <div className="flex flex-col gap-2">
        <h3
          className="text-muted"
          style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          The type system
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.65, maxWidth: '600px' }}>
          Every Wojak has a combat type — FIRE, WATER, VENOM, DRAGON, GRASS, and more —
          determined by the traits you chose in the generator. Type matchups matter:
          FIRE hits hard against GRASS, but falls to WATER. Your type is baked into
          your NFT on-chain. Choose wisely when you mint.
        </p>
      </div>

      {/* Launch callout */}
      <div
        className="card-static p-5 flex flex-col gap-2"
        style={{ borderLeft: '3px solid var(--color-primary)' }}
      >
        <p style={{ fontWeight: 600 }}>Battles launch next week.</p>
        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
          Keep voting now to build your power score before the arena opens.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ alignSelf: 'flex-start', marginTop: '4px', padding: '6px 0' }}
          onClick={() => navigate('/fight-club/vote')}
        >
          → Go vote
        </button>
      </div>

    </div>
  );
}

export default BattleTeaser;
```

**Step 2:** Build check:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3:** Commit:
```bash
git add src/components/combat/BattleTeaser.tsx
git commit -m "feat(battle): add BattleTeaser info section component

Shows below demo arena: header + Coming Soon badge, 4 how-it-works
cards, type system explainer, launch callout with link to vote tab."
```

---

## Task 4: Wire Both Components into FightClub Battle Tab

**File:** `src/pages/FightClub.tsx`

**Step 1:** Read the current imports at the top of the file (lines 1–24). Confirm `DemoBattle` and `BattleTeaser` are NOT imported yet.

**Step 2:** Add these two imports. `DemoBattle` is lazy (it pulls in BattleView which is heavy). `BattleTeaser` is not lazy (it's pure JSX).

Add to the lazy imports block (near the other `const X = lazy(...)` lines):
```tsx
const DemoBattle = lazy(() => import('@/components/combat/DemoBattle'));
```

Add to the regular imports (near other component imports):
```tsx
import { BattleTeaser } from '@/components/combat/BattleTeaser';
```

**Step 3:** Find the battle tab block (currently lines 324–341). It looks like this:
```tsx
{activeTab === 'battle' && (
  <div className="flex flex-col items-center justify-center" style={{ minHeight: '320px' }}>
    <div className="card-static p-8 flex flex-col items-center gap-4" style={{ maxWidth: '400px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px' }}>⚔️</div>
      <div className="flex flex-col gap-2">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Battle Arena</h2>
        <span className="badge badge-cyan">Coming Soon</span>
      </div>
      <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
        Pit your Wojak against others in turn-based combat.
        Queue your fighter, climb the ELO ladder, and earn battle power.
      </p>
      <p className="text-muted" style={{ fontSize: '0.75rem' }}>
        Launching next week — keep voting to build your power score.
      </p>
    </div>
  </div>
)}
```

Replace it entirely with:
```tsx
{activeTab === 'battle' && (
  <div className="flex flex-col gap-6">
    <Suspense fallback={<PageSkeleton />}>
      <DemoBattle />
    </Suspense>
    <BattleTeaser />
  </div>
)}
```

> `Suspense` and `PageSkeleton` are already imported in FightClub.tsx. Verify they are in the import list before adding — do not double-import.

**Step 4:** Build check:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 5:** Run dev server and manually verify:
```bash
npm run dev
```
Then open `http://localhost:5173/fight-club` and click the Battle tab. Verify:
- [ ] Arena demo starts playing immediately (no button click needed)
- [ ] HP bars animate, damage numbers float, effects play
- [ ] After the battle ends, it auto-restarts within ~3 seconds
- [ ] "Replay ↺" button works (manually restarts)
- [ ] "Battle Arena" + "Coming Soon" badge visible below
- [ ] 4 feature cards render in a responsive grid
- [ ] Type system paragraph renders below cards
- [ ] Orange left-border launch callout at bottom
- [ ] "→ Go vote" button navigates to the vote tab
- [ ] Mobile (resize to <480px): cards stack to 1 column, arena is full-width

**Step 6:** Commit:
```bash
git add src/pages/FightClub.tsx
git commit -m "feat(fightclub): replace Coming Soon card with demo arena + teaser

Auto-playing demo battle (real Wojak collection images) with
info section below: how it works, type system, launch callout.
Desktop + mobile responsive."
```

---

## Success Criteria

- [ ] `tsc --noEmit` passes with no new errors
- [ ] Battle tab auto-plays demo immediately (no button)
- [ ] Demo loops automatically (3s restart after completion)
- [ ] Fighter images load (not broken / 404)
- [ ] Replay button works
- [ ] All 4 info sections render: header, feature cards, type system, launch callout
- [ ] "→ Go vote" navigates to vote tab
- [ ] Mobile: feature cards stack, no horizontal overflow
- [ ] No `!important` used
- [ ] No inline color values (use CSS variables or existing classes)

## Out of Scope

- Do NOT change BattleView, battle-arena.css, or any combat logic
- Do NOT modify any other FightClub tabs (Vote, Rankings, Burn)
- Do NOT add sound/audio changes
- Do NOT touch the holder gate (already ungated for this tab)
- Do NOT change demo-battle.ts turn data — only edition numbers if images 404

## Report Format

```
DONE: Battle Arena Demo
Files changed: [list]
Build: PASS / FAIL
Self-checks:
  - Demo auto-plays on tab click: pass/fail
  - Demo loops after completion: pass/fail
  - Fighter images load: pass/fail
  - Info section renders fully: pass/fail
  - Mobile layout: pass/fail
  - tsc --noEmit: pass/fail
Notes: [anything unexpected]
```
