# Wojak.ink Game Development Prompts

## Overview
This folder contains **9 production-ready prompts** for Claude Code to build games for wojak.ink. Each prompt includes complete specifications, code examples, and follows the "extreme effects" philosophy.

---

## Games List

| # | Game | File | Complexity | Rendering |
|---|------|------|------------|-----------|
| 1 | **2048 Merge** | `01-2048-merge-game.md` | Easy | DOM/CSS |
| 2 | **Block Puzzle** | `02-block-puzzle-game.md` | Medium | DOM/CSS |
| 3 | **Flappy Orange** | `03-flappy-orange-game.md` | Medium | Canvas |
| 4 | **Citrus Drop (Suika)** | `04-citrus-drop-suika-game.md` | Hard | Canvas + Matter.js |
| 5 | **Orange Snake.io** | `05-snake-io-game.md` | Medium | Canvas |
| 6 | **Color Reaction** | `06-color-reaction-game.md` | Easy | DOM/CSS |
| 7 | **Orange Wordle** | `07-wordle-game.md` | Easy | DOM/CSS |
| 8 | **Brick Breaker** | `08-brick-breaker-game.md` | Medium | Canvas |
| 9 | **Wojak Whack** | `09-whack-a-mole-game.md` | Easy | DOM/CSS |

---

## Recommended Build Order

### Phase 1: Easiest (DOM/CSS only)
1. **Color Reaction** - Simplest logic, great for testing effects system
2. **Wojak Whack** - Simple timing game, fun effects
3. **2048 Merge** - Classic puzzle, swipe detection practice
4. **Orange Wordle** - Pure logic game with animations

### Phase 2: Medium (Canvas basics)
5. **Block Puzzle** - Drag-and-drop mechanics
6. **Orange Snake.io** - Continuous movement, AI snakes

### Phase 3: Advanced (Canvas + Physics)
7. **Flappy Orange** - Physics-based tap game
8. **Brick Breaker** - Ball physics, collision detection
9. **Citrus Drop (Suika)** - Requires Matter.js physics library

---

## Tech Stack Summary

All games use:
- **React + TypeScript + Ionic Framework**
- **useGameSounds()** hook for audio
- **useLeaderboard('game-id')** hook for scores
- **useIsMobile()** hook for responsive design
- **CSS animations** for visual effects

Physics games additionally need:
- **Matter.js** (`npm install matter-js @types/matter-js`)

---

## File Structure Pattern

For each new game:
```
src/pages/
├── GameName.tsx           # Main component
├── GameName.css           # Styles + effects

src/components/media/games/
├── GameModal.tsx          # Add lazy import

src/config/query/
├── queryKeys.ts           # Add to GameId type
```

---

## Effects System Recap

Every game follows the layered effects philosophy:

```typescript
onSuccess() {
  // PRIMARY: Core feedback
  showScorePopup(points);

  // SECONDARY: Enhancement
  triggerScreenShake();
  playSound('success');

  // TERTIARY: Flourish
  spawnFloatingEmojis();

  // ESCALATING: Based on performance
  if (combo >= threshold) {
    showEpicCallout('AMAZING!');
    triggerConfetti();
    flashVignette();
  }
}
```

### Combo Tiers (Consistent Across Games)
```typescript
const COMBO_TIERS = {
  2: { callout: null, effects: ['scorePopup'] },
  3: { callout: 'NICE!', effects: ['scorePopup', 'shake'] },
  5: { callout: 'GREAT!', effects: ['scorePopup', 'shake', 'emojis'] },
  10: { callout: 'AMAZING!', effects: ['all', 'slowMoTrigger'] },
  15: { callout: 'UNSTOPPABLE!', effects: ['all', 'confetti'] },
  20: { callout: 'LEGENDARY!', effects: ['all', 'lightning'] },
  25: { callout: 'GOD MODE!', effects: ['fullChaos'] }
};
```

---

## Leaderboard Integration Pattern

All games use the same hook:
```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('game-id');

// On game over:
if (isSignedIn) {
  await submitScore(score, level, {
    // Game-specific metadata
  });
}
```

### Game IDs to Add to `queryKeys.ts`:
```typescript
export type GameId =
  | 'orange-stack'
  | 'memory-match'
  | '2048-merge'
  | 'block-puzzle'
  | 'flappy-orange'
  | 'citrus-drop'
  | 'orange-snake'
  | 'color-reaction'
  | 'orange-wordle'
  | 'brick-breaker'
  | 'wojak-whack';
```

---

## Mobile-First Responsive Pattern

```typescript
const isMobile = useIsMobile();

const GAME_WIDTH = isMobile ? window.innerWidth : 650;
const GAME_HEIGHT = isMobile ? window.innerHeight - 105 : 500;
```

---

## How to Use These Prompts

1. **Copy the entire prompt** from the game's `.md` file
2. **Paste into Claude Code**
3. Claude Code will generate the complete game files
4. **Review and test** the generated code
5. Add any game-specific assets (images, sounds) as needed

---

## Notes

- All prompts are designed to work with the existing wojak.ink codebase
- Effects systems are compatible with existing OrangeStack patterns
- Sound hooks and leaderboard hooks are already available
- Mobile/desktop responsive patterns are consistent

---

**Good luck building!** 🎮🍊
