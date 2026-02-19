# Combat Polish Phase 4: Responsive, Accessibility & UX Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all combat components mobile-friendly, add keyboard shortcuts, ARIA labels, loading/error states, visual QoL improvements (timer progress bar, queue animations, leaderboard medals, relative timestamps), and page transitions.

**Architecture:** Pure CSS responsive breakpoints in `src/styles/theme.css`, Tailwind responsive prefixes (`sm:`, `md:`), and small component-level React changes. No new libraries.

**Tech Stack:** React, TypeScript, CSS (responsive), Tailwind (layout only), Vitest

**Reference Files:**
- Current combat CSS: `src/styles/theme.css` lines 2299-2444+
- All combat components: `src/components/combat/`
- Existing animations: `src/styles/animations.css`

**Test Commands:**
- TypeScript: `npx tsc --noEmit`
- Unit: `npx vitest run src/lib/combat/`

**IMPORTANT:** This spec should be executed LAST (after Specs 1, 2, and 3) since it polishes components that may have been modified by earlier specs.

---

## IMPORTANT: Read Before Starting

1. Read the LATEST versions of all files in `src/components/combat/` — they may have been modified by Specs 1-3
2. All visual CSS goes in `src/styles/theme.css`
3. Tailwind for layout only — no `!important`
4. Test on mobile viewport (375px width) by checking CSS changes make sense
5. Commit after each task

---

### Task 1: BattleView — Responsive Layout (Mobile Stacking)

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

**Step 1: Change the fighter grid from fixed 2-col to responsive**

Find the fighter panels grid div in BattleView.tsx. It currently uses:

```tsx
<div className={`grid grid-cols-2 gap-4 ${shakeClass}`}
```

Replace with responsive columns that stack on mobile:

```tsx
<div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${shakeClass}`}
```

**Step 2: Make battle header responsive**

Find the battle header and ensure it wraps on mobile:

```tsx
<div className="flex items-center justify-between text-sm text-muted flex-wrap gap-1">
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/BattleView.tsx
git commit -m "feat(combat): make BattleView responsive — stack fighters on mobile (Task 4.1)"
```

---

### Task 2: MoveButtons — Responsive Grid + Touch Targets

**Files:**
- Modify: `src/components/combat/MoveButtons.tsx`
- Modify: `src/styles/theme.css`

**Step 1: Add minimum height to move buttons for touch targets**

In `src/styles/theme.css`, find the `.move-btn` rule and add `min-height`:

```css
.move-btn {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
  min-height: 48px;
}
```

**Step 2: Make the move grid responsive (stack on very small screens)**

In MoveButtons.tsx, update the grid:

```tsx
<div className="grid grid-cols-2 gap-2">
```

This is already fine — 2 columns works on mobile. But ensure the confirm button has min-height:

```tsx
<button
  className="btn btn-primary w-full min-h-[48px]"
  onClick={handleConfirm}
  disabled={disabled || !selectedMove}
>
  Confirm Move
</button>
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/MoveButtons.tsx src/styles/theme.css
git commit -m "feat(combat): add 48px touch targets for move buttons and confirm (Task 4.2)"
```

---

### Task 3: HPBar — Responsive Sizing

**Files:**
- Modify: `src/styles/theme.css`

**Step 1: Add responsive HP bar height for mobile**

In `src/styles/theme.css`, add a media query after the existing `.hp-bar` rules:

Find:
```css
.hp-low   .hp-bar-fill { background: var(--color-error); }
```

Add after it:

```css
/* Responsive HP bar — taller on mobile for visibility */
@media (max-width: 639px) {
  .hp-bar {
    height: 14px;
    border-radius: 7px;
  }
  .hp-bar-fill {
    border-radius: 7px;
  }
  .hp-bar-ghost {
    border-radius: 7px;
  }
}
```

**Step 2: Verify no `!important`**

```bash
grep -n '!important' src/styles/theme.css
```

**Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat(combat): make HP bar taller on mobile for visibility (Task 4.3)"
```

---

### Task 4: TurnLog — Responsive Max Height

**Files:**
- Modify: `src/components/combat/TurnLog.tsx`

**Step 1: Make max height responsive**

Find the TurnLog component's container div. Update the default maxHeight and make it smaller on mobile:

```tsx
export function TurnLog({ turns, maxHeight = '300px' }: TurnLogProps) {
```

Change the style to be responsive via a class approach. Update the container:

```tsx
<div
  ref={scrollRef}
  className="flex flex-col gap-2 overflow-y-auto hide-scrollbar"
  style={{ maxHeight: window.innerWidth < 640 ? '200px' : maxHeight }}
>
```

Actually, avoid `window.innerWidth` — use CSS instead. Add a wrapper class:

In `src/styles/theme.css`, add:

```css
/* Turn log responsive height */
.turn-log-container {
  max-height: 300px;
}

@media (max-width: 639px) {
  .turn-log-container {
    max-height: 200px;
  }
}
```

Then in TurnLog.tsx, replace the inline style:

```tsx
<div
  ref={scrollRef}
  className="turn-log-container flex flex-col gap-2 overflow-y-auto hide-scrollbar"
>
```

Remove the `style={{ maxHeight }}` prop since it's now handled by CSS.

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/TurnLog.tsx src/styles/theme.css
git commit -m "feat(combat): make TurnLog height responsive via CSS (Task 4.4)"
```

---

### Task 5: BattleView — Loading Skeleton

**Files:**
- Modify: `src/components/combat/BattleView.tsx`
- Modify: `src/styles/theme.css`

**Step 1: Add skeleton styles to theme.css**

In `src/styles/theme.css`, add after the combat animation classes:

```css
/* Combat loading skeleton */
.combat-skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0.03) 75%
  );
  background-size: 200% 100%;
  animation: skeletonShimmer 2s ease-in-out infinite;
  border-radius: var(--radius-md);
}

.combat-skeleton-bar {
  height: 10px;
  border-radius: 5px;
}

.combat-skeleton-image {
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
}
```

**Step 2: Replace the loading state in BattleView**

Find the loading return in BattleView.tsx:

```tsx
  if (!battle) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-muted text-sm">Loading battle...</p>
      </div>
    );
  }
```

Replace with a skeleton:

```tsx
  if (!battle) {
    return (
      <div className="flex flex-col gap-4 w-full animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="combat-skeleton w-24 h-4" />
          <div className="combat-skeleton w-16 h-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="card p-3 flex flex-col gap-2">
            <div className="combat-skeleton combat-skeleton-image" />
            <div className="combat-skeleton combat-skeleton-bar w-full" />
            <div className="combat-skeleton combat-skeleton-bar w-3/4" />
          </div>
          <div className="card p-3 flex flex-col gap-2">
            <div className="combat-skeleton combat-skeleton-image" />
            <div className="combat-skeleton combat-skeleton-bar w-full" />
            <div className="combat-skeleton combat-skeleton-bar w-3/4" />
          </div>
        </div>
      </div>
    );
  }
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/BattleView.tsx src/styles/theme.css
git commit -m "feat(combat): add loading skeleton for BattleView (Task 4.5)"
```

---

### Task 6: BattleView — Error State with Retry

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

**Step 1: Add combat error icon style to theme.css**

```css
/* Combat error state */
.combat-error-icon {
  font-size: 1.5rem;
  margin-bottom: 4px;
}
```

**Step 2: Upgrade the error return in BattleView**

Find the error return:

```tsx
  if (error) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }
```

Replace with:

```tsx
  if (error) {
    return (
      <div className="card-static p-6 flex flex-col items-center gap-3 text-center">
        <span className="combat-error-icon" aria-hidden="true">&#x26A0;&#xFE0F;</span>
        <p className="text-error text-sm">{error}</p>
        <button
          className="btn btn-secondary text-xs"
          onClick={fetchBattle}
        >
          Retry
        </button>
      </div>
    );
  }
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/BattleView.tsx src/styles/theme.css
git commit -m "feat(combat): add error state with retry button to BattleView (Task 4.6)"
```

---

### Task 7: BattleReplay — Fix maxHP Hardcode

**Files:**
- Modify: `src/components/combat/BattleReplay.tsx`

**Step 1: Read BattleReplay.tsx and identify the hardcoded maxHP = 100**

Find where maxHP is hardcoded and replace with the proper HP stat calculation:

```typescript
// Replace hardcoded 100 with actual calculation
const maxHP = fighter?.level
  ? Math.floor((2 * 80 + 31) * fighter.level / 100) + fighter.level + 10
  : 100;
```

Apply this for both fighter A and fighter B maxHP calculations.

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/BattleReplay.tsx
git commit -m "fix(combat): fix hardcoded maxHP in BattleReplay — use stat formula (Task 4.7)"
```

---

### Task 8: MoveButtons — Keyboard Shortcuts (1-4 + Enter)

**Files:**
- Modify: `src/components/combat/MoveButtons.tsx`

**Step 1: Add useEffect for keyboard shortcuts**

Inside the MoveButtons component, add a keyboard event listener:

```tsx
  // Keyboard shortcuts: 1-4 to select move, Enter to confirm
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
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

**Step 2: Add keyboard hint text below the move grid (desktop only)**

Find the confirm button and add a hint before it:

```tsx
      {/* Keyboard hint (desktop only) */}
      <p className="text-xs text-muted text-center hidden md:block">
        Press 1-4 to select a move, Enter to confirm
      </p>

      {/* Confirm button */}
      <button ...>
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/MoveButtons.tsx
git commit -m "feat(combat): add keyboard shortcuts 1-4 + Enter for MoveButtons (Task 4.8)"
```

---

### Task 9: BattleReplay — Arrow Key Navigation

**Files:**
- Modify: `src/components/combat/BattleReplay.tsx`

**Step 1: Add keyboard event listener for Left/Right arrow keys**

Read BattleReplay.tsx first. Find the `goPrev` and `goNext` callbacks.

Add a useEffect after them:

```tsx
  // Keyboard navigation: Left/Right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);
```

**Step 2: Add keyboard hint below the navigation controls**

```tsx
<p className="text-xs text-muted text-center hidden md:block">
  Use arrow keys to navigate turns
</p>
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/BattleReplay.tsx
git commit -m "feat(combat): add arrow key navigation for BattleReplay (Task 4.9)"
```

---

### Task 10: ARIA Labels on HPBar, Timer, and MoveButtons

**Files:**
- Modify: `src/components/combat/HPBar.tsx`
- Modify: `src/components/combat/MoveButtons.tsx`

**Step 1: Add ARIA progressbar role to HPBar**

In HPBar.tsx, find the hp-bar container div:

```tsx
<div className={barClasses}>
```

Add ARIA attributes:

```tsx
<div
  className={barClasses}
  role="progressbar"
  aria-valuenow={current}
  aria-valuemin={0}
  aria-valuemax={max}
  aria-label={`${label ?? 'HP'}: ${current} of ${max}`}
>
```

**Step 2: Add ARIA to the timer in MoveButtons**

Find the timer span and add:

```tsx
<span
  className={timerClass}
  role="timer"
  aria-live="polite"
  aria-label={`${timeLeft} seconds remaining`}
>
  {timeLeft}s
</span>
```

**Step 3: Add ARIA labels to move buttons**

Find each move button and add:

```tsx
<button
  key={move.id}
  className={...}
  onClick={() => handleSelect(move.id)}
  disabled={disabled}
  aria-pressed={selectedMove === move.id}
  aria-label={`${move.name}${move.power > 0 ? `, Power ${move.power}` : ''}, Accuracy ${move.accuracy}%`}
>
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/combat/HPBar.tsx src/components/combat/MoveButtons.tsx
git commit -m "feat(combat): add ARIA labels to HPBar, timer, and move buttons (Task 4.10)"
```

---

### Task 11: Timer Visual Progress Bar

**Files:**
- Modify: `src/components/combat/MoveButtons.tsx`
- Modify: `src/styles/theme.css`

**Step 1: Add timer progress bar CSS to theme.css**

```css
/* Timer progress bar */
.timer-progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.timer-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 1s linear, background-color 0.5s ease;
}

.timer-progress-fill.timer-fill-high {
  background: var(--color-success);
}

.timer-progress-fill.timer-fill-mid {
  background: #eab308;
}

.timer-progress-fill.timer-fill-low {
  background: var(--color-error);
}
```

**Step 2: Add the progress bar below the timer text in MoveButtons**

Replace the timer section:

```tsx
{/* Timer */}
<div className="flex flex-col gap-1">
  <div className="flex items-center justify-between">
    <span className="text-xs text-secondary">Choose your move</span>
    <span
      className={timerClass}
      role="timer"
      aria-live="polite"
      aria-label={`${timeLeft} seconds remaining`}
    >
      {timeLeft}s
    </span>
  </div>
  <div className="timer-progress-bar">
    <div
      className={`timer-progress-fill ${timeLeft > 15 ? 'timer-fill-high' : timeLeft > 5 ? 'timer-fill-mid' : 'timer-fill-low'}`}
      style={{ width: `${(timeLeft / timerSeconds) * 100}%` }}
    />
  </div>
</div>
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/MoveButtons.tsx src/styles/theme.css
git commit -m "feat(combat): add shrinking timer progress bar with color transitions (Task 4.11)"
```

---

### Task 12: Queue State Transitions — Searching + Match Found Animations

**Files:**
- Modify: `src/components/combat/QueuePanel.tsx`
- Modify: `src/styles/theme.css`

**Step 1: Add queue animation styles to theme.css**

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

/* Queue match found */
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

**Step 2: Read QueuePanel.tsx and update the queued state**

Find the section that shows queue status when `isQueued` is true. Replace the basic status badge with animated searching dots:

```tsx
{/* Queue status */}
{isQueued && (
  <div className="flex flex-col gap-2">
    <div className="queue-searching">
      <span className="queue-searching-dot" />
      <span className="queue-searching-dot" />
      <span className="queue-searching-dot" />
      <span className="text-secondary text-sm ml-1">
        Searching for opponent...
      </span>
    </div>
    <p className="text-xs text-muted text-center">
      Position {queueStatus?.position ?? '?'} in queue
    </p>
    <button
      className="btn btn-secondary w-full min-h-[48px]"
      onClick={handleLeave}
      disabled={isLoading}
    >
      Leave Queue
    </button>
  </div>
)}
```

**Step 3: Upgrade the matched state**

Find the matched section and replace with:

```tsx
{/* Matched */}
{isMatched && queueStatus?.battleId && (
  <div className="queue-match-found">
    <span className="text-accent font-bold text-sm">
      Match Found!
    </span>
    <span className="text-secondary text-sm">
      Battle #{queueStatus.battleId}
    </span>
  </div>
)}
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/combat/QueuePanel.tsx src/styles/theme.css
git commit -m "feat(combat): add searching pulse + match found glow animations to queue (Task 4.12)"
```

---

### Task 13: Leaderboard Top-3 Medals + ELO Color Coding

**Files:**
- Modify: `src/components/combat/CombatLeaderboard.tsx`
- Modify: `src/styles/theme.css`

**Step 1: Add helper functions for medals and ELO color**

In CombatLeaderboard.tsx, before the component function, add:

```tsx
const RANK_MEDALS: Record<number, string> = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

function eloColorClass(elo: number): string {
  if (elo >= 1200) return 'text-success';
  if (elo >= 900) return 'text-warning';
  return 'text-error';
}
```

**Step 2: Add `.text-warning` to theme.css if not present**

In `src/styles/theme.css`, find the text utility classes:

```css
.text-accent { color: var(--color-primary); }
.text-success { color: var(--color-success); }
```

Add `.text-warning` after `.text-success`:

```css
.text-warning { color: #eab308; }
```

**Step 3: Update rank display in each row**

Find the rank span in the fighters map. Replace the rank number with medal for top 3:

```tsx
<span className="w-8 text-xs font-semibold" title={`Rank ${i + 1}`}>
  {RANK_MEDALS[i + 1] ?? (i + 1)}
</span>
```

**Step 4: Update ELO display**

Find the ELO span and add color class:

```tsx
<span className={`w-16 text-right text-sm font-semibold tabular-nums ${eloColorClass(f.elo)}`}>
  {f.elo}
</span>
```

**Step 5: Verify**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/components/combat/CombatLeaderboard.tsx src/styles/theme.css
git commit -m "feat(combat): add top-3 medals and ELO color coding to leaderboard (Task 4.13)"
```

---

### Task 14: BattleHistory — Relative Timestamps + Opponent Type Badge

**Files:**
- Modify: `src/components/combat/BattleHistory.tsx`

**Step 1: Check if a `timeAgo` utility exists**

```bash
grep -rn "timeAgo\|formatRelativeTime\|relative.*time" src/lib/ src/utils/
```

If not found, add a simple inline helper at the top of BattleHistory.tsx:

```typescript
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
```

**Step 2: Add `opponentType` to the BattleRecord interface**

Find the interface and add:

```typescript
opponentType?: string;
```

**Step 3: Replace the date display and add type badge**

Find the opponent display block. Replace:

```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-1.5 text-sm font-medium">
    <span className="truncate">vs {b.opponent}</span>
    {b.opponentType && (
      <span className={`badge badge-${b.opponentType.toLowerCase()} text-xs`}>
        {b.opponentType}
      </span>
    )}
  </div>
  <div className="text-xs text-muted">
    {b.turns} turns &middot; {timeAgo(b.endedAt)}
  </div>
</div>
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/combat/BattleHistory.tsx
git commit -m "feat(combat): add relative timestamps and opponent type badge to BattleHistory (Task 4.14)"
```

---

### Task 15: FighterCard — Tooltip on Move Badges

**Files:**
- Modify: `src/components/combat/FighterCard.tsx`

**Step 1: Read FighterCard.tsx and identify the moves rendering**

**Step 2: Update moves type to accept either string or move detail object**

Add a MoveDetail interface:

```typescript
interface MoveDetail {
  id: string;
  name: string;
  power?: number;
  type?: string;
  category?: string;
}
```

Update the FighterCardProps `moves` field:

```typescript
moves: (string | MoveDetail)[];
```

**Step 3: Update the moves rendering with tooltip**

```tsx
{moves.map((move) => {
  if (typeof move === 'string') {
    return (
      <span key={move} className="combat-preview-badge text-xs">
        {move.replace(/^poke_\w+_/, '').replace(/-/g, ' ')}
      </span>
    );
  }
  const tooltip = [
    move.type && `Type: ${move.type}`,
    move.power != null && `Power: ${move.power}`,
    move.category && `Category: ${move.category}`,
  ].filter(Boolean).join(' | ');
  return (
    <span
      key={move.id}
      className="combat-preview-badge text-xs"
      title={tooltip}
    >
      {move.name}
    </span>
  );
})}
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/combat/FighterCard.tsx
git commit -m "feat(combat): add tooltip on FighterCard move badges showing power/type/category (Task 4.15)"
```

---

### Task 16: PreCombatMessage — Better Visual Hierarchy + Generator Link

**Files:**
- Modify: `src/components/combat/PreCombatMessage.tsx`

**Step 1: Read the current PreCombatMessage.tsx**

**Step 2: Rewrite with improved visual hierarchy**

```tsx
/**
 * PreCombatMessage — shown on NFT cards minted before the combat era.
 */

import { Link } from 'react-router-dom';

interface PreCombatMessageProps {
  className?: string;
}

export function PreCombatMessage({ className = '' }: PreCombatMessageProps) {
  return (
    <div className={`card-static p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">&#x2694;&#xFE0F;</span>
        <span className="text-sm font-semibold">Pre-Combat Era Wojak</span>
      </div>
      <p className="text-xs text-secondary leading-relaxed">
        This Wojak was minted before the combat system launched. It doesn't have combat stats, type, or moves.
        Burn it to earn credits toward a new combat-ready Wojak!
      </p>
      <Link
        to="/generator"
        className="btn btn-secondary text-xs w-fit"
      >
        Create a Combat Wojak
      </Link>
    </div>
  );
}
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/PreCombatMessage.tsx
git commit -m "feat(combat): improve PreCombatMessage with icon, hierarchy, and generator link (Task 4.16)"
```

---

### Task 17: Smooth Page Transition for Combat Arena

**Files:**
- Modify: `src/pages/CombatArena.tsx` (or wherever the main combat page is)

**Step 1: Find the combat arena page component**

```bash
grep -rn "CombatArena\|combat.*page\|/games" src/pages/
```

**Step 2: Add animate-fade-in class and responsive padding**

Find the main content wrapper div and update:

```tsx
<div className="flex flex-col items-center p-4 sm:p-6 gap-6 max-w-2xl mx-auto animate-fade-in">
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat(combat): add fade-in page transition and responsive padding to CombatArena (Task 4.17)"
```

---

### Task 18: Final Verification Pass

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 2: Run tests**

```bash
npx vitest run src/lib/combat/
```

**Step 3: No `!important` check**

```bash
grep -rn '!important' src/styles/theme.css src/styles/animations.css
```

Expected: 0 results

**Step 4: Responsive spot check**

Visually verify that the responsive CSS makes sense by checking the media queries added:
- HP bar taller on mobile (< 640px)
- Turn log shorter on mobile (< 640px)
- Fighter grid stacks on mobile (< 640px)
- Touch targets are 48px minimum

**Step 5: File inventory**

**Modified files:**
- `src/components/combat/BattleView.tsx` — responsive grid, skeleton, error retry
- `src/components/combat/MoveButtons.tsx` — keyboard shortcuts, touch targets, timer bar, ARIA
- `src/components/combat/TurnLog.tsx` — responsive max-height
- `src/components/combat/HPBar.tsx` — ARIA progressbar
- `src/components/combat/BattleReplay.tsx` — maxHP fix, arrow keys
- `src/components/combat/QueuePanel.tsx` — searching/match animations
- `src/components/combat/CombatLeaderboard.tsx` — medals, ELO colors
- `src/components/combat/BattleHistory.tsx` — relative timestamps, type badge
- `src/components/combat/FighterCard.tsx` — move tooltips
- `src/components/combat/PreCombatMessage.tsx` — visual hierarchy, generator link
- `src/styles/theme.css` — responsive media queries, skeleton, queue, timer bar
- `src/pages/CombatArena.tsx` — fade-in, responsive padding

**Step 6: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix(combat): final verification pass for responsive and UX polish"
```

---

## Summary of Changes

### Responsive
- Fighter grid: 2-col → stacked on mobile
- HP bar: 10px → 14px on mobile
- Turn log: 300px → 200px on mobile
- Move buttons: 48px min-height touch targets
- Combat arena: responsive padding

### Accessibility
- HPBar: `role="progressbar"`, `aria-valuenow/min/max`, `aria-label`
- Timer: `role="timer"`, `aria-live="polite"`
- Move buttons: `aria-pressed`, `aria-label` with power/accuracy
- Keyboard: 1-4 + Enter for moves, Left/Right for replay

### UX Polish
- Loading skeleton instead of "Loading battle..."
- Error state with retry button
- Timer progress bar (green → yellow → red)
- Queue: pulsing dots + match found glow
- Leaderboard: top-3 medals, ELO color coding
- Battle history: relative timestamps, opponent type badge
- FighterCard: move tooltips with power/type/category
- PreCombatMessage: icon, generator link
- Page fade-in transition
- BattleReplay: fix hardcoded maxHP
