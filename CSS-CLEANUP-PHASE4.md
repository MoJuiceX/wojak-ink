# CSS CLEANUP PHASE 4 - Fix Broken Code & Final Polish

## Overview

Deep audit found that previous phases left broken code. This phase fixes everything.

**Decision:** KEEP AmbientBackground effects - restore the CSS.

---

## PHASE 4A: Restore Missing CSS to theme.css

Add the following CSS to the END of `src/styles/theme.css`:

```css
/* ═══════════════════════════════════════════════════════════════════════════════
   AMBIENT BACKGROUND EFFECTS
   Floating orbs and noise texture for premium feel
   ═══════════════════════════════════════════════════════════════════════════════ */

.ambient-background {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.25;
  animation: ambient-float 25s ease-in-out infinite;
}

.ambient-orb--cyan {
  width: 500px;
  height: 500px;
  background: var(--color-cyan);
  top: 5%;
  left: 5%;
}

.ambient-orb--orange {
  width: 600px;
  height: 600px;
  background: var(--color-primary);
  top: 40%;
  right: 5%;
  animation-delay: -7s;
}

.ambient-orb--purple {
  width: 450px;
  height: 450px;
  background: var(--color-purple);
  bottom: 10%;
  left: 25%;
  animation-delay: -12s;
}

.ambient-orb--pink {
  width: 400px;
  height: 400px;
  background: var(--color-pink);
  top: 20%;
  right: 25%;
  animation-delay: -18s;
}

@keyframes ambient-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -20px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 30px) scale(0.95);
  }
  75% {
    transform: translate(-30px, -10px) scale(1.02);
  }
}

/* Noise texture overlay for subtle grain effect */
.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* Hide ambient effects on mobile for performance */
@media (max-width: 768px) {
  .ambient-background {
    display: none;
  }
  .noise-overlay {
    display: none;
  }
}

/* Reduce motion preference */
@media (prefers-reduced-motion: reduce) {
  .ambient-orb {
    animation: none;
  }
}
```

---

## PHASE 4B: Remove Unused npm Packages

Run this command:
```bash
npm uninstall @ionic/react @studio-freight/lenis crypto-js
```

These packages have 0 imports in the codebase.

---

## PHASE 4C: Delete Empty Folders

```bash
rm -rf src/theme/
```

The `src/theme/` folder is now empty after previous phases deleted its contents.

---

## PHASE 4D: Verify Build

```bash
# Build must succeed
npm run build

# Start dev server
npm run dev
```

---

## PHASE 4E: Visual Verification

Check at localhost:
1. [ ] Ambient floating orbs visible on desktop (subtle colored blobs)
2. [ ] Noise texture adds subtle grain
3. [ ] Effects hidden on mobile (performance)
4. [ ] No console errors
5. [ ] All pages render correctly

---

## SUMMARY

| Task | Action |
|------|--------|
| Missing CSS | ADD ambient effects to theme.css |
| @ionic/react | npm uninstall |
| @studio-freight/lenis | npm uninstall |
| crypto-js | npm uninstall |
| src/theme/ folder | DELETE (empty) |

---

## COMMIT MESSAGE

```
fix: restore ambient effects CSS and remove unused packages

PHASE 4 CLEANUP:
- Add ambient background CSS to theme.css (was missing after Phase 2)
- Add noise overlay CSS to theme.css
- Uninstall unused: @ionic/react, @studio-freight/lenis, crypto-js
- Delete empty src/theme/ folder

Fixes broken visuals from incomplete previous cleanup phases.
```
