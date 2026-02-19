# Fight Club Hero Section — Enter the Arena

---

## Overview

Fight Club is the pitch page. When a visitor arrives, they need to instantly feel **fighting game energy** and understand the value loop: Create → Grind → Climb → Sell.

Add a hero section above the tab bar that sets the tone. This shows for ALL visitors — with or without wallet, with or without NFTs. It's the first thing they see.

---

## Task 1: Create FightClubHero Component

**File:** `src/components/combat/FightClubHero.tsx` (NEW)

A bold, fighting-game-energy hero section above the tabs.

```tsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, TrendingUp, Trophy, Flame } from 'lucide-react';

interface FightClubHeroProps {
  isHolder: boolean;  // Has Farmers Plot
  hasWojaks: boolean; // Has minted Wojaks
}

export function FightClubHero({ isHolder, hasWojaks }: FightClubHeroProps) {
  return (
    <div className="fight-club-hero">
      {/* Background glow effect */}
      <div className="fight-club-hero-glow" />

      {/* Main heading */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fight-club-hero-title"
      >
        <Swords size={28} className="text-primary" />
        <h1>Fight Club</h1>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="fight-club-hero-tagline"
      >
        Create your fighter. Climb the ranks. Sell at the top.
      </motion.p>

      {/* Value loop — 4 steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="fight-club-hero-loop"
      >
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'var(--color-primary-15)' }}>
            <Flame size={18} className="text-primary" />
          </div>
          <span className="hero-loop-label">Create</span>
        </div>
        <span className="hero-loop-arrow">→</span>
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
            <Swords size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <span className="hero-loop-label">Battle</span>
        </div>
        <span className="hero-loop-arrow">→</span>
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>
            <TrendingUp size={18} style={{ color: 'var(--color-cyan)' }} />
          </div>
          <span className="hero-loop-label">Climb</span>
        </div>
        <span className="hero-loop-arrow">→</span>
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
            <Trophy size={18} style={{ color: '#eab308' }} />
          </div>
          <span className="hero-loop-label">Profit</span>
        </div>
      </motion.div>

      {/* CTA — context-dependent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="fight-club-hero-cta"
      >
        {!hasWojaks ? (
          <Link to="/generator" className="btn btn-primary flex items-center gap-2">
            <Flame size={16} />
            Create Your Fighter
          </Link>
        ) : (
          <p className="text-xs text-secondary">
            You have fighters ready. Choose a tab below to get started.
          </p>
        )}
      </motion.div>
    </div>
  );
}
```

### Key design decisions:
- **Always visible** — even for holders. The hero anchors the brand.
- **Compact** — not a full-page splash. ~120px tall so tabs are still immediately visible.
- **Context-aware CTA** — non-holders see "Create Your Fighter" button. Holders see a subtle hint.
- **Fighting game energy** — bold title, dark background with glow, icon steps with arrows.
- **Dismissible?** — No. It's compact enough to always show. It's brand identity, not a banner.

---

## Task 2: Add Hero Styles to theme.css

**File:** `src/styles/theme.css`

```css
/* Fight Club Hero */
.fight-club-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px 20px;
  margin-bottom: 12px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.fight-club-hero-glow {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 100px;
  background: radial-gradient(ellipse at center, var(--color-primary-15) 0%, transparent 70%);
  pointer-events: none;
}

.fight-club-hero-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
}

.fight-club-hero-title h1 {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.fight-club-hero-tagline {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.fight-club-hero-loop {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.hero-loop-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hero-loop-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-loop-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.hero-loop-arrow {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin-top: -16px;
}

.fight-club-hero-cta {
  position: relative;
  z-index: 1;
}

/* Desktop: wider layout */
@media (min-width: 768px) {
  .fight-club-hero {
    padding: 28px 32px 24px;
  }
  .fight-club-hero-title h1 {
    font-size: 1.75rem;
  }
  .fight-club-hero-loop {
    gap: 12px;
  }
  .hero-loop-icon {
    width: 42px;
    height: 42px;
  }
}
```

---

## Task 3: Integrate Hero into FightClub.tsx

**File:** `src/pages/FightClub.tsx`

Add the hero above the tab bar in the main render:

```tsx
import { FightClubHero } from '@/components/combat/FightClubHero';

// Inside the main return (around line 389-414):
return (
  <PageTransition>
    <div style={{ padding: contentPadding, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Hero Section — always visible */}
      <FightClubHero
        isHolder={!!accessData?.hasAccess}
        hasWojaks={(accessData?.wojakCount ?? 0) > 0}
      />

      {/* Tab Bar */}
      <div className="flex items-center gap-2">
        <div className="fight-club-tabs flex-1">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" className={`fight-club-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => handleTabClick(tab)}>
              {tab.label}
            </button>
          ))}
        </div>
        {playerDid && <RefreshButton did={playerDid} />}
      </div>

      {/* ... rest unchanged */}
    </div>
  </PageTransition>
);
```

**Important:** The hero should also show when the wallet is NOT connected and the tab is vote or rankings (the ungated tabs). Check the early returns — make sure the hero renders before any gate/loading checks for ungated tabs.

Currently, the logic is:
- Not connected + gated tab → ConnectWalletPrompt (full page)
- Not connected + ungated tab → falls through to main render ✅

The hero will show for the ungated path. For the gated path (battle/burn without wallet), the ConnectWalletPrompt replaces everything. That's OK — those users need to connect first.

However, consider: should the hero show even in the ConnectWalletPrompt and FightClubGate? It would reinforce the brand. If so, add the hero component above the gate content too.

---

## Task 4: Show Hero in Gate Screen Too

**File:** `src/pages/FightClub.tsx`

Update `FightClubGate` to include the hero above the gate card:

```tsx
function FightClubGate() {
  const { contentPadding } = useLayout();
  const { data: floorPrice } = useFloorPrice();

  return (
    <PageTransition>
      <div style={{ padding: contentPadding, minHeight: '60vh' }} className="flex flex-col items-center gap-4">
        {/* Hero at top even on gate */}
        <FightClubHero isHolder={false} hasWojaks={false} />

        {/* Existing gate card below */}
        <div className="card-static p-8 max-w-md text-center">
          {/* ... existing gate content ... */}
        </div>
      </div>
    </PageTransition>
  );
}
```

Same for `ConnectWalletPrompt` — add the hero above the connect card.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Visual styles in `src/styles/theme.css`
- No `!important`
- Fighting game energy: bold, uppercase title, dark tones, neon accents
- Hero is compact (~120-140px) — tabs must still be visible without scrolling on mobile
- Use framer-motion for entrance animations (already in deps)
- The CTA links to `/generator` for non-holders
