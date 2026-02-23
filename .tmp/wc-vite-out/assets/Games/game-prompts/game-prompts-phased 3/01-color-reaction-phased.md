# Color Reaction Game - Phased Build

## Game Overview
A color matching reaction/reflex game. Players tap when their indicator color matches the target color. Score based on reaction time. 3 misses = game over.

**Estimated Time:** 30-45 minutes
**Complexity:** Easy (DOM/CSS only)
**Dependencies:** Howler.js (audio)

---

# ═══════════════════════════════════════════════════════════════
# PHASE 1: Component Structure & Basic State
# ═══════════════════════════════════════════════════════════════

## Copy this prompt to Claude Code:

```
Create a Color Reaction game for wojak.ink.

## TECH CONTEXT
- Framework: React + TypeScript + Ionic Framework
- File to create: src/pages/ColorReaction.tsx
- CSS file to create: src/pages/ColorReaction.css
- This is a DOM/CSS game (no Canvas)

## PHASE 1 TASK: Basic Component Structure

Create the component shell with:

### 1. Game State Interface
```typescript
interface GameState {
  status: 'idle' | 'playing' | 'gameover';
  targetColor: number;      // Index 0-3
  playerColor: number;      // Index 0-3
  score: number;
  streak: number;
  misses: number;           // 3 = game over
  bestReactionTime: number; // Track best time in ms
  roundStartTime: number | null;
  isMatchWindow: boolean;   // True when colors match
}
```

### 2. Color Definitions
```typescript
const COLORS = [
  { name: 'orange', hex: '#FF6B00', emoji: '🍊' },
  { name: 'lime',   hex: '#32CD32', emoji: '🍋' },
  { name: 'grape',  hex: '#8B5CF6', emoji: '🍇' },
  { name: 'berry',  hex: '#3B82F6', emoji: '🫐' },
];
```

### 3. Basic JSX Structure
```tsx
<IonPage>
  <IonContent>
    <div className="color-reaction-container">
      {/* Stats Panel: Score, Streak, Lives (3 hearts) */}

      {/* Target Color Display - large circle with emoji */}

      {/* Player Color Display - large circle with emoji */}

      {/* Tap instruction text */}

      {/* Game Over overlay (conditional) */}
    </div>
  </IonContent>
</IonPage>
```

### 4. Basic CSS
- Dark gradient background (#1a1a2e to #16213e)
- Color displays: 150px circles with the color as background
- Centered layout, flexbox column
- Mobile responsive (full width on mobile)

### 5. Hooks to import (stubs for now)
```typescript
import { useIsMobile } from '@/hooks/useIsMobile';
// We'll add sound and leaderboard in Phase 5
```

DO NOT implement game logic yet - just the visual structure and state.
Output the complete .tsx and .css files.
```

---

## ✅ PHASE 1 CHECKPOINT

After Claude generates the code, verify:

| Check | Status |
|-------|--------|
| Component renders without errors? | ☐ |
| Can see two colored circles (target & player)? | ☐ |
| Stats panel shows Score, Streak, Lives? | ☐ |
| Colors display correctly from COLORS array? | ☐ |
| Layout looks good on mobile (use dev tools)? | ☐ |

**All checks pass?** → Continue to Phase 2
**Something broken?** → Use Debug Prompt below

---

## 🐛 PHASE 1 DEBUG PROMPT

```
The Color Reaction component has issues:

[DESCRIBE THE SPECIFIC PROBLEM]

Current code structure:
- ColorReaction.tsx with GameState interface
- ColorReaction.css with basic styling
- Should show two colored circles and stats panel

Fix the issue. Show only the changed parts of the code.
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 2: Core Game Logic
# ═══════════════════════════════════════════════════════════════

## Copy this prompt to Claude Code:

```
Continue building the Color Reaction game. Phase 1 (structure) is complete.

## PHASE 2 TASK: Core Game Logic

Add the game mechanics:

### 1. Start Game Function
```typescript
const startGame = () => {
  // Reset all state
  // Set status to 'playing'
  // Start the first round
};
```

### 2. Round Management
```typescript
// Random delay before target color changes: 800-2500ms
const startNewRound = () => {
  // Clear existing timers
  // After random delay (800-2500ms):
  //   - Change target color (50% chance to match player color)
  //   - Set roundStartTime = performance.now()
  //   - If colors match, set isMatchWindow = true
  //   - If match, start a 1500ms timeout for miss detection
  //   - If no match, immediately start next round
};
```

### 3. Miss Detection
```typescript
// If player doesn't tap during match window within 1500ms
const handleMiss = () => {
  // Increment misses
  // Reset streak to 0
  // If misses >= 3, trigger game over
  // Otherwise, start new round
};
```

### 4. Score Calculation
```typescript
const calculateScore = (reactionTimeMs: number): { points: number; rating: string } => {
  if (reactionTimeMs < 200) return { points: 100, rating: 'PERFECT' };
  if (reactionTimeMs < 300) return { points: 75, rating: 'GREAT' };
  if (reactionTimeMs < 400) return { points: 50, rating: 'GOOD' };
  if (reactionTimeMs < 600) return { points: 25, rating: 'OK' };
  return { points: 10, rating: 'SLOW' };
};
```

### 5. Timer Refs
```typescript
const roundTimeoutRef = useRef<NodeJS.Timeout>();
const matchTimeoutRef = useRef<NodeJS.Timeout>();

// Clean up in useEffect return
```

### 6. Idle Screen
- Show "TAP TO START" when status is 'idle'
- Tapping anywhere calls startGame()

DO NOT implement tap handling or effects yet - just the timing logic.
Test by adding console.log statements to verify rounds cycle.
```

---

## ✅ PHASE 2 CHECKPOINT

| Check | Status |
|-------|--------|
| Tapping "Start" begins the game? | ☐ |
| Target color changes after random delay? | ☐ |
| Console shows rounds cycling? | ☐ |
| Miss timeout triggers after 1500ms on match? | ☐ |
| Game over triggers after 3 misses? | ☐ |

**All checks pass?** → Continue to Phase 3
**Something broken?** → Use Debug Prompt below

---

## 🐛 PHASE 2 DEBUG PROMPT

```
The Color Reaction game logic has issues:

[DESCRIBE THE SPECIFIC PROBLEM - e.g., "rounds not cycling", "miss detection not working"]

The game should:
1. Start when tapped
2. Change target color after random 800-2500ms delay
3. 50% chance target matches player color
4. If match, player has 1500ms to tap
5. If no tap in 1500ms, count as miss
6. 3 misses = game over

Add console.log statements to debug the timing flow.
Fix the issue and show the corrected code.
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 3: Tap Handling & Feedback
# ═══════════════════════════════════════════════════════════════

## Copy this prompt to Claude Code:

```
Continue building the Color Reaction game. Phase 2 (game logic) is complete.

## PHASE 3 TASK: Tap Handling & Visual Feedback

### 1. Tap Handler
```typescript
const handleTap = () => {
  if (gameState.status !== 'playing') return;
  if (gameState.revealingRow !== null) return; // Block during animation

  // Clear match timeout (player tapped, no miss)
  if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);

  if (gameState.targetColor === gameState.playerColor && gameState.isMatchWindow) {
    // CORRECT TAP
    const reactionTime = performance.now() - gameState.roundStartTime!;
    const { points, rating } = calculateScore(reactionTime);

    // Update score, streak, best reaction time
    // Show feedback
    // Generate new player color
    // Start next round
  } else {
    // WRONG TAP
    // -50 points (min 0)
    // Reset streak
    // Increment misses
    // Check for game over
  }
};
```

### 2. Feedback State
```typescript
const [feedback, setFeedback] = useState<{
  type: 'correct' | 'wrong' | 'miss' | null;
  text: string;
  reactionTime?: number;
}>({ type: null, text: '' });
```

### 3. Feedback Display
- Overlay in center of screen
- Correct: Green text, show rating + reaction time in ms
- Wrong: Red text, "WRONG!"
- Miss: Red text, "MISSED!"
- Auto-hide after 800ms

### 4. Touch/Click Handling
```tsx
<div
  className="color-reaction-container"
  onClick={handleTap}
  onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
  style={{ touchAction: 'none' }}
>
```

### 5. Match Window Visual Indicator
- When isMatchWindow is true, player display should pulse/glow
- Add CSS class 'matching' that triggers animation

### 6. CSS Animations
```css
/* Pulse when colors match */
@keyframes pulse-match {
  0%, 100% { transform: scale(1); box-shadow: 0 0 20px currentColor; }
  50% { transform: scale(1.1); box-shadow: 0 0 40px currentColor; }
}

.player-display.matching {
  animation: pulse-match 0.5s ease-in-out infinite;
}

/* Feedback popup */
@keyframes feedback-pop {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  50% { transform: translate(-50%, -50%) scale(1.2); }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
```

The game should now be playable! Tap when colors match, see feedback.
```

---

## ✅ PHASE 3 CHECKPOINT

| Check | Status |
|-------|--------|
| Tapping during match = correct + points? | ☐ |
| Tapping wrong time = wrong + penalty? | ☐ |
| Feedback text shows (PERFECT/GREAT/etc)? | ☐ |
| Reaction time displays in ms? | ☐ |
| Player display pulses when matching? | ☐ |
| Feedback auto-hides after 800ms? | ☐ |
| Streak increments on correct taps? | ☐ |

**All checks pass?** → Continue to Phase 4
**Something broken?** → Use Debug Prompt below

---

## 🐛 PHASE 3 DEBUG PROMPT

```
The Color Reaction tap handling has issues:

[DESCRIBE THE SPECIFIC PROBLEM - e.g., "tap not registering", "feedback not showing"]

Expected behavior:
1. Tap during match window = correct, show rating, add points
2. Tap outside match window = wrong, -50 points
3. Feedback overlay appears centered, auto-hides
4. Player display pulses when isMatchWindow is true
5. Reaction time measured with performance.now()

Check that:
- onClick and onTouchStart are both on the container
- feedback state is being set and cleared correctly
- CSS animation classes are applied correctly

Fix the issue.
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 4: Effects & Polish
# ═══════════════════════════════════════════════════════════════

## Copy this prompt to Claude Code:

```
Continue building the Color Reaction game. Phase 3 (tap handling) is complete.

## PHASE 4 TASK: Extreme Effects & Polish

Implement the "every action feels powerful" philosophy.

### 1. Screen Shake
```typescript
const [screenShake, setScreenShake] = useState(false);

const triggerScreenShake = () => {
  setScreenShake(true);
  setTimeout(() => setScreenShake(false), 300);
};
```

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.color-reaction-container.shaking {
  animation: shake 0.3s ease-in-out;
}
```

### 2. Epic Callouts
```typescript
const [epicCallout, setEpicCallout] = useState<string | null>(null);

const showEpicCallout = (text: string) => {
  setEpicCallout(text);
  setTimeout(() => setEpicCallout(null), 1500);
};
```

Large, bold text that scales up then fades. Center of screen, above feedback.

### 3. Floating Emojis
```typescript
const [floatingEmojis, setFloatingEmojis] = useState<{id: string, emoji: string, x: number}[]>([]);

const spawnFloatingEmojis = (emojis: string[]) => {
  const newEmojis = emojis.map((emoji, i) => ({
    id: `${Date.now()}-${i}`,
    emoji,
    x: 30 + Math.random() * 40, // 30-70% from left
  }));
  setFloatingEmojis(prev => [...prev, ...newEmojis]);
  setTimeout(() => {
    setFloatingEmojis(prev => prev.filter(e => !newEmojis.find(n => n.id === e.id)));
  }, 2000);
};
```

### 4. Confetti Explosion
Simple CSS confetti - 30 small colored squares that scatter and fade.

### 5. Effect Triggers (in handleTap for correct):
```typescript
const onCorrectTap = (rating: string, streak: number, reactionTime: number) => {
  // Always
  // playBlockLand(); // Phase 5

  // Based on rating
  if (rating === 'PERFECT') {
    triggerScreenShake();
    spawnFloatingEmojis(['⚡', '🔥']);
    showEpicCallout('PERFECT!');
  } else if (rating === 'GREAT') {
    spawnFloatingEmojis(['✨']);
  }

  // Based on streak
  if (streak === 5) showEpicCallout('5 STREAK!');
  if (streak === 10) {
    showEpicCallout('🔥 10 STREAK! 🔥');
    triggerConfetti();
  }
  if (streak === 20) {
    showEpicCallout('⚡ UNSTOPPABLE! ⚡');
    triggerConfetti();
  }

  // Super fast reaction
  if (reactionTime < 150) {
    showEpicCallout('LIGHTNING FAST!');
  }
};
```

### 6. Wrong Tap Effects
```typescript
// On wrong tap:
triggerScreenShake();
// Red vignette flash (optional)
```

### 7. Time Warning (in timer useEffect)
When timeLeft hits 10 seconds or game reaches high intensity, add visual feedback.

Make the game FEEL exciting! Every correct tap should be celebrated.
```

---

## ✅ PHASE 4 CHECKPOINT

| Check | Status |
|-------|--------|
| Screen shakes on PERFECT and wrong taps? | ☐ |
| Epic callouts appear for ratings/streaks? | ☐ |
| Floating emojis spawn and animate up? | ☐ |
| Confetti triggers at streak milestones? | ☐ |
| "LIGHTNING FAST!" shows for <150ms reactions? | ☐ |
| Effects don't break the game flow? | ☐ |
| Multiple effects can happen simultaneously? | ☐ |

**All checks pass?** → Continue to Phase 5
**Something broken?** → Use Debug Prompt below

---

## 🐛 PHASE 4 DEBUG PROMPT

```
The Color Reaction effects have issues:

[DESCRIBE THE SPECIFIC PROBLEM - e.g., "confetti not showing", "emojis stuck on screen"]

Expected effects system:
1. Screen shake: CSS animation on container, 300ms duration
2. Epic callouts: Large centered text, 1500ms visible
3. Floating emojis: Spawn at random X, float up, fade out in 2s
4. Confetti: 30 particles scatter and fade

Check that:
- State updates trigger re-renders
- setTimeout cleanup happens correctly
- CSS animations have correct keyframes
- Multiple effects can coexist (don't override each other)

Fix the issue.
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 5: Integration (Sound, Leaderboard, Mobile)
# ═══════════════════════════════════════════════════════════════

## Copy this prompt to Claude Code:

```
Continue building the Color Reaction game. Phase 4 (effects) is complete.

## PHASE 5 TASK: Final Integration

### 1. Howler.js Sound Integration
```typescript
import { useHowlerSounds } from '@/hooks/useHowlerSounds';

// In component:
const {
  playBlockLand,
  playPerfectBonus,
  playCombo,
  playWinSound,
  playGameOver,
} = useHowlerSounds();

// Add to onCorrectTap:
playBlockLand(); // Every correct tap
if (rating === 'PERFECT') playPerfectBonus();
if (streak % 5 === 0 && streak > 0) playCombo();

// Add to wrong tap:
playBlockLand(); // Different pitch or use playGameOver for error sound

// Add to handleGameOver:
playGameOver();
```

### 2. Mute Button
Add a mute toggle in the top-left corner:
```tsx
const [isMuted, setIsMuted] = useState(false);

<button
  className="mute-button"
  onClick={() => {
    setIsMuted(!isMuted);
    setMuted(!isMuted); // from useHowlerSounds
  }}
>
  {isMuted ? '🔇' : '🔊'}
</button>
```

### 3. Leaderboard Integration
```typescript
import { useLeaderboard } from '@/hooks/useLeaderboard';

const { submitScore, isSignedIn } = useLeaderboard('color-reaction');

// Track max streak during game
const maxStreakRef = useRef(0);
useEffect(() => {
  if (gameState.streak > maxStreakRef.current) {
    maxStreakRef.current = gameState.streak;
  }
}, [gameState.streak]);

// In handleGameOver:
const handleGameOver = async () => {
  setGameState(prev => ({ ...prev, status: 'gameover' }));
  playGameOver();

  if (isSignedIn) {
    await submitScore(gameState.score, null, {
      bestReactionTime: Math.round(gameState.bestReactionTime),
      maxStreak: maxStreakRef.current,
    });
  }
};
```

### 4. Game Over Screen
```tsx
{gameState.status === 'gameover' && (
  <div className="gameover-overlay">
    <h2>GAME OVER</h2>
    <div className="final-score">{gameState.score}</div>
    <div className="stats">
      <div>Best Time: {Math.round(gameState.bestReactionTime)}ms</div>
      <div>Max Streak: {maxStreakRef.current}</div>
    </div>
    {!isSignedIn && (
      <p className="sign-in-prompt">Sign in to save your score!</p>
    )}
    <button onClick={startGame}>Play Again</button>
  </div>
)}
```

### 5. Mobile Optimization
```typescript
const isMobile = useIsMobile();

// Larger touch targets on mobile
const displaySize = isMobile ? 180 : 150;

// Prevent scrolling
style={{ touchAction: 'none' }}

// Full-screen layout on mobile
className={`color-reaction-container ${isMobile ? 'mobile' : 'desktop'}`}
```

### 6. Add to GameModal.tsx
```typescript
// In src/components/media/games/GameModal.tsx
const ColorReaction = lazy(() => import('@/pages/ColorReaction'));

// In GAME_COMPONENTS:
'color-reaction': ColorReaction,
```

### 7. Final Polish
- Add haptic feedback on mobile (navigator.vibrate)
- Ensure all timers are cleared on unmount
- Test landscape and portrait orientations

The game should now be fully integrated and production-ready!
```

---

## ✅ PHASE 5 CHECKPOINT (FINAL)

| Check | Status |
|-------|--------|
| Sounds play on correct/wrong/gameover? | ☐ |
| Mute button toggles all audio? | ☐ |
| Score submits to leaderboard (if signed in)? | ☐ |
| Game over screen shows stats? | ☐ |
| "Play Again" restarts the game? | ☐ |
| Mobile layout is responsive? | ☐ |
| Touch controls work smoothly? | ☐ |
| No memory leaks (timers cleared)? | ☐ |
| Game appears in GameModal? | ☐ |

---

## 🐛 PHASE 5 DEBUG PROMPT

```
The Color Reaction integration has issues:

[DESCRIBE THE SPECIFIC PROBLEM - e.g., "sounds not playing", "leaderboard not submitting"]

Integration checklist:
1. useHowlerSounds hook imported and destructured
2. Sounds called at correct moments
3. useLeaderboard hook with 'color-reaction' game ID
4. submitScore called in handleGameOver
5. Mute state synced with Howler.mute()
6. Game added to GameModal lazy imports

Check browser console for errors. Fix the issue.
```

---

# ═══════════════════════════════════════════════════════════════
# FINAL TESTING CHECKLIST
# ═══════════════════════════════════════════════════════════════

## Complete Game Test

| Test | Pass |
|------|------|
| **Start Flow** | |
| Game shows idle screen with "Tap to Start" | ☐ |
| Tapping starts the game | ☐ |
| **Gameplay** | |
| Target color changes at random intervals | ☐ |
| Player display pulses when colors match | ☐ |
| Tapping during match = correct + points | ☐ |
| Tapping outside match = wrong + penalty | ☐ |
| Not tapping during match = miss | ☐ |
| 3 misses = game over | ☐ |
| **Scoring** | |
| Faster reaction = more points | ☐ |
| Streak increments on consecutive correct | ☐ |
| Streak resets on wrong/miss | ☐ |
| Score never goes below 0 | ☐ |
| **Effects** | |
| Feedback text shows rating | ☐ |
| Screen shakes on PERFECT/wrong | ☐ |
| Callouts appear at milestones | ☐ |
| Floating emojis animate correctly | ☐ |
| Confetti at streak 10, 20 | ☐ |
| **Audio** | |
| Sounds play on actions | ☐ |
| Mute button works | ☐ |
| **Game Over** | |
| Stats display correctly | ☐ |
| Leaderboard submission works | ☐ |
| Play Again restarts cleanly | ☐ |
| **Mobile** | |
| Touch controls responsive | ☐ |
| Layout fits screen | ☐ |
| No accidental scrolling | ☐ |

---

## 🔧 COMMON FIXES

### Sounds not playing on iOS
```typescript
// Add user interaction unlock
useEffect(() => {
  const unlock = () => {
    Howler.ctx?.resume();
    document.removeEventListener('touchstart', unlock);
  };
  document.addEventListener('touchstart', unlock);
  return () => document.removeEventListener('touchstart', unlock);
}, []);
```

### Timers not cleaning up
```typescript
useEffect(() => {
  return () => {
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
    if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
  };
}, []);
```

### Touch events firing twice
```typescript
onTouchStart={(e) => {
  e.preventDefault();
  e.stopPropagation();
  handleTap();
}}
onClick={(e) => {
  // Only fire if not touch device
  if (e.detail === 0) return; // Touch events have detail=0
  handleTap();
}}
```

---

## 🎉 DONE!

Color Reaction is complete. Move on to the next game: `02-2048-merge-phased.md`
