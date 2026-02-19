# Launch Day UX Polish — Friday Mint Day

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the user-facing experience for Friday's NFT launch. The core principle: **Swipe and Arena are NOT games.** They are the Wojak NFT metagame — a separate category from the arcade mini-games. This spec separates them in navigation, updates copy, adds empty states, and ensures discoverability.

**Architecture:** Minimal changes — update existing components and route config. No new systems. All visual styles use existing theme.css classes.

**Tech Stack:** React + TypeScript, Tailwind (layout) + theme.css (visuals), framer-motion, lucide-react icons

**Priority:** TIER 2 — high-impact UX fixes. Do these AFTER Tier 1 blockers (migration 034, secrets verification).

**Brand Voice:** See `docs/BRAND-VOICE.md`. Playful but trustworthy. Clear beats clever. "We" not "the platform."

---

## CRITICAL CONTEXT: Navigation Hierarchy

**Current problem:** Swipe and Combat Arena are linked from the GamesHub page (`/games`). But "Games" means arcade mini-games (Memory Match, Pong, Snake, etc.). Swipe voting and Combat battling are about **your Wojak NFT collection** — they're a different category entirely.

**What needs to happen:**
1. Remove Combat Arena card and WojakSwipeCard from GamesHub — they don't belong there
2. Add Arena as its own nav item in the sidebar (it's currently invisible in nav)
3. Add Arena to the mobile More Menu
4. Games stays as just arcade mini-games

**Route structure (already correct):**
- `/swipe/*` — Wojak Swipe (voting, dashboard, battles, leaderboard, activity) — already has its own nav item ✅
- `/arena/*` — Combat Arena (battle, leaderboard) — already a top-level route, just needs nav visibility ✅
- `/games/*` — Arcade mini-games only ✅

---

## Package A: Navigation Separation

### Task 1: Add Arena to primary nav config

Arena exists at `/arena` but has NO nav item. Add it to `PRIMARY_NAV_ITEMS` right after Swipe — they're conceptually paired (Swipe = social, Arena = competitive).

**Files:**
- Modify: `src/config/routes.ts`

**Step 1: Import the Swords icon**

Add `Swords` to the lucide-react import:

```tsx
import {
  Camera,
  Briefcase,
  Heart,
  Lightbulb,
  Palette,
  Settings,
  Trophy,
  Users,
  ShoppingBag,
  Gamepad2,
  Menu,
  MessageCircle,
  Swords,
  type LucideIcon
} from 'lucide-react';
```

**Step 2: Add Arena nav item to PRIMARY_NAV_ITEMS**

Add this item AFTER the Swipe entry (after the closing `}` of the swipe item, before the leaderboard item):

```tsx
  {
    id: 'arena',
    path: '/arena',
    label: 'Arena',
    shortLabel: 'Arena',
    icon: Swords,
    badge: 'dot',
    children: [
      { id: 'arena-leaderboard', path: '/arena/leaderboard', label: 'Leaderboard', icon: Swords },
    ]
  },
```

This puts the nav order as: Gallery, BigPulp, Generator, Games, Swipe, Arena, Leaderboard.

**Step 3: Commit**

```bash
git add src/config/routes.ts
git commit -m "feat: add Arena to primary nav items"
```

---

### Task 2: Add Arena to mobile More Menu

Arena should appear in the mobile More Menu alongside Swipe, since the bottom nav only has 5 items.

**Files:**
- Modify: `src/components/navigation/MoreMenu.tsx`

**Step 1: Import the Swords icon**

Add `Swords` to the lucide-react import:

```tsx
import {
  ShoppingBag,
  Users,
  Landmark,
  Settings,
  User,
  MessageCircle,
  Heart,
  Swords,
} from 'lucide-react';
```

**Step 2: Add Arena menu item**

Insert a new menu item right AFTER the Wojak Swipe item (it's the first item in the array). Add it as the second item:

```tsx
  {
    icon: Swords,
    label: 'Arena',
    description: 'Turn-based battles. Level up, climb the ELO ladder.',
    route: '/arena',
    badge: 'New',
    iconColor: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.15)',
  },
```

The `menuItems` array should now have Swipe first, Arena second, then Account, Shop, etc.

**Step 3: Commit**

```bash
git add src/components/navigation/MoreMenu.tsx
git commit -m "feat: add Arena to mobile More Menu"
```

---

### Task 3: Remove Combat Arena and WojakSwipeCard from GamesHub

GamesHub should ONLY show arcade mini-games. Remove the Combat Arena link and WojakSwipeCard.

**Files:**
- Modify: `src/pages/GamesHub.tsx`

**Step 1: Remove the WojakSwipeCard import**

Find and remove this import line:

```tsx
import { WojakSwipeCard } from '@/components/game/WojakSwipeCard';
```

**Step 2: Remove Combat Arena link and WojakSwipeCard from the render**

Find the `gamesGridWithVoting` block (around line 332-348). It currently has:

```tsx
const gamesGridWithVoting = (
  <>
    {/* Combat Arena featured link */}
    <Link
      to="/games/combat"
      className="card p-4 flex items-center gap-4 mb-4"
    >
      ...
    </Link>
    <WojakSwipeCard />
    <GamesGrid
```

Remove the entire Combat Arena `<Link>` block and the `<WojakSwipeCard />` line. Result should be:

```tsx
const gamesGridWithVoting = (
  <>
    <GamesGrid
```

**Step 3: Commit**

```bash
git add src/pages/GamesHub.tsx
git commit -m "refactor: remove Combat Arena and Swipe from GamesHub — they're not games"
```

---

## Package B: Feature Copy & Clarity

### Task 4: Update WojakSwipeCard copy

The WojakSwipeCard still says "Swipe, battle, and burn — the Wojak metagame" which conflates swipe with battles. Update it to be clear about what Swipe actually is.

**Files:**
- Modify: `src/components/game/WojakSwipeCard.tsx`

**Step 1: Update the description**

Change the description text:

Old:
```tsx
<span className="text-secondary" style={{ fontSize: 13 }}>Swipe, battle, and burn — the Wojak metagame</span>
```

New:
```tsx
<span className="text-secondary" style={{ fontSize: 13 }}>Rate Wojaks, earn XP, and discover the community's favorites</span>
```

**Step 2: Commit**

```bash
git add src/components/game/WojakSwipeCard.tsx
git commit -m "feat: clarify WojakSwipeCard copy — voting not battling"
```

---

### Task 5: Update OnboardingChecklist battle link

The OnboardingChecklist links to `/swipe/battles` for the "Enter and win a battle" milestone. With the arena route live, link to `/arena` instead.

**Files:**
- Modify: `src/components/game/OnboardingChecklist.tsx`

**Step 1: Update the battle milestone**

In the MILESTONES array, change the `battled` entry:

Old:
```tsx
{ key: 'battled' as const, label: 'Enter and win a battle', action: { label: 'Battle', to: '/swipe/battles' } },
```

New:
```tsx
{ key: 'battled' as const, label: 'Enter a battle in the Arena', action: { label: 'Arena', to: '/arena' } },
```

**Step 2: Commit**

```bash
git add src/components/game/OnboardingChecklist.tsx
git commit -m "fix: point onboarding battle link to /arena"
```

---

### Task 6: Improve CombatArena intro copy

The CombatArena page has a generic description. Make it clear what users do and what they earn.

**Files:**
- Modify: `src/pages/CombatArena.tsx`

**Step 1: Update the intro text**

Replace the existing `<p>` description (around line 77-78):

Old:
```tsx
<p className="text-secondary text-center text-sm">
  Send your Wojak into battle. Earn XP, climb the ELO ladder, and prove your fighter is the strongest.
</p>
```

New:
```tsx
<p className="text-secondary text-center text-sm" style={{ maxWidth: 480 }}>
  Pick a fighter, choose your moves, and battle other Wojaks. Winners earn XP and climb the ELO ladder.
  Each fighter has a type, ability, and unique moves based on their traits.
</p>
```

**Step 2: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat: improve CombatArena intro copy"
```

---

## Package C: Empty States & CTAs

### Task 7: Add empty state CTA for no fighters in QueuePanel

When users have no combat-ready fighters, the QueuePanel shows a generic message. Make it actionable with a link to the Generator.

**Files:**
- Modify: `src/components/combat/QueuePanel.tsx`

**Step 1: Add Link import**

Add at the top:
```tsx
import { Link } from 'react-router-dom';
```

**Step 2: Update the empty fighters message**

Find the empty state block (around line 44-52). Replace:

```tsx
if (fighters.length === 0) {
  return (
    <div className="card-static p-6 flex flex-col items-center gap-3 text-center">
      <span style={{ fontSize: 40 }}>⚔️</span>
      <p className="font-semibold">No fighters ready</p>
      <p className="text-secondary text-sm">
        Mint a Wojak with combat moves in the Generator to start battling.
      </p>
      <Link to="/generator" className="btn btn-primary text-sm mt-1">
        Create a Fighter
      </Link>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/combat/QueuePanel.tsx
git commit -m "feat: add empty state CTA to QueuePanel — links to Generator"
```

---

### Task 8: Improve battle history empty state

The CombatArena "Recent Battles" section shows flat text. Add guidance.

**Files:**
- Modify: `src/pages/CombatArena.tsx`

**Step 1: Update the battle history placeholder**

Find the "Recent Battles" placeholder block (around line 105-110). Replace:

```tsx
{/* Battle history — empty state until first fight */}
<div className="w-full">
  <h2 className="text-lg font-semibold mb-3">Recent Battles</h2>
  <div className="card-static p-6 flex flex-col items-center gap-2 text-center">
    <span className="text-muted text-sm">No battles yet.</span>
    <span className="text-muted text-xs">
      Select a fighter above and join the queue to start your first battle.
    </span>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat: improve battle history empty state copy"
```

---

## Package D: Combat Arena Fighter Fetching

### Task 9: Wire fighter fetching in CombatArena

CombatArena has a TODO on line 31: `// TODO: Fetch fighters via /api/combat/fighter once auth is wired`. Wire it using `useSageWallet` (the project's auth pattern — NOT Clerk).

**Files:**
- Modify: `src/pages/CombatArena.tsx`

**Step 1: Add useSageWallet import**

Add at the top:

```tsx
import { useSageWallet } from '@/sage-wallet';
```

**Step 2: Add wallet hook and DID detection**

Replace the existing state declarations and TODO effect with:

```tsx
export default function CombatArena() {
  const { address, status, getDIDs } = useSageWallet();
  const [fighters, setFighters] = useState<FighterSummary[]>([]);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBattleId, setActiveBattleId] = useState<number | null>(null);
  const [ownerDid, setOwnerDid] = useState<string>('');

  // Detect DID from wallet
  useEffect(() => {
    if (status !== 'connected') return;
    (async () => {
      try {
        const dids = await getDIDs();
        if (dids.length > 0) setOwnerDid(dids[0]);
      } catch (err) {
        console.error('[CombatArena] getDIDs error:', err);
      }
    })();
  }, [status, getDIDs]);

  // Load fighters owned by this DID
  useEffect(() => {
    if (!ownerDid) return;
    (async () => {
      try {
        const res = await fetch(`/api/combat/fighter?ownerDid=${encodeURIComponent(ownerDid)}`);
        if (!res.ok) return;
        const data = await res.json();
        setFighters(data.fighters || []);
      } catch (err) {
        console.error('[CombatArena] Fighter fetch error:', err);
      }
    })();
  }, [ownerDid]);
```

**Step 3: Update handleQueue to pass ownerDid**

In `handleQueue`, change:
```tsx
body: JSON.stringify({ nftId, ownerDid, battleMode }),
```

In `handleLeaveQueue`, change:
```tsx
await fetch(`/api/combat/queue?nftId=${nftId}&ownerDid=${encodeURIComponent(ownerDid)}`, { method: 'DELETE' });
```

**Step 4: Add wallet-not-connected state in the JSX**

Before the QueuePanel in the render, wrap it with a wallet check:

```tsx
{/* Wallet connection prompt */}
{status !== 'connected' && (
  <div className="card-static p-6 text-center w-full">
    <p className="text-secondary text-sm">
      Connect your Sage wallet to see your fighters.
    </p>
  </div>
)}

{/* Queue Panel — only when wallet connected */}
{status === 'connected' && (
  <div className="w-full">
    <QueuePanel
      fighters={fighters as any}
      onQueue={handleQueue}
      onLeaveQueue={handleLeaveQueue}
      queueStatus={queueStatus}
      isLoading={isLoading}
    />
  </div>
)}
```

**Step 5: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat: wire fighter fetching with useSageWallet in CombatArena"
```

---

## Package E: Build Verification

### Task 10: Build check

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors. If `Swords` icon isn't available in the installed lucide-react version, use `Sword` instead.

**Step 2: Run Vite build**

```bash
npm run build
```

Expected: Build succeeds. All 3300+ modules bundled.

**Step 3: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve build issues from UX polish"
```

---

## Pre-Launch Operations Checklist (Manual — for the human)

These are NOT CLI tasks. Terminal commands for the developer to run before Friday:

### 1. Apply Migration 034 (Trait Decay)

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "ALTER TABLE trait_usage ADD COLUMN effective_usage REAL NOT NULL DEFAULT 0;
   ALTER TABLE trait_usage ADD COLUMN last_decay_at TEXT NOT NULL DEFAULT (datetime('now'));
   UPDATE trait_usage SET effective_usage = usage_count, last_decay_at = datetime('now');"
```

### 2. Verify Secrets

```bash
npx wrangler pages secret list --project-name=wojak-ink
```

Check that `MINTGARDEN_API_KEY` and `PINATA_JWT` are present and valid.

### 3. Run Unit Tests

```bash
npm run test:unit
```

### 4. End-to-End Mint Test

- Connect Sage wallet → Design a Wojak → Free mint → Verify on MintGarden
- Paid mint → Accept offer → Verify
- Check credits deducted and mint numbers sequential

### 5. Smoke Test Navigation

- `/arena` → see Combat Arena with wallet prompt
- `/games/combat` → should redirect to `/arena`
- `/swipe` → GateChecklist should show
- `/games` → should show ONLY arcade games (no Combat card, no Swipe card)
- Desktop sidebar → Swipe and Arena both visible with dot badges
- Mobile More Menu → Swipe and Arena both listed with "New" badges
