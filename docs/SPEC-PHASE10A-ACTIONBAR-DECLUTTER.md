# SPEC: Phase 10A — Action Bar Declutter

> **For Claude CLI:** Read this entire spec top to bottom. Then read every file in "Files to Read" before making changes. Follow `CLAUDE.md` for all CSS conventions: visual styling in `theme.css`, Tailwind for layout only, never `!important`.

---

## Problem

The action bar currently has **11 interactive elements** in a single horizontal strip:

```
[ 🎲▼ ] [ ↩ ] [ ↪ ] [ ❤️ ] [ ⬇️ ] [ 📋 ] [ 🏆 ] [ {} ] [ ℹ️ ] | [ ⚡ ] [ 💳 ] 142/4200
```

This creates three UX problems:
1. **No hierarchy** — Export and Mint (the two most important actions) have the same visual weight as Metadata toggle and Leaderboard link
2. **Cognitive overload** — 11 icons of similar size in a row forces users to scan every one to find what they need
3. **Mobile squeeze** — On smaller screens, buttons compress to the point of being hard to tap

---

## Files to Read

1. `src/components/generator/ActionBar.tsx` — the full component (677 lines)
2. `src/pages/Generator.tsx` — where ActionBar is placed in layout
3. `src/pages/Generator.css` — `.generator-actions` styling
4. `src/styles/theme.css` — existing button/card patterns
5. `src/components/generator/GeneratorInfo.tsx` — the "How It Works" modal

---

## Design: Three Visual Groups

Keep the single bar container (the glass-morphism look is good), but organize buttons into **three distinct groups** with visual separators:

```
Desktop:
┌────────────────────────────────────────────────────────────────────┐
│  🎲▼  ↩  ↪  │  ❤️  ⬇️  📋  ⋯  │  [0.20 XCH]  [ MINT 💳 ]  42/4200  │
│  ─ create ─  │  ─── output ───  │  ──────── mint ──────────────────  │
└────────────────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────────────────────────────────┐
│  🎲▼  ↩  ↪  │  ❤️  ⬇️  ⋯  │  [ MINT 💳 ]  42/4200  │
└──────────────────────────────────────────────────────┘
```

### What Changes

**Group 1 — Create** (left):
- Random (with dropdown) — stays
- Undo — stays
- Redo — stays

**Group 2 — Output** (middle):
- Save/Favorites — stays
- Export — stays (primary variant)
- Copy — stays (desktop only)
- **Overflow menu (⋯)** — NEW, contains demoted buttons

**Group 3 — Mint** (right, separated by divider):
- Free/Paid toggle — stays (when applicable)
- Price display — stays (when applicable)
- Mint button — stays (primary variant)
- Supply counter — stays

**Moved to overflow menu (⋯):**
- Leaderboard/Trophy 🏆 — rarely used during creation
- Metadata toggle `{ }` — developer/power-user feature
- Info/How It Works ℹ️ — read once, not during creation

### The Overflow Menu

A simple dropdown (like the existing Random dropdown pattern) that opens upward from the `⋯` button:

```
┌──────────────────┐
│ 🏆 Free Mints    │
│ {} Metadata       │ (desktop only)
│ ℹ️ How It Works   │
└──────────────────┘
```

---

## Exact Changes

### Step 1: Add Overflow Menu State

In `ActionBar.tsx`, add state for the overflow menu (alongside the existing `showRandomMenu`):

```typescript
const [showOverflowMenu, setShowOverflowMenu] = useState(false);
const overflowMenuRef = useRef<HTMLDivElement>(null);
```

Add a click-outside handler (same pattern as the Random menu):

```typescript
useEffect(() => {
  if (!showOverflowMenu) return;
  const handleClick = (e: MouseEvent) => {
    if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
      setShowOverflowMenu(false);
    }
  };
  document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
}, [showOverflowMenu]);
```

### Step 2: Create the Overflow Menu Button + Dropdown

Replace the three individual buttons (Leaderboard, Metadata, Info) with one overflow button:

```tsx
{/* Overflow menu — secondary actions */}
<div className="relative" ref={overflowMenuRef}>
  <ActionBarTooltip content="More">
    <ActionButton
      onClick={() => setShowOverflowMenu((v) => !v)}
      isActive={showOverflowMenu}
      icon={<MoreHorizontal size={20} />}
      label="More options"
    />
  </ActionBarTooltip>
  <AnimatePresence>
    {showOverflowMenu && (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-xl overflow-hidden py-1 min-w-[160px]"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Free Mints / Leaderboard */}
        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--color-text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          onClick={() => {
            setShowOverflowMenu(false);
            window.location.href = '/free-mints.html';
          }}
        >
          <Trophy size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Free Mints</span>
          {isWalletConnected && (credits?.free_mints_available ?? 0) > 0 && (
            <span
              className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              {credits!.free_mints_available}
            </span>
          )}
        </button>

        {/* Metadata toggle — desktop only */}
        {onToggleRightPanel && (
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={() => {
              setShowOverflowMenu(false);
              onToggleRightPanel();
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700 }}>{'{ }'}</span>
            <span>{rightPanelMode !== 'colors' ? 'Show Colors' : 'Show Metadata'}</span>
          </button>
        )}

        {/* How It Works */}
        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--color-text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          onClick={() => {
            setShowOverflowMenu(false);
            setShowGeneratorInfo(true);
          }}
        >
          <Info size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <span>How It Works</span>
        </button>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

### Step 3: Add Import

Add `MoreHorizontal` to the lucide-react import at the top of ActionBar.tsx:

```typescript
import {
  // ... existing imports
  MoreHorizontal,
} from 'lucide-react';
```

### Step 4: Remove the Three Standalone Buttons

Delete these three blocks from the JSX:

1. **The Leaderboard button block** (around line 570-578) — the `<ActionBarTooltip content="Leaderboard">` block
2. **The Metadata Preview toggle block** (around line 580-590) — the `{onToggleRightPanel && (` block
3. **The How It Works block** (around line 592-599) — the `<ActionBarTooltip content="How It Works">` block

### Step 5: Add Visual Group Separators

The existing mint section already has a left border divider. Add a matching divider between Group 1 (create) and Group 2 (output).

After the Redo button and before the Save button, add:

```tsx
{/* Visual group separator */}
<div
  className="h-6 w-px shrink-0 mx-0.5"
  style={{ background: 'var(--color-border)' }}
/>
```

This creates: `[Random ↩ ↪ | ❤️ ⬇️ 📋 ⋯ | Mint section]`

### Step 6: Ensure Correct Button Order

After changes, the button order in JSX should be:

```
1. Random (with dropdown)
2. Undo
3. Redo
--- separator ---
4. Save/Favorites
5. Export (primary)
6. Copy (desktop only)
7. Overflow menu (⋯)
--- mint separator (existing) ---
8. Free/Paid toggle (conditional)
9. Price display (conditional)
10. Mint button (primary)
11. Supply counter (conditional)
```

---

## Mobile Adjustments

On mobile, the action bar already hides Copy. The overflow menu works the same way. No additional mobile changes needed — the bar is now 3 buttons lighter.

If the bar still feels tight on mobile, consider hiding the separator dividers on mobile with a responsive class, but this is optional.

---

## Verification

```bash
# ActionBar still imports all needed icons
grep -n "MoreHorizontal" src/components/generator/ActionBar.tsx
# Expected: in the import + in the JSX

# Old standalone buttons are gone
grep -n "content=\"Leaderboard\"" src/components/generator/ActionBar.tsx
# Expected: ZERO results (it's now inside overflow menu text, not a tooltip)

grep -c "ActionBarTooltip" src/components/generator/ActionBar.tsx
# Expected: should be 3 fewer than before (was ~8-9, now ~5-6)

# Build passes
npm run typecheck && npm run build
```

---

## What NOT to Change

- **Do NOT change** the glass-morphism container styling (background, backdrop-filter, border)
- **Do NOT change** the ActionButton component itself (styling, sizing, animations)
- **Do NOT change** the Random dropdown behavior
- **Do NOT change** the Mint section layout or logic
- **Do NOT remove** any functionality — everything is preserved, just reorganized
- **Do NOT add** new CSS files — all styling is inline or uses existing theme classes
