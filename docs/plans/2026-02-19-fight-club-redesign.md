# Fight Club UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Vote the default Fight Club tab, remove hero banner, convert Guide to modal overlay.

**Architecture:** In-place refactor of FightClub.tsx. Create new FightClubGuideModal component reusing HowItWorks content. Update routing to default to /vote and redirect /guide.

**Tech Stack:** React, React Router, Framer Motion (for modal animation), TypeScript

---

### Task 1: Reorder Tabs and Change Default

**Files:**
- Modify: `src/pages/FightClub.tsx:315-329`

**Step 1: Update TABS array order**

Change the TABS constant from Battle-first to Vote-first:

```typescript
const TABS: Tab[] = [
  { id: 'vote', label: 'Vote', path: '/fight-club/vote' },
  { id: 'battle', label: 'Battle', path: '/fight-club/battle' },
  { id: 'rankings', label: 'Rankings', path: '/fight-club/rankings' },
  { id: 'burn', label: 'Burn', path: '/fight-club/burn' },
];
```

**Step 2: Update getActiveTab default**

Change the default return from 'battle' to 'vote':

```typescript
function getActiveTab(pathname: string): TabId {
  if (pathname.includes('/vote')) return 'vote';
  if (pathname.includes('/battle')) return 'battle';
  if (pathname.includes('/rankings')) return 'rankings';
  if (pathname.includes('/burn')) return 'burn';
  // Default to vote for /fight-club
  return 'vote';
}
```

**Step 3: Verify in browser**

Navigate to `http://localhost:5174/fight-club`
Expected: Vote tab is active and voting UI loads

**Step 4: Commit**

```bash
git add src/pages/FightClub.tsx
git commit -m "feat(fight-club): make Vote the default tab"
```

---

### Task 2: Remove Hero Section

**Files:**
- Modify: `src/pages/FightClub.tsx`

**Step 1: Remove FightClubHero import**

Delete this line from imports:

```typescript
// DELETE: import { FightClubHero } from '@/components/combat/FightClubHero';
```

**Step 2: Remove FightClubHero usage from main component**

In the return statement of FightClub component, delete the FightClubHero JSX:

```typescript
// DELETE these lines:
{/* Hero Section — always visible */}
<FightClubHero
  isHolder={!!accessData?.hasAccess}
  hasWojaks={(accessData?.wojakCount ?? 0) > 0}
/>
```

**Step 3: Remove FightClubHero from ConnectWalletPrompt**

Delete the FightClubHero from ConnectWalletPrompt function.

**Step 4: Remove FightClubHero from FightClubGate**

Delete the FightClubHero from FightClubGate function.

**Step 5: Verify in browser**

Navigate to `http://localhost:5174/fight-club`
Expected: No hero banner, just tabs and content

**Step 6: Commit**

```bash
git add src/pages/FightClub.tsx
git commit -m "feat(fight-club): remove hero section for cleaner layout"
```

---

### Task 3: Add Minimal Title Bar

**Files:**
- Modify: `src/pages/FightClub.tsx`

**Step 1: Add title bar before tab bar**

Add this JSX right after the opening `<div>` with contentPadding:

```tsx
{/* Minimal Title Bar */}
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <Swords size={20} className="text-primary" />
    <h1 className="text-lg font-bold">Fight Club</h1>
  </div>
  <div className="flex items-center gap-2">
    <button
      type="button"
      className="btn btn-ghost text-xs flex items-center gap-1"
      style={{ padding: '6px 10px', minWidth: 'auto' }}
      onClick={() => setGuideOpen(true)}
    >
      <Info size={14} />
      Guide
    </button>
    {playerDid && <RefreshButton did={playerDid} />}
  </div>
</div>
```

**Step 2: Add guide modal state**

Add state at top of FightClub component:

```typescript
const [guideOpen, setGuideOpen] = useState(false);
```

**Step 3: Remove Guide link from tab bar area**

Delete the existing Guide link that was next to tabs.

**Step 4: Verify in browser**

Expected: Clean title bar with "Fight Club" left, Guide + Refresh buttons right

**Step 5: Commit**

```bash
git add src/pages/FightClub.tsx
git commit -m "feat(fight-club): add minimal title bar"
```

---

### Task 4: Create Guide Modal Component

**Files:**
- Create: `src/components/combat/FightClubGuideModal.tsx`

**Step 1: Create the modal component**

```tsx
/**
 * FightClubGuideModal - Combat guide as modal overlay
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Zap, Shield, Sparkles } from 'lucide-react';
import { COMBAT_TYPES } from '@/lib/combat/types';
import { TYPE_COLORS, DARK_TEXT_TYPES } from '@/lib/combat/data/type-colors';

interface FightClubGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FightClubGuideModal({ isOpen, onClose }: FightClubGuideModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between p-4 border-b"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <Swords size={20} className="text-primary" />
                <h2 className="text-lg font-bold">Combat Guide</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-4">
              {/* Combat Types */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap size={16} className="text-primary" />
                  18 Combat Types
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COMBAT_TYPES.map((type) => (
                    <div
                      key={type}
                      className="text-center p-2 rounded-lg text-xs font-medium"
                      style={{
                        background: TYPE_COLORS[type],
                        color: DARK_TEXT_TYPES.has(type) ? '#000' : '#fff',
                      }}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Tips */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-cyan" />
                  Quick Tips
                </h3>
                <ul className="text-sm text-secondary space-y-2">
                  <li>• Type matchups deal 2x or 0.5x damage</li>
                  <li>• Natures boost one stat +10%, reduce another -10%</li>
                  <li>• Abilities provide passive bonuses in battle</li>
                  <li>• Power increases with wins and votes received</li>
                </ul>
              </section>

              {/* How to Play */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-gold" />
                  How to Play
                </h3>
                <div className="text-sm text-secondary space-y-2">
                  <p><strong>Vote:</strong> Rate Wojaks to earn points and shape rankings. No NFT required.</p>
                  <p><strong>Battle:</strong> Turn-based combat using your minted Wojaks. Wins earn Power.</p>
                  <p><strong>Rankings:</strong> See top fighters by Power level.</p>
                  <p><strong>Burn:</strong> Sacrifice Wojaks to boost others or earn rewards.</p>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Verify file created**

```bash
ls -la src/components/combat/FightClubGuideModal.tsx
```

**Step 3: Commit**

```bash
git add src/components/combat/FightClubGuideModal.tsx
git commit -m "feat(fight-club): create guide modal component"
```

---

### Task 5: Wire Up Guide Modal

**Files:**
- Modify: `src/pages/FightClub.tsx`

**Step 1: Import the modal**

Add import at top:

```typescript
import { FightClubGuideModal } from '@/components/combat/FightClubGuideModal';
```

**Step 2: Add modal to JSX**

Add at end of component return, before closing `</PageTransition>`:

```tsx
{/* Guide Modal */}
<FightClubGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
```

**Step 3: Verify in browser**

Click Guide button - modal should open
Click X, backdrop, or press Escape - modal should close

**Step 4: Commit**

```bash
git add src/pages/FightClub.tsx
git commit -m "feat(fight-club): wire up guide modal"
```

---

### Task 6: Update Route Redirect

**Files:**
- Modify: `src/App.tsx`

**Step 1: Change /fight-club/guide route to redirect**

Find the route for `fight-club/guide` and change it to redirect:

```tsx
<Route
  path="fight-club/guide"
  element={<Navigate to="/fight-club" replace />}
/>
```

**Step 2: Remove HowItWorks import if no longer used elsewhere**

Check if HowItWorks is used anywhere else. If not, remove the lazy import.

**Step 3: Verify in browser**

Navigate to `http://localhost:5174/fight-club/guide`
Expected: Redirects to `/fight-club`

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(fight-club): redirect /guide route to main page"
```

---

### Task 7: Cleanup

**Files:**
- Optional delete: `src/components/combat/FightClubHero.tsx`

**Step 1: Check if FightClubHero is used anywhere**

```bash
grep -r "FightClubHero" src/
```

**Step 2: If not used, delete the file**

```bash
rm src/components/combat/FightClubHero.tsx
```

**Step 3: Final verification**

- Navigate to `/fight-club` - Vote tab active, no hero
- Click Guide - modal opens
- Navigate tabs - all work correctly
- No console errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(fight-club): cleanup unused hero component"
```

---

## Summary

After completing all tasks:
- Vote is the default tab (open to everyone)
- Hero section removed
- Minimal title bar with Guide button
- Guide opens as modal overlay
- `/fight-club/guide` redirects to main page
