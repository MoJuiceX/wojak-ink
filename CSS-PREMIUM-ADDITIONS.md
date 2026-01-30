# CSS Premium Additions

## Instructions

**APPEND** all CSS below to `src/styles/theme.css`.
Do NOT modify `src/index.css` (contains critical `@theme` block).

---

## 1. Add to `:root` Section

Add these variables inside the existing `:root { }` block:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   RARITY SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */

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
--glow-uncommon: 0 0 15px rgba(34, 197, 94, 0.3);

/* ═══════════════════════════════════════════════════════════════════════════
   MATRIX THEME (BigPulp AI)
   ═══════════════════════════════════════════════════════════════════════════ */

--matrix-green: #00FF41;
--matrix-green-dim: rgba(0, 255, 65, 0.3);
--matrix-green-glow: 0 0 20px rgba(0, 255, 65, 0.4);

/* ═══════════════════════════════════════════════════════════════════════════
   GLASS MORPHISM
   ═══════════════════════════════════════════════════════════════════════════ */

--glass-bg: rgba(255, 255, 255, 0.03);
--glass-bg-hover: rgba(255, 255, 255, 0.06);
--glass-border: rgba(255, 255, 255, 0.08);
--glass-border-active: rgba(255, 107, 0, 0.3);
```

---

## 2. Premium Cards Section

Add after existing card styles:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM CARDS (Glass Effect)
   ═══════════════════════════════════════════════════════════════════════════ */

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
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.card-premium:hover {
  border-color: var(--glass-border-active);
  box-shadow:
    0 8px 30px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 107, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}


/* ═══════════════════════════════════════════════════════════════════════════
   NFT CARDS (With Rarity Glow)
   ═══════════════════════════════════════════════════════════════════════════ */

.nft-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Rarity glow border effect */
.nft-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  padding: 1px;
  background: linear-gradient(
    135deg,
    transparent 0%,
    var(--rarity-glow, transparent) 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
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

/* Rarity class variants */
.nft-card.rarity-common { --rarity-glow: var(--rarity-common); }
.nft-card.rarity-uncommon { --rarity-glow: var(--rarity-uncommon); }
.nft-card.rarity-rare { --rarity-glow: var(--rarity-rare); }
.nft-card.rarity-epic { --rarity-glow: var(--rarity-epic); }
.nft-card.rarity-legendary { --rarity-glow: var(--rarity-legendary); }
.nft-card.rarity-mythic { --rarity-glow: var(--rarity-mythic); }

/* Enhanced hover glow for high rarities */
.nft-card.rarity-legendary:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), var(--glow-legendary);
}

.nft-card.rarity-epic:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), var(--glow-epic);
}

.nft-card.rarity-rare:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), var(--glow-rare);
}


/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARDS
   ═══════════════════════════════════════════════════════════════════════════ */

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

.stat-card .stat-icon {
  margin-bottom: var(--space-1);
}

.stat-card.stat-orange .stat-icon { color: var(--color-primary); }
.stat-card.stat-gold .stat-icon { color: #FFD700; }
.stat-card.stat-cyan .stat-icon { color: #06B6D4; }
.stat-card.stat-purple .stat-icon { color: #A855F7; }

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


/* ═══════════════════════════════════════════════════════════════════════════
   GAME CARDS
   ═══════════════════════════════════════════════════════════════════════════ */

.game-card {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  text-align: center;
  transition: all 0.3s ease;
}

.game-card:hover {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.03) 100%
  );
  border-color: var(--glass-border-active);
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 0 30px rgba(255, 107, 0, 0.1);
}
```

---

## 3. Enhanced Buttons Section

Update/add to existing button styles:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   ENHANCED BUTTONS
   ═══════════════════════════════════════════════════════════════════════════ */

/* Primary Button - Gradient */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, #EA580C 100%);
  color: var(--color-text-inverse);
  box-shadow:
    0 2px 8px rgba(255, 107, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
  box-shadow:
    var(--glow-primary),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
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

.btn-icon.btn-sm {
  width: 36px;
  height: 36px;
}

.btn-icon.btn-lg {
  width: 52px;
  height: 52px;
}
```

---

## 4. Loading States Section

```css
/* ═══════════════════════════════════════════════════════════════════════════
   LOADING STATES
   ═══════════════════════════════════════════════════════════════════════════ */

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

.skeleton-text {
  height: 1em;
  border-radius: var(--radius-sm);
}

.skeleton-avatar {
  border-radius: var(--radius-full);
}

.skeleton-card {
  border-radius: var(--radius-lg);
}

/* Spinner */
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
}

.spinner-lg {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 5. Info Button Section

```css
/* ═══════════════════════════════════════════════════════════════════════════
   INFO BUTTON
   ═══════════════════════════════════════════════════════════════════════════ */

.info-button {
  position: fixed;
  bottom: max(80px, calc(env(safe-area-inset-bottom) + 60px));
  right: max(16px, env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
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

/* Info Content Styles */
.page-info-content {
  max-width: 500px;
  padding: var(--space-6);
}

.info-header {
  text-align: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--glass-border);
}

.info-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.info-tagline {
  color: var(--color-primary);
  font-size: 0.875rem;
}

.info-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.info-section {
  display: flex;
  gap: var(--space-3);
}

.section-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: rgba(255, 107, 0, 0.1);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-content h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-2);
  color: var(--color-text);
}

.section-content p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.section-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.section-content li {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding-left: var(--space-4);
  position: relative;
  margin-bottom: var(--space-1);
}

.section-content li::before {
  content: "→";
  position: absolute;
  left: 0;
  color: var(--color-primary);
}
```

---

## 6. Account Page Styles

```css
/* ═══════════════════════════════════════════════════════════════════════════
   ACCOUNT / PROFILE
   ═══════════════════════════════════════════════════════════════════════════ */

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
  border-radius: var(--radius-full);
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
  border-radius: var(--radius-full);
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

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
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
  margin: 0 auto;
}

@media (max-width: 640px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## 7. BigPulp / Matrix Theme

```css
/* ═══════════════════════════════════════════════════════════════════════════
   BIGPULP / MATRIX THEME
   ═══════════════════════════════════════════════════════════════════════════ */

.bigpulp-container {
  position: relative;
  background: var(--color-bg);
}

/* Subtle scanline effect */
.bigpulp-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 255, 65, 0.02) 0px,
    rgba(0, 255, 65, 0.02) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  opacity: 0.5;
  z-index: 1;
}

.bigpulp-chat {
  position: relative;
  z-index: 2;
}

/* Input with Matrix styling */
.bigpulp-input-wrapper {
  position: relative;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(0, 255, 65, 0.1);
}

.bigpulp-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  padding-right: 52px;
  background: rgba(0, 255, 65, 0.03);
  border: 1px solid rgba(0, 255, 65, 0.2);
  border-radius: var(--radius-md);
  color: var(--matrix-green);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  caret-color: var(--matrix-green);
  transition: all 0.2s ease;
}

.bigpulp-input::placeholder {
  color: rgba(0, 255, 65, 0.4);
}

.bigpulp-input:focus {
  outline: none;
  border-color: rgba(0, 255, 65, 0.5);
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.1);
}

.bigpulp-submit {
  position: absolute;
  right: calc(var(--space-4) + var(--space-2));
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--matrix-green);
  color: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bigpulp-submit:hover {
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
}

.bigpulp-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Streaming Indicator */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: rgba(0, 255, 65, 0.05);
  border: 1px solid rgba(0, 255, 65, 0.2);
  border-radius: var(--radius-md);
  color: var(--matrix-green);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.streaming-dots {
  display: flex;
  gap: 4px;
}

.streaming-dots span {
  width: 6px;
  height: 6px;
  background: var(--matrix-green);
  border-radius: var(--radius-full);
  animation: dot-pulse 1.4s ease-in-out infinite;
}

.streaming-dots span:nth-child(2) { animation-delay: 0.2s; }
.streaming-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Quick Prompts */
.quick-prompts {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--glass-border);
}

.quick-prompts-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.prompt-chip {
  padding: var(--space-2) var(--space-3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prompt-chip:hover:not(:disabled) {
  background: var(--glass-bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.prompt-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mascot */
.bigpulp-hero {
  padding: var(--space-6);
  text-align: center;
}

.mascot-container {
  position: relative;
  display: inline-block;
}

.mascot-image {
  width: 200px;
  height: auto;
  filter: drop-shadow(0 0 30px rgba(0, 255, 65, 0.3));
  transition: filter 0.3s ease;
}

.mascot-container:hover .mascot-image {
  filter: drop-shadow(0 0 40px rgba(0, 255, 65, 0.5));
}

.mascot-speech-bubble {
  position: absolute;
  top: 10%;
  right: -150px;
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid rgba(0, 255, 65, 0.3);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  max-width: 180px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--matrix-green);
}

@media (max-width: 768px) {
  .mascot-speech-bubble {
    position: static;
    margin-top: var(--space-3);
    max-width: 100%;
  }
}
```

---

## 8. Tabs & Navigation

```css
/* ═══════════════════════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════════════════════ */

.tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--glass-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-5);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover:not(.tab-active) {
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.tab-active {
  background: var(--color-primary-muted);
  color: var(--color-primary);
  box-shadow: 0 0 20px rgba(255, 107, 0, 0.1);
}
```

---

## 9. Rarity Badges

```css
/* ═══════════════════════════════════════════════════════════════════════════
   RARITY BADGES
   ═══════════════════════════════════════════════════════════════════════════ */

.rarity-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
}

.rarity-badge-legendary {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.1) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  color: var(--rarity-legendary);
}

.rarity-badge-epic {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: var(--rarity-epic);
}

.rarity-badge-rare {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--rarity-rare);
}

.rarity-badge-uncommon {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: var(--rarity-uncommon);
}

.rarity-badge-common {
  background: rgba(156, 163, 175, 0.15);
  border: 1px solid rgba(156, 163, 175, 0.3);
  color: var(--rarity-common);
}
```

---

## 10. Glow Animations

```css
/* ═══════════════════════════════════════════════════════════════════════════
   GLOW ANIMATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 0, 0.3); }
  50% { box-shadow: 0 0 30px rgba(255, 107, 0, 0.5); }
}

.glow-pulse {
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse-gold {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 35px rgba(255, 215, 0, 0.6); }
}

.glow-pulse-gold {
  animation: glow-pulse-gold 2s ease-in-out infinite;
}

@keyframes glow-pulse-matrix {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 65, 0.3); }
  50% { box-shadow: 0 0 30px rgba(0, 255, 65, 0.5); }
}

.glow-pulse-matrix {
  animation: glow-pulse-matrix 2s ease-in-out infinite;
}
```

---

## 11. Scroll-Driven Animations (Progressive Enhancement)

```css
/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL-DRIVEN ANIMATIONS (Progressive Enhancement)
   Only applies in browsers that support animation-timeline
   ═══════════════════════════════════════════════════════════════════════════ */

@supports (animation-timeline: scroll()) {
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

## Verification

After adding all CSS:

```bash
npm run build
```

Expected: No CSS errors, build succeeds.

---

*CSS Premium Additions for theme.css*
*Copy-paste ready*
*January 29, 2026*
