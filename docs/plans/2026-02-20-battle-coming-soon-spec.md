# SPEC: Battle Tab → Coming Soon

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Independent:** Yes — one file, no dependencies

---

## Goal

Replace the Battle tab content in FightClub with a "Coming Soon" card.
Battling is being launched next week. The tab stays visible and clickable,
but shows a holding screen instead of CombatArena / DemoBattle / BattleFeed.

---

## Context Files to Read First

1. `CLAUDE.md` (CSS rules — use card-static, theme classes, no inline colors)
2. `src/pages/FightClub.tsx` — read in full before touching

---

## File to Modify

**Only file:** `src/pages/FightClub.tsx`

---

## Change

Find this block (the battle tab content, starting around line 366):

```tsx
{activeTab === 'battle' && (
  <div className="flex flex-col gap-6">
    {/* Show mint banner only for holders with no wojaks */}
    {accessData?.hasAccess && accessData?.wojakCount === 0 && <MintFighterBanner />}

    {/* Arena section */}
    <GameErrorBoundary gameName="Combat Arena">
      <Suspense fallback={<GameLoading gameName="Combat Arena" />}>
        {/* Show full arena for holders with fighters, demo for everyone else */}
        {accessData?.hasAccess && accessData?.wojakCount > 0 ? (
          <CombatArena />
        ) : (
          <DemoBattle />
        )}
      </Suspense>
    </GameErrorBoundary>

    {/* Battle Feed - recent battles */}
    <div className="flex flex-col gap-3">
      <div className="battle-feed-header">
        <h3>Recent Battles</h3>
      </div>
      <Suspense fallback={<div className="text-muted text-sm">Loading battles...</div>}>
        <BattleFeed />
      </Suspense>
    </div>
  </div>
)}
```

Replace it with:

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

---

## Also Remove — Unused Lazy Imports

Since `DemoBattle` and `BattleFeed` are no longer rendered,
remove their lazy import lines (around lines 32–33):

```tsx
// Remove these two lines:
const DemoBattle = lazy(() => import('@/components/combat/DemoBattle').then(m => ({ default: m.DemoBattle })));
const BattleFeed = lazy(() => import('@/components/combat/BattleFeed').then(m => ({ default: m.BattleFeed })));
```

Also remove `CombatArena` lazy import if it is only used in the battle tab:
```tsx
// Check if CombatArena is used elsewhere — if not, remove:
// const CombatArena = lazy(() => import('@/components/combat/CombatArena'));
```

Also remove `MintFighterBanner` import if only used in the battle tab.

**Important:** Only remove imports that are exclusively used in the battle tab block.
If any of these components are imported elsewhere, leave the import in place.

---

## Constraints

- Modify ONLY `src/pages/FightClub.tsx`
- Do NOT change the Vote, Rankings, or Burn tabs
- Do NOT remove the Battle tab from the TABS array (keep it visible)
- Do NOT change the tab navigation or routing
- Use `card-static`, `badge badge-cyan`, `text-secondary`, `text-muted` from theme.css
- No inline colors — only CSS variables if needed
- No `!important`

---

## Success Criteria

- [ ] Build passes: `npm run build`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Battle tab shows "Coming Soon" card when clicked
- [ ] Vote, Rankings, Burn tabs unchanged and functional
- [ ] No unused import warnings from removed lazy imports
- [ ] Card uses only theme.css classes (card-static, badge-cyan, text-secondary, text-muted)

---

## Verification

```bash
# No leftover DemoBattle / BattleFeed references (if removed)
grep -n "DemoBattle\|BattleFeed" src/pages/FightClub.tsx
# Expected: no output (or only if kept intentionally)

# Battle tab still in TABS array
grep -n "'battle'" src/pages/FightClub.tsx
# Expected: still present in TABS

npm run build
npx tsc --noEmit
```

---

## Suggested Commit Message

```
feat(fight-club): replace battle tab with Coming Soon card

Battling launches next week. Battle tab remains visible but shows
a holding card with description and "Coming Soon" badge instead of
CombatArena / DemoBattle / BattleFeed. Vote, Rankings, Burn unchanged.
```

---

## Report Format When Done

```
DONE: Battle Tab Coming Soon
Files changed: src/pages/FightClub.tsx (only)
Build: PASS / FAIL
TypeScript: PASS / FAIL
Self-checks:
  - Battle tab shows Coming Soon card: PASS/FAIL
  - Other tabs unaffected: PASS/FAIL
  - Unused imports cleaned up: PASS/FAIL
Notes: [anything unexpected]
```
