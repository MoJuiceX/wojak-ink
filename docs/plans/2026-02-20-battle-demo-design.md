# Battle Arena Demo — Design Doc

**Date:** 2026-02-20
**Status:** Approved
**Supersedes:** `docs/plans/2026-02-20-battle-coming-soon-spec.md` (do not implement that spec)

---

## Goal

When any user clicks the Battle tab, they immediately see the live arena demo auto-playing with real Wojak collection images, followed by a scrollable info section explaining what's coming. Real battling is not enabled — this is a teaser that builds anticipation.

---

## Layout (Approach A — Demo First, Info Below)

```
┌─────────────────────────────────────┐
│         BATTLE ARENA (demo)          │
│   [Fighter A]  VS  [Fighter B]       │
│   HP bars, damage numbers, effects   │
│   Auto-plays → loops automatically   │
└─────────────────────────────────────┘
│                                      │
│  Battle Arena  [Coming Soon]         │
│  "Pit your Wojak against others..."  │
│                                      │
│  ⚔️ Queue   🤖 Auto   🏆 Power  📈 ELO│
│  [card] [card] [card] [card]         │
│                                      │
│  The Type System  (paragraph)        │
│                                      │
│  ┌── Battles launch next week ──┐    │
│  │ Keep voting to build power   │    │
│  │ → Go vote                    │    │
│  └──────────────────────────────┘    │
```

---

## Section 1 — Demo Arena

### Gate Removal
The Farmers Plot holder gate is removed from the battle tab entirely. Anyone can see the demo — connected wallet or not.

### Auto-Play Behaviour
- Demo starts automatically when the battle tab is active (no "Watch Demo" button)
- When the battle ends: show a small "Replay ↺" button in the top-right corner of the arena
- After 3 seconds automatically restart — infinite loop
- No move buttons (autoPlay mode already exists in BattleView)

### Fighter Images
Use two real Wojak NFT editions from the BigPulp collection via `getNftImageUrl()`. Claude CLI picks the specific edition numbers by checking the BigPulp gallery API (`/api/gallery` or similar) for editions that are:
- Visually distinct from each other
- Different combat types (ideally a thematic matchup like FIRE vs WATER or VENOM vs GRASS)
- Update `src/lib/combat/demo-battle.ts` with chosen edition numbers

### What Stays the Same
- All arena CSS (`battle-arena.css`) — no visual changes
- BattleView component — no changes
- The 7-turn scripted battle data structure — only edition numbers change
- All animations: HP bars, damage numbers, shake, callouts, type flash

---

## Section 2 — Info Below Arena

### Component
New component: `src/components/combat/BattleTeaser.tsx`
Used inline in FightClub battle tab, below the demo.

### Subsection 1 — Header
```tsx
<h2>Battle Arena <span className="badge badge-cyan">Coming Soon</span></h2>
<p className="text-secondary">
  Pit your Wojak against others in turn-based combat. The strongest survive.
</p>
```

### Subsection 2 — How It Works (4 cards)
Responsive grid: 4 columns desktop → 2×2 tablet → single column mobile.

| Icon | Title | Body |
|------|-------|------|
| ⚔️ | Queue your Wojak | Enter the battle queue and get matched by ELO rating |
| 🤖 | Auto-resolved | The server plays both sides — check back for your results |
| 🏆 | Earn battle power | Wins add to your power score and push you up the leaderboard |
| 📈 | Climb ELO | Your rating rises and falls with every result |

Each card: `card-static p-4`, icon at top, bold title, muted body text.

### Subsection 3 — The Type System
```
Every Wojak has a combat type — FIRE, WATER, VENOM, DRAGON, GRASS, and more —
determined by the traits you chose in the generator. Type matchups matter:
FIRE hits hard against GRASS, but falls to WATER. Your type is baked into
your NFT on-chain. Choose wisely when you mint.
```
Styled as plain body text, `text-secondary`, max-width ~600px centred.

### Subsection 4 — Launch Callout
`card-static` with left orange border accent (use `border-left: 3px solid var(--color-primary)`):
```
Battles launch next week.
Keep voting now to build your power score before the arena opens.
[→ Go vote]  ← links to /fight-club/vote tab
```

---

## Responsive Behaviour

| Breakpoint | Arena | Feature Cards |
|-----------|-------|---------------|
| Desktop (>768px) | Full width, max 900px centred | 4 columns |
| Tablet (480–768px) | Full width | 2×2 grid |
| Mobile (<480px) | Full width, arena CSS already handles | 1 column |

---

## CSS Rules

- No new CSS files — all layout via Tailwind, all visuals via existing `battle-arena.css` + `theme.css`
- The launch callout border: inline style `borderLeft: '3px solid var(--color-primary)'` (one-off, acceptable)
- No `!important`

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/FightClub.tsx` | Remove holder gate from battle tab; replace old battle content with DemoBattle + BattleTeaser |
| `src/components/combat/DemoBattle.tsx` | Remove teaser card wrapper; auto-play on mount; auto-restart loop |
| `src/lib/combat/demo-battle.ts` | Update edition numbers to real collection Wojaks |
| `src/components/combat/BattleTeaser.tsx` | New component — info section |

---

## Out of Scope

- Real battling, queuing, matchmaking — next week
- BattleFeed (recent battles) — no real battles to show yet, omit
- CombatArena component — untouched
- Any changes to BattleView, battle-arena.css, or combat logic
- Sound effects (leave as-is)
