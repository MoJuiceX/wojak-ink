# Wojak.ink Game Development - Phased Prompts

## Overview
This folder contains **phased prompts** for building 9 games. Each game is broken into 4-5 digestible phases with checkpoint questions and debugging prompts.

---

## 🎮 Games & Build Order

### Tier 1: DOM/CSS Games (Easiest - Start Here)
| # | Game | File | Est. Time |
|---|------|------|-----------|
| 1 | Color Reaction | `01-color-reaction-phased.md` | 30-45 min |
| 2 | 2048 Merge | `02-2048-merge-phased.md` | 45-60 min |
| 3 | Orange Wordle | `03-wordle-phased.md` | 45-60 min |
| 4 | Wojak Whack | `04-whack-a-mole-phased.md` | 30-45 min |
| 5 | Block Puzzle | `05-block-puzzle-phased.md` | 60-90 min |

### Tier 2: Canvas Games (Medium)
| # | Game | File | Est. Time |
|---|------|------|-----------|
| 6 | Flappy Orange | `06-flappy-orange-phased.md` | 60-90 min |
| 7 | Orange Snake.io | `07-snake-io-phased.md` | 60-90 min |
| 8 | Brick Breaker | `08-brick-breaker-phased.md` | 60-90 min |

### Tier 3: Physics Games (Advanced)
| # | Game | File | Est. Time |
|---|------|------|-----------|
| 9 | Citrus Drop | `09-citrus-drop-phased.md` | 90-120 min |

---

## 📋 How to Use Each Phased Prompt

### Step 1: Setup
- Copy **PHASE 1** into Claude Code
- Wait for output
- Answer the **CHECKPOINT** questions

### Step 2: Iterate
- If checkpoint passes → Copy **PHASE 2**
- If checkpoint fails → Use the **DEBUG PROMPT**
- Repeat for all phases

### Step 3: Test
- After final phase, run through **FINAL TESTING CHECKLIST**
- Use **COMMON FIXES** section for any issues

---

## 🔧 One-Time Setup (Before Any Game)

### Install Howler.js (Audio Library)
```bash
npm install howler
npm install --save-dev @types/howler
```

### Create Audio Hook (One Time)
Create this file before building any game:

**File: `src/hooks/useHowlerSounds.ts`**
```typescript
import { Howl } from 'howler';
import { useCallback, useRef, useEffect } from 'react';

// Sound URLs - update paths to your actual sound files
const SOUNDS = {
  blockLand: '/assets/sounds/block-land.mp3',
  perfectBonus: '/assets/sounds/perfect-bonus.mp3',
  combo: '/assets/sounds/combo.mp3',
  win: '/assets/sounds/win.mp3',
  gameOver: '/assets/sounds/game-over.mp3',
  click: '/assets/sounds/click.mp3',
};

export const useHowlerSounds = () => {
  const soundsRef = useRef<Record<string, Howl>>({});
  const isMutedRef = useRef(false);

  // Initialize sounds on mount
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, src]) => {
      soundsRef.current[key] = new Howl({
        src: [src],
        volume: 0.5,
        preload: true,
      });
    });

    return () => {
      // Cleanup
      Object.values(soundsRef.current).forEach(sound => sound.unload());
    };
  }, []);

  const playSound = useCallback((soundName: keyof typeof SOUNDS) => {
    if (isMutedRef.current) return;
    soundsRef.current[soundName]?.play();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    Howler.mute(muted);
  }, []);

  return {
    playBlockLand: () => playSound('blockLand'),
    playPerfectBonus: () => playSound('perfectBonus'),
    playCombo: () => playSound('combo'),
    playWinSound: () => playSound('win'),
    playGameOver: () => playSound('gameOver'),
    playClick: () => playSound('click'),
    setMuted,
    isMuted: () => isMutedRef.current,
  };
};
```

### Add Game IDs to QueryKeys
**File: `src/config/query/queryKeys.ts`**
Add these to your `GameId` type:
```typescript
export type GameId =
  | 'orange-stack'
  | 'memory-match'
  | 'color-reaction'
  | '2048-merge'
  | 'orange-wordle'
  | 'wojak-whack'
  | 'block-puzzle'
  | 'flappy-orange'
  | 'orange-snake'
  | 'brick-breaker'
  | 'citrus-drop';
```

---

## 🎨 Shared Effects System

All games use the same effects patterns. Here's a quick reference:

### Combo Tiers
```typescript
const COMBO_TIERS = {
  3: { callout: 'NICE!', effects: ['shake'] },
  5: { callout: 'GREAT!', effects: ['shake', 'emojis'] },
  10: { callout: 'AMAZING!', effects: ['confetti'] },
  15: { callout: 'UNSTOPPABLE!', effects: ['confetti', 'lightning'] },
  20: { callout: 'LEGENDARY!', effects: ['lightning', 'vignette'] },
  25: { callout: 'GOD MODE!', effects: ['fullChaos'] },
};
```

### Standard Effect Functions
Each game should implement these:
- `triggerScreenShake(intensity?: number)`
- `showScorePopup(text: string, x?: number, y?: number)`
- `showEpicCallout(text: string)`
- `spawnFloatingEmojis(emojis: string[])`
- `triggerConfetti()`
- `triggerLightning()`
- `flashVignette()`

---

## 📱 Mobile-First Dimensions

Standard sizing used across all games:
```typescript
const isMobile = useIsMobile();
const GAME_WIDTH = isMobile ? window.innerWidth : 650;
const GAME_HEIGHT = isMobile ? window.innerHeight - 105 : 500;
```

---

## ✅ Pre-Flight Checklist

Before starting any game, ensure:
- [ ] Howler.js installed
- [ ] `useHowlerSounds` hook created
- [ ] Game ID added to queryKeys.ts
- [ ] Sound files exist in `/public/assets/sounds/`
- [ ] `useLeaderboard` hook available
- [ ] `useIsMobile` hook available

---

## 🐛 Universal Debug Commands

If any phase fails, try these:

```
"The component won't compile. Show me the exact error and fix it."

"The game renders but [specific thing] doesn't work. Add console.log statements to debug."

"The mobile layout is broken. Make sure we're using isMobile correctly."

"The sounds aren't playing. Check the Howler initialization and file paths."

"The leaderboard isn't submitting. Verify the useLeaderboard hook integration."
```

---

Ready to build! Start with `01-color-reaction-phased.md` 🎮
