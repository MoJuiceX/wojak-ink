# Combat Polish Phase 1: Battle Animations & Visual Effects

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port all visual battle juice from ClawCombat into the Wojak combat UI — animated HP drain, damage numbers, screen shake, hit flash, status icons, effectiveness callouts, move selection glow, battle intro/victory/defeat transitions, and turn log entry animations.

**Architecture:** Add CSS keyframes to `src/styles/animations.css`, visual classes to `src/styles/theme.css`, create 3 new lightweight components (DamageNumber, StatusIcon, EffectivenessCallout), and upgrade existing components (HPBar, MoveButtons, TurnLog, BattleView) with animation state management.

**Tech Stack:** React, TypeScript, CSS keyframes (NO JS animation libraries), Vitest

**Reference Files:**
- ClawCombat animations: `/Users/abit_hex/ClawCombat/apps/backend/src/public/css/arena.css` (34+ keyframes)
- ClawCombat battle-ui: `/Users/abit_hex/ClawCombat/apps/backend/src/public/js/battle-ui.js` (damage numbers, HP bars, screen shake)
- Current combat CSS: `src/styles/theme.css` lines 2299-2444
- Current animations: `src/styles/animations.css`

**Test Commands:**
- TypeScript: `npx tsc --noEmit`
- Unit: `npx vitest run src/lib/combat/`
- Full: `npx vitest run`

**CSS Rules (from CLAUDE.md):**
- Visual styles → `src/styles/theme.css` (single source)
- Keyframe animations → `src/styles/animations.css`
- Layout → Tailwind only (flex, grid, gap, p, m, w, h)
- NEVER use `!important`
- Use CSS variables from theme.css

---

## IMPORTANT: Read Before Starting

1. Read `src/styles/animations.css` — existing keyframes you can reuse (fadeIn, shake, pulse, glowPulse, etc.)
2. Read `src/styles/theme.css` lines 2299-2444 — all current combat CSS
3. Read all files in `src/components/combat/` — understand current component structure
4. All new CSS goes in theme.css (visual classes) or animations.css (keyframes)
5. No new CSS files. No `!important`. No inline color styles.
6. Commit after each task.

---

### Task 1: Add combat keyframe animations to animations.css

**Files:**
- Modify: `src/styles/animations.css`

**Step 1: Append combat-specific keyframes at the end of the file, before the utility classes section**

Find the `/* UTILITY ANIMATION CLASSES */` section header and insert BEFORE it:

```css
/* ============================================
   COMBAT ANIMATIONS
   ============================================ */

/* HP bar shimmer on damage */
@keyframes hpShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* HP bar critical pulse */
@keyframes hpCriticalPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Damage number float upward and fade */
@keyframes damageFloat {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  70% {
    opacity: 1;
    transform: translateY(-40px) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateY(-60px) scale(0.9);
  }
}

/* Critical damage — larger float with bounce */
@keyframes damageCritFloat {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  20% {
    transform: translateY(-20px) scale(1.4);
  }
  50% {
    opacity: 1;
    transform: translateY(-50px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(-70px) scale(0.8);
  }
}

/* Screen shake — light (normal hit) */
@keyframes battleShakeLight {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-2px, 1px); }
  40% { transform: translate(2px, -1px); }
  60% { transform: translate(-1px, 2px); }
  80% { transform: translate(1px, -1px); }
}

/* Screen shake — normal */
@keyframes battleShake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-4px, 2px); }
  30% { transform: translate(4px, -3px); }
  50% { transform: translate(-3px, 4px); }
  70% { transform: translate(3px, -2px); }
  90% { transform: translate(-2px, 1px); }
}

/* Screen shake — heavy (crit) */
@keyframes battleShakeHeavy {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-6px, 3px); }
  20% { transform: translate(5px, -4px); }
  30% { transform: translate(-4px, 6px); }
  40% { transform: translate(6px, -3px); }
  50% { transform: translate(-5px, 2px); }
  60% { transform: translate(3px, -5px); }
  70% { transform: translate(-2px, 4px); }
  80% { transform: translate(4px, -2px); }
  90% { transform: translate(-3px, 1px); }
}

/* Screen flash overlay */
@keyframes battleFlash {
  0% { opacity: 0.6; }
  100% { opacity: 0; }
}

/* Fighter hit recoil */
@keyframes hitRecoil {
  0% { transform: translateX(0); filter: brightness(1); }
  25% { transform: translateX(-8px); filter: brightness(2); }
  50% { transform: translateX(4px); filter: brightness(1.5); }
  75% { transform: translateX(-2px); filter: brightness(1); }
  100% { transform: translateX(0); filter: brightness(1); }
}

/* Fighter faint (collapse and fade) */
@keyframes fighterFaint {
  0% { transform: translateY(0); opacity: 1; filter: saturate(1); }
  50% { transform: translateY(10px); opacity: 0.6; filter: saturate(0.3); }
  100% { transform: translateY(20px); opacity: 0.3; filter: saturate(0); }
}

/* Status effect icon animations */
@keyframes statusBurn {
  0%, 100% { color: #f08030; opacity: 0.8; }
  50% { color: #ff4500; opacity: 1; }
}

@keyframes statusPoison {
  0%, 100% { color: #a040a0; opacity: 0.8; }
  50% { color: #c060c0; opacity: 1; }
}

@keyframes statusParalysis {
  0%, 100% { opacity: 1; }
  25% { opacity: 0.3; }
  50% { opacity: 1; }
  75% { opacity: 0.5; }
}

@keyframes statusFreeze {
  0%, 100% { color: #98d8d8; opacity: 0.8; }
  50% { color: #b0f0f0; opacity: 1; filter: brightness(1.3); }
}

@keyframes statusSleep {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(-4px); opacity: 1; }
}

@keyframes statusConfusion {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
  75% { transform: rotate(-3deg); }
  100% { transform: rotate(0deg); }
}

/* Effectiveness callout pop-in */
@keyframes effectivenessPopIn {
  0% { opacity: 0; transform: scale(0.5) translateY(10px); }
  60% { opacity: 1; transform: scale(1.15) translateY(-5px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* Effectiveness callout hold then fade out */
@keyframes effectivenessFadeOut {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-10px); }
}

/* Move button glow when selected */
@keyframes moveGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(255, 107, 0, 0.3); }
  50% { box-shadow: 0 0 16px rgba(255, 107, 0, 0.5), 0 0 24px rgba(255, 107, 0, 0.2); }
}

/* Battle intro slide from sides */
@keyframes battleSlideInLeft {
  0% { transform: translateX(-60px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes battleSlideInRight {
  0% { transform: translateX(60px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

/* Victory glow */
@keyframes victoryGlow {
  0% { box-shadow: 0 0 0 rgba(34, 197, 94, 0); }
  50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2); }
  100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }
}

/* Defeat fade */
@keyframes defeatFade {
  0% { filter: saturate(1); opacity: 1; }
  100% { filter: saturate(0.3); opacity: 0.6; }
}

/* Turn log entry slide in */
@keyframes turnEntrySlide {
  0% { opacity: 0; transform: translateX(-10px); }
  100% { opacity: 1; transform: translateX(0); }
}
```

**Step 2: Verify no `!important` was added**

```bash
grep -n '!important' src/styles/animations.css
```

Expected: 0 results

**Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/styles/animations.css
git commit -m "feat(combat): add combat keyframe animations — HP shimmer, damage float, screen shake, status effects, battle transitions"
```

---

### Task 2: Add combat visual classes to theme.css

**Files:**
- Modify: `src/styles/theme.css`

**Step 1: Append combat animation classes after the `.stat-bar-fill` block (after line ~2436) and before the scrollbar-hide section**

Find this line in theme.css:

```css
.stat-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--color-primary);
}
```

Insert AFTER it (before the `/* ======= Scrollbar Hide ======= */` section):

```css
/* ── Combat Animation Classes ── */

/* HP bar ghost (trailing white bar showing previous HP) */
.hp-bar-ghost {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.15);
  transition: width 1.2s ease-out;
  z-index: 0;
}

.hp-bar-fill {
  position: relative;
  z-index: 1;
}

.hp-bar {
  position: relative;
}

/* HP shimmer on damage */
.hp-bar-shimmer .hp-bar-fill {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: hpShimmer 0.8s ease-out;
}

/* HP critical pulse */
.hp-critical .hp-bar-fill {
  animation: hpCriticalPulse 0.8s ease-in-out infinite;
}

/* ── Damage Numbers ── */
.damage-number {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 50;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  animation: damageFloat 1s ease-out forwards;
}

.damage-normal {
  font-size: 1.25rem;
  color: var(--color-text);
}

.damage-crit {
  font-size: 1.75rem;
  color: var(--color-primary);
  animation: damageCritFloat 1.2s ease-out forwards;
}

.damage-heal {
  font-size: 1.25rem;
  color: var(--color-success);
}

.damage-super-effective {
  font-size: 1.5rem;
  color: var(--color-success);
}

.damage-immune {
  font-size: 1rem;
  color: var(--color-text-muted);
  font-style: italic;
}

/* ── Screen Shake ── */
.battle-shake-light {
  animation: battleShakeLight 0.3s ease-out;
}

.battle-shake {
  animation: battleShake 0.4s ease-out;
}

.battle-shake-heavy {
  animation: battleShakeHeavy 0.5s ease-out;
}

/* ── Screen Flash Overlays ── */
.battle-flash-overlay {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  pointer-events: none;
  z-index: 40;
  animation: battleFlash 0.4s ease-out forwards;
}

.battle-flash-crit {
  background: rgba(255, 107, 0, 0.2);
}

.battle-flash-super-effective {
  background: rgba(34, 197, 94, 0.15);
}

.battle-flash-not-effective {
  background: rgba(239, 68, 68, 0.1);
}

/* ── Fighter Hit Reactions ── */
.fighter-hit {
  animation: hitRecoil 0.3s ease-out;
}

.fighter-faint {
  animation: fighterFaint 0.8s ease-out forwards;
}

/* ── Status Effect Icons ── */
.status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.4);
}

.status-icon-burn {
  color: #f08030;
  border-color: rgba(240, 128, 48, 0.4);
  animation: statusBurn 1.5s ease-in-out infinite;
}

.status-icon-poison {
  color: #a040a0;
  border-color: rgba(160, 64, 160, 0.4);
  animation: statusPoison 2s ease-in-out infinite;
}

.status-icon-paralysis {
  color: #f8d030;
  border-color: rgba(248, 208, 48, 0.4);
  animation: statusParalysis 1s ease-in-out infinite;
}

.status-icon-freeze {
  color: #98d8d8;
  border-color: rgba(152, 216, 216, 0.4);
  animation: statusFreeze 2s ease-in-out infinite;
}

.status-icon-sleep {
  color: var(--color-text-muted);
  border-color: var(--color-border);
  animation: statusSleep 2s ease-in-out infinite;
}

.status-icon-confusion {
  color: #f85888;
  border-color: rgba(248, 88, 136, 0.4);
  animation: statusConfusion 1s ease-in-out infinite;
}

/* ── Effectiveness Callouts ── */
.effectiveness-callout {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 60;
  padding: 6px 16px;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  pointer-events: none;
  animation: effectivenessPopIn 0.3s ease-out, effectivenessFadeOut 1.5s ease-out 0.3s forwards;
}

.callout-super-effective {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-success);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.callout-not-very-effective {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.callout-immune {
  background: rgba(96, 96, 112, 0.15);
  color: var(--color-text-muted);
  border: 1px solid rgba(96, 96, 112, 0.3);
}

/* ── Move Button Type Glow (selected state) ── */
.move-btn.selected.move-glow {
  animation: moveGlow 1.5s ease-in-out infinite;
}

.move-btn.move-glow-fire.selected    { box-shadow: 0 0 12px rgba(240, 128, 48, 0.4); }
.move-btn.move-glow-water.selected   { box-shadow: 0 0 12px rgba(104, 144, 240, 0.4); }
.move-btn.move-glow-electric.selected{ box-shadow: 0 0 12px rgba(248, 208, 48, 0.4); }
.move-btn.move-glow-grass.selected   { box-shadow: 0 0 12px rgba(120, 200, 80, 0.4); }
.move-btn.move-glow-ice.selected     { box-shadow: 0 0 12px rgba(152, 216, 216, 0.4); }
.move-btn.move-glow-martial.selected { box-shadow: 0 0 12px rgba(192, 48, 40, 0.4); }
.move-btn.move-glow-venom.selected   { box-shadow: 0 0 12px rgba(160, 64, 160, 0.4); }
.move-btn.move-glow-earth.selected   { box-shadow: 0 0 12px rgba(224, 192, 104, 0.4); }
.move-btn.move-glow-air.selected     { box-shadow: 0 0 12px rgba(168, 144, 240, 0.4); }
.move-btn.move-glow-psyche.selected  { box-shadow: 0 0 12px rgba(248, 88, 136, 0.4); }
.move-btn.move-glow-insect.selected  { box-shadow: 0 0 12px rgba(168, 184, 32, 0.4); }
.move-btn.move-glow-stone.selected   { box-shadow: 0 0 12px rgba(184, 160, 56, 0.4); }
.move-btn.move-glow-ghost.selected   { box-shadow: 0 0 12px rgba(112, 88, 152, 0.4); }
.move-btn.move-glow-dragon.selected  { box-shadow: 0 0 12px rgba(112, 56, 248, 0.4); }
.move-btn.move-glow-shadow.selected  { box-shadow: 0 0 12px rgba(112, 88, 72, 0.4); }
.move-btn.move-glow-metal.selected   { box-shadow: 0 0 12px rgba(184, 184, 208, 0.4); }
.move-btn.move-glow-mystic.selected  { box-shadow: 0 0 12px rgba(238, 153, 172, 0.4); }
.move-btn.move-glow-neutral.selected { box-shadow: 0 0 12px rgba(168, 168, 120, 0.4); }

/* ── Battle Intro ── */
.battle-intro-left {
  animation: battleSlideInLeft 0.6s ease-out;
}

.battle-intro-right {
  animation: battleSlideInRight 0.6s ease-out;
}

/* ── Victory / Defeat ── */
.fighter-victory {
  animation: victoryGlow 1s ease-out forwards;
}

.fighter-defeat {
  animation: defeatFade 0.8s ease-out forwards;
}

/* ── Turn Log Entry Animation ── */
.turn-entry-animated {
  animation: turnEntrySlide 0.3s ease-out forwards;
  opacity: 0;
}

.turn-entry-animated.stagger-1 { animation-delay: 0.05s; }
.turn-entry-animated.stagger-2 { animation-delay: 0.10s; }
.turn-entry-animated.stagger-3 { animation-delay: 0.15s; }
.turn-entry-animated.stagger-4 { animation-delay: 0.20s; }
```

**Step 2: Verify no `!important`**

```bash
grep -n '!important' src/styles/theme.css
```

Expected: 0 results

**Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat(combat): add combat visual classes — damage numbers, screen shake, flash, status icons, effectiveness callouts, type glow, battle transitions"
```

---

### Task 3: Create DamageNumber component

**Files:**
- Create: `src/components/combat/DamageNumber.tsx`

**Step 1: Create the component**

```tsx
/**
 * DamageNumber — floating damage number that animates upward and fades out.
 * Self-removes after animation completes via onComplete callback.
 */

import { useEffect } from 'react';

interface DamageNumberProps {
  id: string;
  value: number | string;
  type: 'normal' | 'crit' | 'heal' | 'super-effective' | 'immune';
  onComplete: () => void;
}

const TYPE_CLASS_MAP: Record<DamageNumberProps['type'], string> = {
  normal: 'damage-number damage-normal',
  crit: 'damage-number damage-crit',
  heal: 'damage-number damage-heal',
  'super-effective': 'damage-number damage-super-effective',
  immune: 'damage-number damage-immune',
};

export function DamageNumber({ id, value, type, onComplete }: DamageNumberProps) {
  useEffect(() => {
    const duration = type === 'crit' ? 1200 : 1000;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [type, onComplete]);

  const displayValue = type === 'heal'
    ? `+${value}`
    : type === 'immune'
      ? 'Immune'
      : value;

  return (
    <div className={TYPE_CLASS_MAP[type]} data-damage-id={id}>
      {displayValue}
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/DamageNumber.tsx
git commit -m "feat(combat): add DamageNumber component — floating animated damage text"
```

---

### Task 4: Create StatusIcon component

**Files:**
- Create: `src/components/combat/StatusIcon.tsx`

**Step 1: Create the component**

```tsx
/**
 * StatusIcon — small animated icon for combat status effects (burn, poison, etc.).
 */

interface StatusIconProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  burn: { label: 'Burned', emoji: '🔥', className: 'status-icon status-icon-burn' },
  poison: { label: 'Poisoned', emoji: '☠️', className: 'status-icon status-icon-poison' },
  badly_poisoned: { label: 'Badly Poisoned', emoji: '☠️', className: 'status-icon status-icon-poison' },
  paralysis: { label: 'Paralyzed', emoji: '⚡', className: 'status-icon status-icon-paralysis' },
  freeze: { label: 'Frozen', emoji: '❄️', className: 'status-icon status-icon-freeze' },
  sleep: { label: 'Asleep', emoji: '💤', className: 'status-icon status-icon-sleep' },
  confusion: { label: 'Confused', emoji: '💫', className: 'status-icon status-icon-confusion' },
};

export function StatusIcon({ status }: StatusIconProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={config.className}
      title={config.label}
      aria-label={config.label}
    >
      {config.emoji}
    </span>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/StatusIcon.tsx
git commit -m "feat(combat): add StatusIcon component — animated status effect indicators"
```

---

### Task 5: Create EffectivenessCallout component

**Files:**
- Create: `src/components/combat/EffectivenessCallout.tsx`

**Step 1: Create the component**

```tsx
/**
 * EffectivenessCallout — centered text popup for "Super Effective!", "Not Very Effective...", "Immune".
 * Self-removes after animation via onComplete callback.
 */

import { useEffect } from 'react';

interface EffectivenessCalloutProps {
  id: string;
  type: 'super_effective' | 'not_very_effective' | 'immune';
  onComplete: () => void;
}

const CALLOUT_CONFIG: Record<string, { text: string; className: string }> = {
  super_effective: { text: 'Super Effective!', className: 'effectiveness-callout callout-super-effective' },
  not_very_effective: { text: 'Not Very Effective...', className: 'effectiveness-callout callout-not-very-effective' },
  immune: { text: 'No Effect', className: 'effectiveness-callout callout-immune' },
};

export function EffectivenessCallout({ id, type, onComplete }: EffectivenessCalloutProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const config = CALLOUT_CONFIG[type];
  if (!config) return null;

  return (
    <div className={config.className} data-callout-id={id}>
      {config.text}
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/EffectivenessCallout.tsx
git commit -m "feat(combat): add EffectivenessCallout component — super effective / not very effective popup"
```

---

### Task 6: Upgrade HPBar with ghost bar and critical pulse

**Files:**
- Modify: `src/components/combat/HPBar.tsx`

**Step 1: Replace the entire HPBar component with the upgraded version**

```tsx
/**
 * HPBar — animated health bar with ghost bar, shimmer on damage, and critical pulse.
 */

import { useState, useEffect, useRef } from 'react';

interface HPBarProps {
  current: number;
  max: number;
  label?: string;
}

export function HPBar({ current, max, label }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const tier = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';
  const isCritical = pct <= 20 && pct > 0;

  // Ghost bar tracks previous HP (trails behind actual HP)
  const [ghostPct, setGhostPct] = useState(pct);
  const [isShimmering, setIsShimmering] = useState(false);
  const prevPctRef = useRef(pct);

  useEffect(() => {
    if (pct < prevPctRef.current) {
      // Damage was taken: trigger shimmer and delay ghost bar
      setIsShimmering(true);
      const shimmerTimer = setTimeout(() => setIsShimmering(false), 800);

      const ghostTimer = setTimeout(() => {
        setGhostPct(pct);
      }, 600);

      prevPctRef.current = pct;
      return () => {
        clearTimeout(shimmerTimer);
        clearTimeout(ghostTimer);
      };
    } else {
      // Healing: sync ghost immediately
      setGhostPct(pct);
      prevPctRef.current = pct;
    }
  }, [pct]);

  const barClasses = [
    'hp-bar',
    tier,
    isShimmering ? 'hp-bar-shimmer' : '',
    isCritical ? 'hp-critical' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary">{label}</span>
          <span className="text-muted tabular-nums">{current}/{max}</span>
        </div>
      )}
      <div className={barClasses}>
        <div className="hp-bar-ghost" style={{ width: `${ghostPct}%` }} />
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/HPBar.tsx
git commit -m "feat(combat): upgrade HPBar with ghost bar, shimmer on damage, and critical pulse"
```

---

### Task 7: Upgrade MoveButtons with type glow on selection

**Files:**
- Modify: `src/components/combat/MoveButtons.tsx`

**Step 1: Add `type` field to MoveInfo interface and add type-glow class to selected buttons**

Replace the full MoveButtons component:

```tsx
/**
 * MoveButtons — 4 move buttons for manual combat + 30s timer.
 * Selected move glows with its combat type color.
 */

import { useState, useEffect, useCallback } from 'react';

interface MoveInfo {
  id: string;
  name: string;
  power: number;
  accuracy: number;
  category: string;
  type?: string;
}

interface MoveButtonsProps {
  moves: MoveInfo[];
  onSubmit: (moveId: string) => void;
  disabled?: boolean;
  timerSeconds?: number;
  onTimeout?: () => void;
}

export function MoveButtons({ moves, onSubmit, disabled = false, timerSeconds = 30, onTimeout }: MoveButtonsProps) {
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);

  // Countdown timer
  useEffect(() => {
    if (disabled) return;
    setTimeLeft(timerSeconds);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          onTimeout?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [disabled, timerSeconds, onTimeout]);

  const handleSelect = useCallback((moveId: string) => {
    setSelectedMove(moveId);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedMove) {
      onSubmit(selectedMove);
      setSelectedMove(null);
    }
  }, [selectedMove, onSubmit]);

  const timerClass = timeLeft <= 5 ? 'combat-timer timer-critical' : timeLeft <= 10 ? 'combat-timer timer-warning' : 'combat-timer';

  // Get the type glow class for a move based on its type
  const getGlowClass = (move: MoveInfo, isSelected: boolean): string => {
    if (!isSelected || !move.type) return '';
    return `move-glow move-glow-${move.type.toLowerCase()}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Timer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary">Choose your move</span>
        <span className={timerClass}>{timeLeft}s</span>
      </div>

      {/* Move grid */}
      <div className="grid grid-cols-2 gap-2">
        {moves.map((move) => {
          const isSelected = selectedMove === move.id;
          return (
            <button
              key={move.id}
              className={`move-btn ${isSelected ? 'selected' : ''} ${getGlowClass(move, isSelected)}`}
              onClick={() => handleSelect(move.id)}
              disabled={disabled}
            >
              <div className="font-medium text-sm">{move.name}</div>
              <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                {move.power > 0 && <span>Pow {move.power}</span>}
                <span>Acc {move.accuracy}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        className="btn btn-primary w-full"
        onClick={handleConfirm}
        disabled={disabled || !selectedMove}
      >
        Confirm Move
      </button>
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/MoveButtons.tsx
git commit -m "feat(combat): add type-colored glow to selected move button"
```

---

### Task 8: Upgrade TurnLog with auto-scroll and entry animations

**Files:**
- Modify: `src/components/combat/TurnLog.tsx`

**Step 1: Replace the full TurnLog component**

```tsx
/**
 * TurnLog — scrollable turn-by-turn battle results with auto-scroll and entry animations.
 */

import { useRef, useState, useEffect } from 'react';

interface TurnEntry {
  turn: number;
  events?: Array<{
    type: string;
    message?: string;
    damage?: number;
    effectiveness?: string;
    isCrit?: boolean;
  }>;
  end_of_turn?: {
    fighter_a_hp: number;
    fighter_b_hp: number;
  };
}

interface TurnLogProps {
  turns: TurnEntry[];
  maxHeight?: string;
}

function getEntryClass(event: TurnEntry['events'] extends (infer T)[] ? T : never): string {
  if (!event) return 'turn-entry';
  if (event.isCrit) return 'turn-entry turn-crit';
  if (event.effectiveness === 'super_effective') return 'turn-entry turn-super-effective';
  if (event.effectiveness === 'not_very_effective') return 'turn-entry turn-not-effective';
  return 'turn-entry';
}

export function TurnLog({ turns, maxHeight = '300px' }: TurnLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevTurnCount, setPrevTurnCount] = useState(0);
  const [animatingTurn, setAnimatingTurn] = useState<number | null>(null);

  // Auto-scroll to bottom and trigger entry animation on new turns
  useEffect(() => {
    if (turns.length > prevTurnCount) {
      // Mark newest turn for animation
      setAnimatingTurn(turns.length > 0 ? turns[turns.length - 1].turn : null);

      // Auto-scroll to bottom
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });

      // Clear animation class after animation completes
      const timer = setTimeout(() => {
        setAnimatingTurn(null);
      }, 400);

      setPrevTurnCount(turns.length);
      return () => clearTimeout(timer);
    }
  }, [turns, prevTurnCount]);

  if (turns.length === 0) {
    return (
      <div className="text-center text-muted text-sm py-4">
        No turns yet.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-2 overflow-y-auto hide-scrollbar"
      style={{ maxHeight }}
    >
      {turns.map((turn) => {
        const isNewTurn = turn.turn === animatingTurn;
        return (
          <div key={turn.turn} className="flex flex-col gap-1">
            <span className="text-xs text-muted font-semibold">Turn {turn.turn}</span>
            {turn.events?.map((event, i) => {
              const baseClass = getEntryClass(event);
              const animClass = isNewTurn
                ? `turn-entry-animated stagger-${Math.min(i + 1, 4)}`
                : '';
              return (
                <div key={i} className={`${baseClass} ${animClass}`}>
                  {event.message ?? `${event.type}: ${event.damage ?? 0} damage`}
                </div>
              );
            })}
            {turn.end_of_turn && (
              <div className={`text-xs text-muted pl-3 ${isNewTurn ? 'turn-entry-animated stagger-4' : ''}`}>
                HP: A={turn.end_of_turn.fighter_a_hp} | B={turn.end_of_turn.fighter_b_hp}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/TurnLog.tsx
git commit -m "feat(combat): add turn log auto-scroll and staggered entry animations"
```

---

### Task 9: Export new components from combat index

**Files:**
- Modify: `src/components/combat/index.ts`

**Step 1: Read the current index.ts file to see existing exports**

Read `src/components/combat/index.ts` first.

**Step 2: Add exports for the 3 new components**

Append these lines to the exports:

```typescript
export { DamageNumber } from './DamageNumber';
export { StatusIcon } from './StatusIcon';
export { EffectivenessCallout } from './EffectivenessCallout';
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/combat/index.ts
git commit -m "feat(combat): export DamageNumber, StatusIcon, EffectivenessCallout from combat index"
```

---

### Task 10: Upgrade BattleView — add animation state management

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

This is the largest task — BattleView orchestrates all visual effects. Replace the entire file.

**Step 1: Replace BattleView.tsx with the fully animated version**

```tsx
/**
 * BattleView — split screen: your Wojak vs opponent with HP bars, turn log, move controls,
 * and battle animations (damage numbers, screen shake, flash, status icons, callouts, intro, victory/defeat).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { HPBar } from './HPBar';
import { TurnLog } from './TurnLog';
import { MoveButtons } from './MoveButtons';
import { DamageNumber } from './DamageNumber';
import { StatusIcon } from './StatusIcon';
import { EffectivenessCallout } from './EffectivenessCallout';
import type { CombatType } from '@/lib/combat/types';

interface FighterDisplay {
  nft_id: string;
  edition?: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  moves: { id: string; name: string; power: number; accuracy: number; category: string; type?: string }[];
  imageUrl?: string;
}

interface BattleData {
  id: number;
  status: string;
  currentTurn: number;
  maxTurns: number;
  winner: string | null;
  fighterA: FighterDisplay | null;
  fighterB: FighterDisplay | null;
  turns: any[];
  eloChangeA?: number;
  eloChangeB?: number;
  xpAwardedA?: number;
  xpAwardedB?: number;
}

interface BattleViewProps {
  battleId: number;
  playerNftId?: string;
}

export function BattleView({ battleId, playerNftId }: BattleViewProps) {
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation states
  const [damageNumbers, setDamageNumbers] = useState<Array<{
    id: string;
    value: number | string;
    type: 'normal' | 'crit' | 'heal' | 'super-effective' | 'immune';
    side: 'player' | 'opponent';
  }>>([]);
  const [callouts, setCallouts] = useState<Array<{ id: string; type: 'super_effective' | 'not_very_effective' | 'immune' }>>([]);
  const [shakeClass, setShakeClass] = useState('');
  const [flashClass, setFlashClass] = useState('');
  const [playerHitClass, setPlayerHitClass] = useState('');
  const [opponentHitClass, setOpponentHitClass] = useState('');
  const [playerStatus, setPlayerStatus] = useState<string | null>(null);
  const [opponentStatus, setOpponentStatus] = useState<string | null>(null);
  const [introComplete, setIntroComplete] = useState(false);

  const prevTurnCountRef = useRef(0);

  // Fetch battle state
  const fetchBattle = useCallback(async () => {
    try {
      const res = await fetch(`/api/combat/battle?id=${battleId}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setBattle(data);
    } catch (err) {
      setError('Failed to load battle');
    }
  }, [battleId]);

  useEffect(() => {
    fetchBattle();
    const interval = setInterval(fetchBattle, 3000);
    return () => clearInterval(interval);
  }, [fetchBattle]);

  const handleSubmitMove = useCallback(async (moveId: string) => {
    if (!playerNftId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/combat/submit-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, nftId: playerNftId, moveId }),
      });
      const data = await res.json();
      if (data.turnResult) {
        await fetchBattle();
      }
    } catch (err) {
      console.error('[BattleView] Submit move error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [battleId, playerNftId, fetchBattle]);

  // Derive layout values
  const isComplete = battle?.status === 'completed';
  const isPlayerA = playerNftId === battle?.fighterA?.nft_id;
  const playerFighter = isPlayerA ? battle?.fighterA : battle?.fighterB;
  const opponentFighter = isPlayerA ? battle?.fighterB : battle?.fighterA;

  const lastTurn = battle && battle.turns.length > 0 ? battle.turns[battle.turns.length - 1] : null;
  const hpA = lastTurn?.end_of_turn?.fighter_a_hp ?? 0;
  const hpB = lastTurn?.end_of_turn?.fighter_b_hp ?? 0;
  const playerHP = isPlayerA ? hpA : hpB;
  const opponentHP = isPlayerA ? hpB : hpA;

  const playerMaxHP = playerFighter?.level ? Math.floor((2 * 80 + 31) * playerFighter.level / 100) + playerFighter.level + 10 : 100;
  const opponentMaxHP = opponentFighter?.level ? Math.floor((2 * 80 + 31) * opponentFighter.level / 100) + opponentFighter.level + 10 : 100;

  const playerIsWinner = isComplete && battle?.winner === playerNftId;
  const opponentIsWinner = isComplete && battle?.winner != null && battle?.winner !== playerNftId;
  const playerBattleEndClass = isComplete
    ? (playerIsWinner ? 'fighter-victory' : 'fighter-defeat')
    : '';
  const opponentBattleEndClass = isComplete
    ? (opponentIsWinner ? 'fighter-victory' : 'fighter-defeat')
    : '';

  // Battle intro animation
  useEffect(() => {
    if (battle && !introComplete) {
      const timer = setTimeout(() => setIntroComplete(true), 750);
      return () => clearTimeout(timer);
    }
  }, [battle, introComplete]);

  // Spawn damage numbers, shake, flash, hit reactions, and callouts on new turns
  useEffect(() => {
    if (!battle) return;
    const turnCount = battle.turns.length;
    if (turnCount > prevTurnCountRef.current && turnCount > 0) {
      const latestTurn = battle.turns[turnCount - 1];
      const newNumbers: typeof damageNumbers = [];

      latestTurn.events?.forEach((event: any, i: number) => {
        if (event.damage != null && event.damage > 0) {
          const dmgType = event.isCrit ? 'crit'
            : event.effectiveness === 'super_effective' ? 'super-effective'
            : event.effectiveness === 'immune' ? 'immune'
            : 'normal';
          // Even-indexed events target opponent, odd target player (simplified)
          const targetSide = i % 2 === 0
            ? (isPlayerA ? 'opponent' : 'player')
            : (isPlayerA ? 'player' : 'opponent');
          newNumbers.push({
            id: `dmg-${turnCount}-${i}-${Date.now()}`,
            value: event.damage,
            type: dmgType,
            side: targetSide,
          });
        }
      });

      if (newNumbers.length > 0) {
        setDamageNumbers((prev) => [...prev, ...newNumbers]);

        // Screen shake intensity based on damage
        const maxDmg = Math.max(...newNumbers.map((d) => typeof d.value === 'number' ? d.value : 0));
        const hasCrit = newNumbers.some((d) => d.type === 'crit');
        const intensity = hasCrit ? 'battle-shake-heavy' : maxDmg > 30 ? 'battle-shake' : 'battle-shake-light';
        setShakeClass(intensity);
        setTimeout(() => setShakeClass(''), 500);

        // Screen flash for crits and super effective
        const hasSuperEffective = newNumbers.some((d) => d.type === 'super-effective');
        if (hasCrit) {
          setFlashClass('battle-flash-overlay battle-flash-crit');
        } else if (hasSuperEffective) {
          setFlashClass('battle-flash-overlay battle-flash-super-effective');
        }
        if (hasCrit || hasSuperEffective) {
          setTimeout(() => setFlashClass(''), 400);
        }

        // Hit reactions
        newNumbers.forEach((d) => {
          if (d.side === 'player') {
            setPlayerHitClass('fighter-hit');
            setTimeout(() => setPlayerHitClass(''), 300);
          } else {
            setOpponentHitClass('fighter-hit');
            setTimeout(() => setOpponentHitClass(''), 300);
          }
        });
      }

      // Effectiveness callouts
      const newCallouts: typeof callouts = [];
      latestTurn.events?.forEach((event: any, i: number) => {
        if (event.effectiveness && event.effectiveness !== 'neutral') {
          newCallouts.push({
            id: `eff-${turnCount}-${i}-${Date.now()}`,
            type: event.effectiveness,
          });
        }
      });
      if (newCallouts.length > 0) {
        setCallouts((prev) => [...prev, ...newCallouts]);
      }
    }
    prevTurnCountRef.current = turnCount;
  }, [battle, isPlayerA]);

  // Track status effects from turn data
  useEffect(() => {
    if (!battle || battle.turns.length === 0) return;
    const lt = battle.turns[battle.turns.length - 1];
    const eot = lt.end_of_turn;
    if (eot) {
      setPlayerStatus(isPlayerA ? eot.fighter_a_status : eot.fighter_b_status);
      setOpponentStatus(isPlayerA ? eot.fighter_b_status : eot.fighter_a_status);
    }
  }, [battle, isPlayerA]);

  // Faint detection
  useEffect(() => {
    if (!battle || battle.turns.length === 0 || isComplete) return;
    if (playerHP <= 0) {
      setPlayerHitClass('fighter-faint');
    }
    if (opponentHP <= 0) {
      setOpponentHitClass('fighter-faint');
    }
  }, [battle, playerHP, opponentHP, isComplete]);

  // Cleanup callbacks
  const removeDamageNumber = useCallback((id: string) => {
    setDamageNumbers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const removeCallout = useCallback((id: string) => {
    setCallouts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Render ──

  if (error) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-muted text-sm">Loading battle...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Battle header */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Battle #{battle.id}</span>
        <span>Turn {battle.currentTurn}/{battle.maxTurns}</span>
      </div>

      {/* Fighter panels */}
      <div className={`grid grid-cols-2 gap-4 ${shakeClass}`} style={{ position: 'relative' }}>
        {/* Player side */}
        <div style={{ position: 'relative' }} className={!introComplete ? 'battle-intro-left' : ''}>
          <div className={`card p-3 flex flex-col gap-2 ${playerHitClass} ${playerBattleEndClass}`}>
            {playerFighter?.imageUrl && (
              <div className="battle-nft-image">
                <img src={playerFighter.imageUrl} alt="Your fighter" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`badge badge-${playerFighter?.type.toLowerCase()}`}>
                {playerFighter?.type}
              </span>
              <span className="text-xs text-muted">Lv.{playerFighter?.level}</span>
            </div>
            <HPBar
              current={battle.turns.length === 0 ? playerMaxHP : playerHP}
              max={playerMaxHP}
              label="HP"
            />
            {playerStatus && (
              <div className="flex gap-1 mt-0.5">
                <StatusIcon status={playerStatus} />
              </div>
            )}
          </div>
          {/* Damage numbers — player side */}
          {damageNumbers
            .filter((d) => d.side === 'player')
            .map((d) => (
              <DamageNumber
                key={d.id}
                id={d.id}
                value={d.value}
                type={d.type}
                onComplete={() => removeDamageNumber(d.id)}
              />
            ))}
        </div>

        {/* Opponent side */}
        <div style={{ position: 'relative' }} className={!introComplete ? 'battle-intro-right' : ''}>
          <div className={`card p-3 flex flex-col gap-2 ${opponentHitClass} ${opponentBattleEndClass}`}>
            {opponentFighter?.imageUrl && (
              <div className="battle-nft-image">
                <img src={opponentFighter.imageUrl} alt="Opponent" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`badge badge-${opponentFighter?.type.toLowerCase()}`}>
                {opponentFighter?.type}
              </span>
              <span className="text-xs text-muted">Lv.{opponentFighter?.level}</span>
            </div>
            <HPBar
              current={battle.turns.length === 0 ? opponentMaxHP : opponentHP}
              max={opponentMaxHP}
              label="HP"
            />
            {opponentStatus && (
              <div className="flex gap-1 mt-0.5">
                <StatusIcon status={opponentStatus} />
              </div>
            )}
          </div>
          {/* Damage numbers — opponent side */}
          {damageNumbers
            .filter((d) => d.side === 'opponent')
            .map((d) => (
              <DamageNumber
                key={d.id}
                id={d.id}
                value={d.value}
                type={d.type}
                onComplete={() => removeDamageNumber(d.id)}
              />
            ))}
        </div>

        {/* Flash overlay */}
        {flashClass && <div className={flashClass} />}

        {/* Effectiveness callouts */}
        {callouts.map((c) => (
          <EffectivenessCallout
            key={c.id}
            id={c.id}
            type={c.type}
            onComplete={() => removeCallout(c.id)}
          />
        ))}
      </div>

      {/* Move buttons (manual mode only, when not complete) */}
      {!isComplete && playerFighter?.moves && playerNftId && (
        <MoveButtons
          moves={playerFighter.moves}
          onSubmit={handleSubmitMove}
          disabled={isSubmitting}
        />
      )}

      {/* Turn log */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Battle Log</h3>
        <TurnLog turns={battle.turns} />
      </div>

      {/* Battle result */}
      {isComplete && (
        <div className={`card p-4 text-center ${playerIsWinner ? 'fighter-victory' : ''}`}>
          <p className="text-lg font-bold">
            {playerIsWinner
              ? 'Victory!'
              : battle.winner
                ? 'Defeat'
                : 'Draw'}
          </p>
          {battle.eloChangeA != null && (
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-secondary">
              <span>ELO: {(isPlayerA ? battle.eloChangeA : battle.eloChangeB) ?? 0 > 0 ? '+' : ''}{isPlayerA ? battle.eloChangeA : battle.eloChangeB}</span>
              <span>XP: +{isPlayerA ? battle.xpAwardedA : battle.xpAwardedB}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/combat/BattleView.tsx
git commit -m "feat(combat): integrate all battle animations into BattleView — damage numbers, screen shake, flash, status icons, callouts, intro/victory/defeat"
```

---

### Task 11: Final Verification Pass

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 2: Run combat unit tests**

```bash
npx vitest run src/lib/combat/
```

**Step 3: No `!important` check**

```bash
grep -rn '!important' src/styles/theme.css src/styles/animations.css
```

Expected: 0 results

**Step 4: File inventory check**

Verify all new/modified files exist:

**New files (3):**
- `src/components/combat/DamageNumber.tsx`
- `src/components/combat/StatusIcon.tsx`
- `src/components/combat/EffectivenessCallout.tsx`

**Modified files (6):**
- `src/styles/animations.css` — combat keyframes appended
- `src/styles/theme.css` — combat visual classes appended
- `src/components/combat/HPBar.tsx` — ghost bar, critical pulse
- `src/components/combat/MoveButtons.tsx` — type glow on selection
- `src/components/combat/TurnLog.tsx` — auto-scroll, entry animations
- `src/components/combat/BattleView.tsx` — all animation orchestration
- `src/components/combat/index.ts` — new exports

**NOT modified (should remain unchanged):**
- `src/components/combat/BattleReplay.tsx`
- `src/components/combat/QueuePanel.tsx`
- `src/components/combat/FighterCard.tsx`
- `src/components/combat/CombatLeaderboard.tsx`
- `src/components/combat/BattleHistory.tsx`
- `src/components/combat/PreCombatMessage.tsx`

**Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(combat): final verification pass for combat animation polish"
```

---

## Summary of All Additions

### animations.css (new keyframes — 20 total)
- `hpShimmer`, `hpCriticalPulse`
- `damageFloat`, `damageCritFloat`
- `battleShakeLight`, `battleShake`, `battleShakeHeavy`
- `battleFlash`
- `hitRecoil`, `fighterFaint`
- `statusBurn`, `statusPoison`, `statusParalysis`, `statusFreeze`, `statusSleep`, `statusConfusion`
- `effectivenessPopIn`, `effectivenessFadeOut`
- `moveGlow`
- `battleSlideInLeft`, `battleSlideInRight`
- `victoryGlow`, `defeatFade`
- `turnEntrySlide`

### theme.css (new classes — 40+ total)
- `.hp-bar-ghost`, `.hp-bar-shimmer`, `.hp-critical`
- `.damage-number`, `.damage-crit`, `.damage-normal`, `.damage-heal`, `.damage-super-effective`, `.damage-immune`
- `.battle-shake`, `.battle-shake-light`, `.battle-shake-heavy`
- `.battle-flash-overlay`, `.battle-flash-crit`, `.battle-flash-super-effective`, `.battle-flash-not-effective`
- `.fighter-hit`, `.fighter-faint`
- `.status-icon`, `.status-icon-burn/poison/paralysis/freeze/sleep/confusion`
- `.effectiveness-callout`, `.callout-super-effective/not-very-effective/immune`
- `.move-btn.selected.move-glow`, `.move-btn.move-glow-{type}` (18 types)
- `.battle-intro-left`, `.battle-intro-right`
- `.fighter-victory`, `.fighter-defeat`
- `.turn-entry-animated`
