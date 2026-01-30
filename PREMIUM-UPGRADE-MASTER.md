# Wojak.ink Premium Upgrade — Master Implementation Guide

## Current State (January 29, 2026)

The codebase has been thoroughly cleaned and optimized:

| Metric | Status |
|--------|--------|
| TypeScript errors | 0 ✓ |
| ESLint errors | 0 ✓ |
| ESLint warnings | 153 (all `no-console` in server code) |
| Bundle size | 63% smaller (chunk splitting done) |
| Layout | Fixed (restored `@theme`, `body`, `#root` styles) |
| Games lazy-loaded | Yes ✓ |
| Duplicate code | Eliminated (ChatRoom.tsx extracted) |

**Branch:** `main`
**Stack:** React + Vite + Tailwind CSS v4 + Framer Motion

---

## Architecture Notes

### Critical: CSS Structure

```
src/
├── index.css          ← @theme block (Tailwind v4 tokens) + body/#root styles
│                        DO NOT MODIFY @theme block without server restart
├── styles/
│   └── theme.css      ← Visual styles (colors, cards, buttons, animations)
│                        ADD all new premium styles HERE
```

**Important:** Tailwind v4 `@theme` changes require dev server restart. They are NOT hot-reloaded.

### File Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Styles: `kebab-case.css`

---

## The Premium Upgrade: 5 Pillars

### Pillar 1: Visual Premium (CSS)
Add glassmorphism, rarity glows, micro-interactions, scroll animations.

### Pillar 2: Info Button System (UX)
On-demand help via floating (ⓘ) button on each page.

### Pillar 3: BigPulp AI Enhancement (Critical)
Streaming UI, response cards, Matrix terminal aesthetic.

### Pillar 4: Account Identity
Avatar hero, animated stats, achievement showcase.

### Pillar 5: Cleanup & Polish
Hide "Coming Soon", consolidate sidebars, consistent spacing.

---

## Implementation Files

| File | Purpose |
|------|---------|
| `CSS-PREMIUM-ADDITIONS.md` | Exact CSS to append to theme.css |
| `BIGPULP-AI-ENHANCEMENT.md` | Complete BigPulp upgrade code |
| `COMPONENT-UPGRADES.md` | Specific component modifications |
| `CLAUDE-CLI-EXECUTION-GUIDE.md` | Step-by-step execution order |

---

## Pillar 1: Visual Premium

### 1.1 New CSS Variables

Add to `src/styles/theme.css` `:root` section:

```css
/* Rarity System */
--rarity-common: #9CA3AF;
--rarity-uncommon: #22C55E;
--rarity-rare: #3B82F6;
--rarity-epic: #A855F7;
--rarity-legendary: #FFD700;
--rarity-mythic: #FF6B6B;

/* Rarity Glows */
--glow-legendary: 0 0 30px rgba(255, 215, 0, 0.4);
--glow-epic: 0 0 25px rgba(168, 85, 247, 0.4);
--glow-rare: 0 0 20px rgba(59, 130, 246, 0.4);

/* Matrix Theme (BigPulp) */
--matrix-green: #00FF41;
--matrix-green-dim: rgba(0, 255, 65, 0.3);
--matrix-green-glow: 0 0 20px rgba(0, 255, 65, 0.4);

/* Glass Morphism */
--glass-bg: rgba(255, 255, 255, 0.03);
--glass-bg-hover: rgba(255, 255, 255, 0.06);
--glass-border: rgba(255, 255, 255, 0.08);
--glass-border-active: rgba(255, 107, 0, 0.3);
```

### 1.2 Premium Card Styles

```css
/* Glass Card */
.card-premium {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.card-premium:hover {
  border-color: var(--glass-border-active);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 107, 0, 0.1);
  transform: translateY(-2px);
}

/* NFT Card with Rarity Glow */
.nft-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
}

.nft-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  padding: 1px;
  background: linear-gradient(135deg, transparent 0%, var(--rarity-glow, transparent) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.nft-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.nft-card:hover::before {
  opacity: 1;
}

/* Rarity variants */
.nft-card.rarity-common { --rarity-glow: var(--rarity-common); }
.nft-card.rarity-uncommon { --rarity-glow: var(--rarity-uncommon); }
.nft-card.rarity-rare { --rarity-glow: var(--rarity-rare); }
.nft-card.rarity-epic { --rarity-glow: var(--rarity-epic); }
.nft-card.rarity-legendary { --rarity-glow: var(--rarity-legendary); }
.nft-card.rarity-mythic { --rarity-glow: var(--rarity-mythic); }

.nft-card.rarity-legendary:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), var(--glow-legendary);
}

.nft-card.rarity-epic:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), var(--glow-epic);
}
```

### 1.3 Loading States

```css
/* Skeleton Shimmer */
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Spinner */
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 1.4 Button Enhancements

```css
/* Upgrade existing btn-primary with gradient */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, #EA580C 100%);
  color: var(--color-text-inverse);
  box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
  box-shadow: var(--glow-primary), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

/* Glass Button */
.btn-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  color: var(--color-text);
}

.btn-glass:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-active);
  box-shadow: 0 0 20px rgba(255, 107, 0, 0.1);
}

/* Icon Button */
.btn-icon {
  width: 44px;
  height: 44px;
  padding: 0;
}
```

### 1.5 Scroll-Driven Animations (Progressive Enhancement)

```css
/* Only apply if browser supports */
@supports (animation-timeline: scroll()) {
  /* Gallery scroll progress indicator */
  .gallery-scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--color-primary);
    transform-origin: left;
    transform: scaleX(0);
    animation: scroll-progress linear;
    animation-timeline: scroll(root);
    z-index: 100;
  }

  @keyframes scroll-progress {
    to { transform: scaleX(1); }
  }

  /* NFT cards fade in on scroll */
  .nft-card-animated {
    animation: fade-in-up linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

---

## Pillar 2: Info Button System

### 2.1 Component: InfoButton.tsx

**Location:** `src/components/common/InfoButton.tsx`

```tsx
import { Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Lightbox } from '@/components/ui/Lightbox';
import { PageInfoContent } from './PageInfoContent';

type PageId = 'gallery' | 'bigpulp' | 'generator' | 'games' | 'leaderboard' | 'chat' | 'account' | 'shop' | 'treasury';

interface InfoButtonProps {
  page: PageId;
}

export function InfoButton({ page }: InfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenInfo, setHasSeenInfo] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const seen = localStorage.getItem(`info-seen-${page}`);
    setHasSeenInfo(!!seen);
  }, [page]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    localStorage.setItem(`info-seen-${page}`, 'true');
    setHasSeenInfo(true);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`info-button ${hasSeenInfo ? 'seen' : ''}`}
        aria-label="Page information and tips"
      >
        <Info size={18} />
      </button>

      <Lightbox isOpen={isOpen} onClose={handleClose}>
        <PageInfoContent page={page} />
      </Lightbox>
    </>
  );
}
```

### 2.2 CSS for Info Button

```css
/* Info Button */
.info-button {
  position: fixed;
  bottom: max(80px, calc(env(safe-area-inset-bottom) + 60px));
  right: max(16px, env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 107, 0, 0.9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4);
  transition: all 0.2s ease;
  z-index: 45;
}

.info-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(255, 107, 0, 0.5);
}

.info-button:active {
  transform: scale(0.95);
}

/* Pulse animation for first-time visitors */
.info-button:not(.seen) {
  animation: info-pulse 2s ease-in-out 3;
  animation-delay: 2s;
}

@keyframes info-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 6px 25px rgba(255, 107, 0, 0.6);
  }
}

@media (min-width: 768px) {
  .info-button {
    bottom: 24px;
    right: 24px;
  }
}
```

### 2.3 PageInfoContent.tsx

**Location:** `src/components/common/PageInfoContent.tsx`

See `COMPONENT-UPGRADES.md` for full implementation with all page content.

---

## Pillar 3: BigPulp AI Enhancement

**This is the most critical upgrade.** See `BIGPULP-AI-ENHANCEMENT.md` for complete implementation.

Key features:
- Streaming response indicator with stages
- Structured AI response cards (NFT grids, stats, charts)
- Matrix terminal aesthetic
- Contextual quick prompts
- Memory display

---

## Pillar 4: Account Identity

### 4.1 ProfileHero Component

**Location:** `src/components/Account/ProfileHero.tsx`

```tsx
import { Pencil, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProfileHeroProps {
  user: {
    username: string;
    avatar: string;
    walletAddress: string;
    joinedAt: string;
  };
  onEditAvatar: () => void;
}

export function ProfileHero({ user, onEditAvatar }: ProfileHeroProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="profile-hero">
      <motion.div
        className="avatar-container"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="avatar-wrapper">
          <img
            src={user.avatar}
            alt={user.username}
            className="avatar-image"
          />
          <button
            onClick={onEditAvatar}
            className="avatar-edit-btn"
            aria-label="Edit avatar"
          >
            <Pencil size={14} />
          </button>
        </div>
      </motion.div>

      <div className="user-info">
        <h1 className="username">{user.username}</h1>
        <button onClick={copyAddress} className="wallet-address">
          <span className="font-mono">{truncateAddress(user.walletAddress)}</span>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <span className="join-date">
          Operator since {new Date(user.joinedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
```

### 4.2 QuickStats Component

**Location:** `src/components/Account/QuickStats.tsx`

```tsx
import { Zap, Trophy, Image, Gamepad } from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';

interface QuickStatsProps {
  stats: {
    points: number;
    rank: number;
    nftCount: number;
    gamesPlayed: number;
  };
}

function AnimatedNumber({ value }: { value: number }) {
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: value },
    config: { tension: 50, friction: 14 },
  });

  return (
    <animated.span className="stat-value">
      {number.to(n => Math.floor(n).toLocaleString())}
    </animated.span>
  );
}

export function QuickStats({ stats }: QuickStatsProps) {
  const statItems = [
    { icon: Zap, label: 'Points', value: stats.points, color: 'orange' },
    { icon: Trophy, label: 'Rank', value: stats.rank, color: 'gold', prefix: '#' },
    { icon: Image, label: 'Wojaks', value: stats.nftCount, color: 'cyan' },
    { icon: Gamepad, label: 'Games', value: stats.gamesPlayed, color: 'purple' },
  ];

  return (
    <div className="quick-stats">
      {statItems.map(item => (
        <div key={item.label} className={`stat-card stat-${item.color}`}>
          <item.icon size={20} className="stat-icon" />
          <div className="stat-value-wrapper">
            {item.prefix && <span>{item.prefix}</span>}
            <AnimatedNumber value={item.value} />
          </div>
          <span className="stat-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
```

### 4.3 CSS for Account Components

```css
/* Profile Hero */
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8) var(--space-4);
  gap: var(--space-4);
  text-align: center;
}

.avatar-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid rgba(255, 107, 0, 0.3);
  box-shadow: 0 0 30px rgba(255, 107, 0, 0.2);
  object-fit: cover;
  transition: all 0.3s ease;
}

.avatar-wrapper:hover .avatar-image {
  border-color: rgba(255, 107, 0, 0.5);
  box-shadow: 0 0 40px rgba(255, 107, 0, 0.3);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-bg);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.avatar-edit-btn:hover {
  transform: scale(1.1);
}

.username {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.wallet-address {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wallet-address:hover {
  background: var(--glass-bg-hover);
  border-color: var(--color-primary);
}

.join-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Quick Stats Grid */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  padding: 0 var(--space-4);
  width: 100%;
  max-width: 600px;
}

@media (max-width: 640px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  gap: var(--space-1);
  transition: all 0.2s ease;
}

.stat-card:hover {
  background: var(--glass-bg-hover);
  transform: translateY(-2px);
}

.stat-orange .stat-icon { color: var(--color-primary); }
.stat-gold .stat-icon { color: #FFD700; }
.stat-cyan .stat-icon { color: #06B6D4; }
.stat-purple .stat-icon { color: #A855F7; }

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## Pillar 5: Cleanup & Polish

### 5.1 Hide Coming Soon Features

**Files to modify:**

| File | Change |
|------|--------|
| `src/pages/GamesHub.tsx` | Filter `games.filter(g => !g.comingSoon)` for main grid |
| `src/pages/Shop.tsx` | Filter `categories.filter(c => c.items.length > 0)` |
| `src/config/routes.ts` | Add `hidden: true` to Guild nav item |
| `src/pages/Settings.tsx` | Remove "Coming Soon" settings rows |

### 5.2 Games Hub Sidebar Consolidation

**Current:** Left sidebar (Top Scores) + Right sidebar (Your Scores)
**New:** Single right sidebar with both sections

```tsx
// src/pages/GamesHub.tsx - new layout
<div className="games-layout">
  <main className="games-main">
    <div className="games-grid">
      {playableGames.map(game => <GameCard key={game.id} game={game} />)}
    </div>
  </main>

  <aside className="games-sidebar">
    <section className="sidebar-section">
      <h3>Your Scores</h3>
      <ScoresList scores={userScores} limit={5} />
    </section>
    <section className="sidebar-section">
      <h3>Top Operators</h3>
      <ScoresList scores={globalScores} limit={5} />
    </section>
  </aside>
</div>
```

### 5.3 Consistent Page Spacing

```css
/* Standard page layout */
.page-container {
  padding: var(--space-6);
  max-width: 1400px;
  margin: 0 auto;
}

.page-section {
  margin-bottom: var(--space-8);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}
```

---

## Dependencies Check

Before implementation, verify these packages are installed:

```bash
# Should already be installed
npm ls framer-motion    # For animations
npm ls lucide-react     # For icons
npm ls @react-spring/web # For number animations (may need to install)

# Install if missing
npm install @react-spring/web
```

---

## Verification Checklist

After implementation, verify:

- [ ] `npm run build` — No errors
- [ ] `npm run lint` — No new errors
- [ ] Dev server shows layout correctly (not shrunken)
- [ ] NFT cards glow by rarity on hover
- [ ] Info button (ⓘ) visible on all pages
- [ ] Info button pulses on first visit, stops after viewing
- [ ] BigPulp shows streaming indicator when AI responds
- [ ] Account page has large avatar with edit button
- [ ] Stats cards animate numbers on load
- [ ] No "Coming Soon" items in main navigation
- [ ] Games hub has single sidebar (right side)

---

## Estimated Time

| Phase | Duration |
|-------|----------|
| CSS Premium Additions | 20 min |
| Info Button System | 25 min |
| BigPulp AI Enhancement | 40 min |
| Account Page Upgrade | 25 min |
| Cleanup & Polish | 20 min |
| Testing & Fixes | 20 min |
| **Total** | **~2.5 hours** |

---

*Master Implementation Guide for Wojak.ink Premium Upgrade*
*Created: January 29, 2026*
*Codebase Status: Clean (0 errors)*
