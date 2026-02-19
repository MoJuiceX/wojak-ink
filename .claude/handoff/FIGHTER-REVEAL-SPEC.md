# Fighter Reveal — Animated Post-Mint Identity Card

---

## Overview

After a successful mint, the user sees their combat identity for the **first time** — type, nature, ability, and all 4 attacks. This is the mystery-box moment. An animated fighter card reveals everything in sequence, creating a memorable experience.

The reveal replaces/augments the existing mint success screen in `MintFlowModal.tsx`.

---

## Task 1: Add Combat Data to Mint Job Status

**File:** `functions/api/mint/status.ts` (or wherever job status is returned)

The frontend polls for mint job status. When the job completes, include the combat identity data so the reveal screen can display it.

Check how the frontend receives job completion data. The `currentJob` object in MintContext likely comes from a status polling endpoint. Add combat data to the response:

```typescript
// When job is complete, include combat identity
if (job.status === 'completed') {
  // Look up the fighter from combat_fighters table
  const fighter = await env.DB.prepare(
    'SELECT combat_type, nature, ability, move_1, move_2, move_3, move_4 FROM combat_fighters WHERE edition_number = ?'
  ).bind(job.mint_number).first();

  return {
    ...existingJobFields,
    combat: fighter ? {
      type: fighter.combat_type,
      nature: fighter.nature,
      ability: fighter.ability,
      moves: [fighter.move_1, fighter.move_2, fighter.move_3, fighter.move_4],
    } : null,
  };
}
```

Update the job type in MintContext to include the optional combat field:

```typescript
interface MintJob {
  // ... existing fields
  combat?: {
    type: string;
    nature: string;
    ability: string;
    moves: string[]; // 4 move IDs
  } | null;
}
```

---

## Task 2: Create FighterRevealCard Component

**File:** `src/components/generator/FighterRevealCard.tsx` (NEW)

An animated card that reveals combat identity in sequence.

```tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, Sparkles } from 'lucide-react';
import { getMoveById } from '@/lib/combat/data/moves';
import { TYPE_COLORS } from '@/lib/combat/data/type-chart'; // or create a small color map

interface FighterRevealProps {
  mintNumber: number;
  customName?: string;
  combat: {
    type: string;
    nature: string;
    ability: string;
    moves: string[];
  };
  imageUrl?: string; // The minted Wojak image
}

// Type color map for visual flair
const TYPE_COLOR_MAP: Record<string, string> = {
  NEUTRAL: '#a0a0b0',
  FIRE: '#ef4444',
  WATER: '#3b82f6',
  ELECTRIC: '#eab308',
  GRASS: '#22c55e',
  ICE: '#67e8f9',
  MARTIAL: '#f97316',
  VENOM: '#a855f7',
  EARTH: '#a16207',
  AIR: '#7dd3fc',
  PSYCHE: '#ec4899',
  INSECT: '#84cc16',
  STONE: '#78716c',
  GHOST: '#6366f1',
  DRAGON: '#7c3aed',
  SHADOW: '#1e293b',
  METAL: '#94a3b8',
  MYSTIC: '#f9a8d4',
};

export function FighterRevealCard({ mintNumber, customName, combat, imageUrl }: FighterRevealProps) {
  const [revealStep, setRevealStep] = useState(0);
  // Step 0: Image
  // Step 1: Name
  // Step 2: Type badge
  // Step 3: Nature + Ability
  // Step 4-7: Moves one by one
  // Step 8: Complete (show CTA)

  useEffect(() => {
    // Auto-advance through reveal steps
    const timings = [500, 800, 1200, 1600, 2000, 2300, 2600, 2900, 3200];
    const timers = timings.map((delay, idx) =>
      setTimeout(() => setRevealStep(idx + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const typeColor = TYPE_COLOR_MAP[combat.type] || 'var(--color-primary)';
  const moves = combat.moves.map(id => getMoveById(id)).filter(Boolean);
  const displayName = customName || `Wojak #${mintNumber}`;

  return (
    <div className="fighter-reveal-card">
      {/* Type-colored glow background */}
      <div
        className="fighter-reveal-glow"
        style={{
          background: `radial-gradient(circle at center, ${typeColor}15 0%, transparent 70%)`,
        }}
      />

      {/* Wojak Image */}
      <AnimatePresence>
        {revealStep >= 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fighter-reveal-image"
          >
            {imageUrl ? (
              <img src={imageUrl} alt={displayName} />
            ) : (
              <div className="fighter-reveal-placeholder">
                <Swords size={48} style={{ color: typeColor }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name */}
      {revealStep >= 1 && (
        <motion.h3
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fighter-reveal-name"
        >
          {displayName}
        </motion.h3>
      )}

      {/* Type Badge */}
      {revealStep >= 2 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="fighter-reveal-type"
          style={{
            background: `${typeColor}20`,
            borderColor: typeColor,
            color: typeColor,
          }}
        >
          <Sparkles size={14} />
          {combat.type}
        </motion.div>
      )}

      {/* Nature + Ability */}
      {revealStep >= 3 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fighter-reveal-traits"
        >
          <span className="text-secondary text-sm">
            {combat.nature} · {combat.ability}
          </span>
        </motion.div>
      )}

      {/* Attacks - reveal one by one */}
      <div className="fighter-reveal-moves">
        {moves.map((move, idx) => (
          revealStep >= (4 + idx) && move && (
            <motion.div
              key={move.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`fighter-reveal-move ${move.category === 'status' ? 'fighter-reveal-move-skill' : ''}`}
            >
              <div className="flex items-center gap-2">
                {move.category === 'status' ? (
                  <Shield size={14} className="text-cyan" />
                ) : (
                  <Swords size={14} style={{ color: typeColor }} />
                )}
                <span className="font-medium text-sm">{move.name}</span>
              </div>
              <div className="flex gap-2 text-xs text-secondary">
                {move.power > 0 && <span>Pow {move.power}</span>}
                <span>Acc {move.accuracy}%</span>
                <span className="text-muted">
                  {move.category === 'physical' ? 'PHY' : move.category === 'special' ? 'SPC' : 'SKILL'}
                </span>
              </div>
            </motion.div>
          )
        ))}
      </div>

      {/* Ready to Fight CTA */}
      {revealStep >= 8 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fighter-reveal-cta"
        >
          <p className="text-xs text-muted mb-2">Your fighter is ready!</p>
        </motion.div>
      )}
    </div>
  );
}
```

---

## Task 3: Add Reveal Card Styles to theme.css

**File:** `src/styles/theme.css`

Add styles for the fighter reveal card:

```css
/* Fighter Reveal Card */
.fighter-reveal-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  overflow: hidden;
}

.fighter-reveal-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.fighter-reveal-image {
  position: relative;
  z-index: 1;
  width: 120px;
  height: 120px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 2px solid var(--color-border);
}

.fighter-reveal-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fighter-reveal-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
}

.fighter-reveal-name {
  font-size: 1.25rem;
  font-weight: 700;
  position: relative;
  z-index: 1;
}

.fighter-reveal-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  z-index: 1;
}

.fighter-reveal-traits {
  position: relative;
  z-index: 1;
}

.fighter-reveal-moves {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 280px;
  position: relative;
  z-index: 1;
}

.fighter-reveal-move {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--color-white-5);
  border: 1px solid var(--color-border);
}

.fighter-reveal-move-skill {
  border-color: var(--color-cyan);
  background: rgba(0, 212, 255, 0.05);
}

.fighter-reveal-cta {
  position: relative;
  z-index: 1;
  text-align: center;
}
```

---

## Task 4: Integrate Reveal into MintFlowModal Success State

**File:** `src/components/generator/MintFlowModal.tsx`

Replace the current success screen (around lines 470-528) with the FighterRevealCard when combat data is available.

```tsx
{/* ── Success ── */}
{isSuccess && currentJob && (
  <div className="w-full flex flex-col gap-3">
    {/* Show Fighter Reveal if combat data available */}
    {currentJob.combat ? (
      <FighterRevealCard
        mintNumber={currentJob.mintNumber}
        customName={customName || undefined}
        combat={currentJob.combat}
        imageUrl={currentJob.imageUrl || undefined}
      />
    ) : (
      <>
        {/* Fallback: existing success UI for non-combat mints */}
        <div className="relative flex items-center justify-center" style={{ height: 0 }}>
          <div className="mint-celebrate-ring mint-celebrate-ring-1" ... />
          <div className="mint-celebrate-ring mint-celebrate-ring-2" ... />
          <div className="mint-celebrate-ring mint-celebrate-ring-3" ... />
        </div>
        <p className="text-secondary text-sm">
          Your Wojak #{currentJob.mintNumber}
        </p>
      </>
    )}

    {/* Free mint credit info (keep for both paths) */}
    {isFreeMint && (
      <p className="text-muted text-xs">
        {currentJob.creditsSpent ?? 1} {(currentJob.creditsSpent ?? 1) === 1 ? 'credit' : 'credits'} used.
        {currentJob.creditsRemaining != null && (
          <> {currentJob.creditsRemaining} remaining.</>
        )}
      </p>
    )}

    {/* Supply (keep) */}
    <p className="text-muted text-[10px] tabular-nums">
      {totalMinted}/{maxSupply} minted
    </p>

    {/* Action buttons (keep) */}
    {currentJob.mintgardenUrl && (
      <a href={currentJob.mintgardenUrl} ...>
        View on MintGarden
      </a>
    )}

    <div className="flex gap-2">
      <button type="button" className="btn btn-primary flex-1" onClick={handleClose}>
        Mint Another
      </button>
      <button type="button" className="btn btn-secondary flex-1 ..." onClick={handleShare}>
        <Share2 size={14} /> Share
      </button>
    </div>
  </div>
)}
```

Import the component:
```tsx
import { FighterRevealCard } from './FighterRevealCard';
```

---

## Task 5: Get Wojak Image URL for Reveal

The reveal card needs the minted Wojak's image. Check how the MintFlowModal has access to the image:

1. The image blob was passed to `prepareMint` — check if it's stored in state
2. If there's a `previewUrl` or `imageUrl` on the currentJob, use that
3. If neither: create an object URL from the pending image blob and pass it to the reveal

```typescript
// In MintFlowModal, when preparing the image URL:
const revealImageUrl = useMemo(() => {
  // Option 1: job has an image URL
  if (currentJob?.imageUrl) return currentJob.imageUrl;
  // Option 2: pending mint params have the blob
  if (pendingMintParams?.imageBlob) {
    return URL.createObjectURL(pendingMintParams.imageBlob);
  }
  return undefined;
}, [currentJob, pendingMintParams]);
```

Clean up the object URL on unmount to prevent memory leaks.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Visual styles in `src/styles/theme.css` — no inline color styles
- No `!important` in CSS
- Use framer-motion for animations (already in project deps)
- The reveal must work even if combat data is null (fallback to existing success screen)
- Use `getMoveById` from `src/lib/combat/data/moves.ts` to resolve move details for display
- Type colors should be in the component or a small shared constant, not in theme.css
