# Premium Voting Animation Spec

**Goal:** Transform the current "glitchy" swipe voting experience into a premium, satisfying interaction that feels as polished as Tinder.

---

## Current Issues Identified

1. **Exit animation feels abrupt** - Using duration-based easing (0.26s) instead of spring physics
2. **No velocity-based exit** - Card doesn't inherit swipe momentum
3. **Opacity changes feel disconnected** - Glaze stays at 0.92, Fade drops to 0 (jarring)
4. **Missing micro-interactions:**
   - No scale feedback on drag start
   - No "snap back" spring when below threshold
   - No button reaction during swipe
5. **Haptic feedback is basic** - Single vibration patterns, not synchronized with animation peaks
6. **Exit overlay animation too fast** (0.2s) - Doesn't sync with card movement

---

## Premium Animation Improvements

### 1. Spring-Based Exit Animation (High Impact)

**Current:**
```tsx
const exitTransition = { duration: 0.26, ease: [0.22, 0.0, 0.15, 1] };
```

**Improved:**
```tsx
const exitTransition = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
  velocity: x.getVelocity() / 100, // Inherit swipe momentum
};
```

**Why:** Springs feel natural because they model real physics. The card should accelerate based on how hard the user swiped.

### 2. Velocity-Aware Exit Distance

**Current:** Fixed `exitX = 520px`

**Improved:**
```tsx
const velocity = x.getVelocity();
const exitX = exitDirection
  ? exitDirection * (400 + Math.min(Math.abs(velocity) * 0.3, 200))
  : (x.get() >= 0 ? 520 : -520);
```

**Why:** Fast swipes should fling the card further, creating satisfying "whoosh" feeling.

### 3. Card Scale on Drag Start

**Current:** No scale change on drag

**Improved:**
```tsx
// Add useTransform for drag scale
const dragScale = useTransform(
  x,
  [-200, -50, 0, 50, 200],
  [1.02, 1.01, 1, 1.01, 1.02]
);

// Apply to card
style={{ scale: isInteractive ? dragScale : undefined }}
```

**Why:** Subtle lift effect makes the card feel "picked up" by the user.

### 4. Elastic Snap-Back Below Threshold

**Current:** `dragElastic={0.7}` with hard constraint

**Improved:**
```tsx
dragElastic={0.85}
dragTransition={{
  bounceStiffness: 500,
  bounceDamping: 25
}}
```

**Why:** More elastic feel during drag, with satisfying bounce when released below threshold.

### 5. Synchronized Button Feedback

**Current:** Buttons don't react to swipe

**Improved:** Pass `dragProgress` (0-1) to VoteButtons:
```tsx
// In VotingFeed
const dragProgress = useMotionValue(0);

// Map x to progress in SwipeCard
useMotionValueEvent(x, 'change', (latest) => {
  const progress = Math.abs(latest) / SWIPE_THRESHOLD;
  onDragProgress?.(Math.min(progress, 1));
});

// In VoteButtons - scale buttons based on swipe direction
const likeScale = swipeProgress > 0 ? 1 + swipeProgress * 0.15 : 1;
const dislikeScale = swipeProgress < 0 ? 1 + Math.abs(swipeProgress) * 0.15 : 1;
```

**Why:** Creates visual connection between swipe gesture and action buttons.

### 6. Premium Exit Overlay Animation

**Current:**
```tsx
animate={{ opacity: [0, 0.5, 0] }}
transition={{ duration: 0.2, times: [0, 0.35, 1] }}
```

**Improved:**
```tsx
// Glaze: Green pulse that expands outward
animate={{
  opacity: [0, 0.6, 0.3],
  scale: [0.8, 1.1, 1.2],
}}
transition={{
  duration: 0.35,
  ease: [0.34, 1.56, 0.64, 1], // Overshoot easing
}}

// Fade: Dark vignette that contracts
animate={{
  opacity: [0, 0.7, 0.4],
  scale: [1.2, 1, 0.9],
}}
transition={{ duration: 0.3, ease: 'easeOut' }}
```

**Why:** Different animations for different actions reinforces the meaning of each vote.

### 7. Enhanced Haptic Patterns

**Current:**
```tsx
navigator.vibrate(voteType === 1 ? 12 : [8, 10, 8]);
```

**Improved:**
```tsx
const triggerHaptics = useCallback((voteType: 1 | -1, intensity: 'light' | 'medium' | 'strong') => {
  if (typeof navigator?.vibrate !== 'function') return;

  const patterns = {
    // Glaze: Rising pattern (celebration)
    glaze: {
      light: [5],
      medium: [8, 30, 15],
      strong: [10, 20, 15, 20, 20],
    },
    // Fade: Sharp dismissive tap
    fade: {
      light: [8],
      medium: [12, 15, 8],
      strong: [15, 10, 10, 10, 8],
    },
  };

  const type = voteType === 1 ? 'glaze' : 'fade';
  navigator.vibrate(patterns[type][intensity]);
}, []);

// Trigger on threshold cross (not just vote)
useMotionValueEvent(x, 'change', (latest) => {
  if (Math.abs(latest) >= SWIPE_THRESHOLD && !hasVibrated.current) {
    hasVibrated.current = true;
    triggerHaptics(latest > 0 ? 1 : -1, 'light');
  }
  if (Math.abs(latest) < SWIPE_THRESHOLD * 0.5) {
    hasVibrated.current = false;
  }
});
```

**Why:** Haptic feedback at threshold crossing confirms the action before release.

### 8. Card Stack Promotion Animation

**Current:**
```tsx
const promoteTransition = { type: 'spring', stiffness: 320, damping: 30 };
```

**Improved:**
```tsx
const promoteTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.8, // Lighter feel for snappy promotion
};

// Add slight overshoot on scale
const STACK_CONFIGS = [
  { scale: 1, y: 0, opacity: 1 },
  { scale: 0.96, y: 10, opacity: 0.75 },
  { scale: 0.92, y: 20, opacity: 0.5 },
];
```

**Why:** Cards behind should feel eager to promote, creating anticipation.

### 9. Glow Intensity Curve

**Current:** Linear opacity 0 → 0.5

**Improved:**
```tsx
// Exponential curve for more dramatic reveal
const glowRightOpacity = useTransform(
  x,
  [0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD * 0.7, SWIPE_THRESHOLD],
  [0, 0.1, 0.3, 0.6]
);
```

**Why:** Slow start, dramatic finish creates anticipation.

### 10. Icon Animation Enhancement

**Current:** Simple opacity fade

**Improved:**
```tsx
// Scale + opacity for icon reveal
const checkScale = useTransform(x, [50, SWIPE_THRESHOLD], [0.5, 1]);
const checkOpacity = useTransform(x, [50, SWIPE_THRESHOLD], [0, 1]);

<motion.div
  style={{
    opacity: checkOpacity,
    scale: checkScale,
  }}
>
  <CheckSvg />
</motion.div>
```

**Why:** Icons should "pop" into view, not just fade.

---

## Implementation Priority

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Spring-based exit | High | Low |
| 2 | Velocity-aware exit | High | Low |
| 3 | Card scale on drag | Medium | Low |
| 4 | Enhanced haptics at threshold | Medium | Low |
| 5 | Button sync feedback | Medium | Medium |
| 6 | Premium exit overlay | Medium | Medium |
| 7 | Elastic snap-back | Low | Low |
| 8 | Icon scale animation | Low | Low |
| 9 | Glow intensity curve | Low | Low |
| 10 | Stack promotion tuning | Low | Low |

---

## Success Criteria

- [ ] Card exit inherits swipe velocity (faster swipe = faster exit)
- [ ] Card scales slightly on drag start (1.01-1.02x)
- [ ] Haptic feedback fires at threshold crossing, not just on vote
- [ ] Glaze exit shows expanding green pulse
- [ ] Fade exit shows contracting dark vignette
- [ ] Vote buttons scale in response to swipe direction
- [ ] Below-threshold release has satisfying bounce
- [ ] No perceptible jank or frame drops on any device
- [ ] Reduced motion mode still feels responsive

---

## References

- [Framer Motion Spring Physics](https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/)
- [Tinder Card Game Implementation](https://dev.to/lansolo99/a-tinder-like-card-game-with-framer-motion-35i5)
- [2025 Haptics Guide](https://saropa-contacts.medium.com/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback-676dd5937774)
- [Micro-interactions Best Practices](https://bricxlabs.com/blogs/micro-interactions-2025-examples)

---

## Out of Scope

- Sound effects (separate initiative)
- Particle effects (performance concern on mobile)
- 3D card flip (complexity vs value)
