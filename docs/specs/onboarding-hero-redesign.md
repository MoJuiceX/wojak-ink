# Onboarding Hero Redesign

> **Purpose:** Replace the sparse gate checklist + redundant side-panel experience with a full-width premium onboarding page.
> **Problem:** When a user lands on `/swipe`, they see a 3-column layout where:
> - The center has a tiny 380px gate checklist card floating in empty space
> - The left panel shows a "POWER LEVEL" leaderboard irrelevant to someone who hasn't started playing
> - The right panel either shows nothing (pre-DID) or a "YOUR GAME" panel with a redundant "Getting Started" 5-step checklist (post-DID)
> - Two competing checklists are visible simultaneously (gate steps center + getting started right)
> - Tons of empty dark space, no branding, no explanation of what the game IS
> **Solution:** Bypass the 3-column voting layout during gate state. Render a full-width hero page with branding, visual polish, an upgraded gate stepper, feature explainer cards, and social proof.

---

## Architecture

### Render Flow Change

**Current:**
```
GameVoting.tsx
  └── VotingPageDesktop (3-col grid — always renders)
        ├── MiniLeaderboard (left — always renders, even during gate)
        ├── VotingFeed (center) ──> GateChecklist (if gate not passed)
        └── VotingStatsPanel (right — renders after DID linked, shows YOUR GAME + Getting Started)
```

**New:**
```
GameVoting.tsx
  ├── Gate not passed? ──> <OnboardingHero />  (full-width, replaces entire 3-col)
  └── Gate passed?     ──> <VotingPageDesktop /> or <VotingPageMobile />
```

The gate state check moves **up** from VotingFeed into GameVoting. When the gate is not passed, the entire 3-column layout is skipped — no leaderboard, no stats panel, no redundant checklists.

### Files Changed

| File | Action | What |
|------|--------|------|
| `src/components/game/OnboardingHero.tsx` | **CREATE** | New full-width onboarding component |
| `src/pages/GameVoting.tsx` | **MODIFY** | Add gate check, render OnboardingHero when gate not passed |
| `src/components/game/GateChecklist.tsx` | **MODIFY** | Visual upgrade: SVG icons, connecting line, glow states. Preserve ALL 3 callback props (`onLinkDid`, `onAutoVerify`, `onVerifyNft`), DID input form, NFT auto-verify + manual fallback flow. |
| `src/components/game/VotingFeed.tsx` | **MODIFY** | Remove gate checklist rendering (moved up to GameVoting) |
| `src/styles/theme.css` | **MODIFY** | Add ~100 lines of onboarding hero CSS, replace old gate CSS |

### Files NOT Changed

- `MiniLeaderboard.tsx` — just won't render during gate state
- `VotingStatsPanel.tsx` — just won't render during gate state (eliminates redundant Getting Started checklist)
- `OnboardingChecklist.tsx` — untouched (it'll still show post-gate inside VotingStatsPanel)
- `SwipeAutoRegister.tsx` — still runs as invisible side-effect
- `MobileStatsBar.tsx` — no change

---

## Component: OnboardingHero.tsx

### Props
```ts
interface OnboardingHeroProps {
  walletConnected: boolean;
  hasDid: boolean;
  hasPhase1: boolean;
  onLinkDid?: (did: string) => Promise<void>;
  onAutoVerify?: () => Promise<boolean>;
  onVerifyNft?: (nftId: string) => Promise<boolean>;
}
```

All three callbacks are passed through to GateChecklist:
- `onLinkDid` — registers the user's DID (step 1)
- `onAutoVerify` — auto-checks the user's DID for Phase 1 NFTs (step 2, fires automatically)
- `onVerifyNft` — manual fallback: verifies a specific NFT launcher ID (step 2 fallback)

### Desktop Layout (min-width: 768px)

```
.onboarding-hero (full-width, radial gradient bg, centered content)
  │
  ├── .onboarding-hero-content (max-width: 900px, centered)
  │     │
  │     ├── .onboarding-hero-split (CSS grid: 1fr 1fr, gap 48px)
  │     │     │
  │     │     ├── LEFT: .onboarding-hero-brand
  │     │     │     ├── <h1> "WOJAK SWIPE" (32px, bold, white)
  │     │     │     ├── <p>  "Vote. Battle. Burn." (20px, --color-primary, font-weight 600)
  │     │     │     ├── <p>  "Shape which Wojaks rise and which get burned.
  │     │     │     │         The community decides." (text-secondary, 15px)
  │     │     │     └── .preview-card-fan (decorative fanned ghost cards)
  │     │     │
  │     │     └── RIGHT: <GateChecklist /> (upgraded, with DID input form)
  │     │
  │     ├── .onboarding-features (CSS grid: repeat(3, 1fr), gap 16px, margin-top 48px)
  │     │     ├── Feature card: Vote   (heart icon, orange tint)
  │     │     ├── Feature card: Battle (swords icon, cyan tint)
  │     │     └── Feature card: Burn   (flame icon, red tint)
  │     │
  │     └── .onboarding-stats (centered text-muted, margin-top 32px)
  │           "Join the Wojak metagame"
  │
  └── (end)
```

### Mobile Layout (max-width: 767px)

```
.onboarding-hero (full-width, same gradient bg)
  │
  ├── .onboarding-hero-content (padding: 24px 16px)
  │     │
  │     ├── Heading centered: "WOJAK SWIPE" + tagline (no preview cards on mobile)
  │     │
  │     ├── <GateChecklist /> (full-width, with DID input form)
  │     │
  │     ├── .onboarding-features (single column, gap 12px)
  │     │     ├── Feature card: Vote
  │     │     ├── Feature card: Battle
  │     │     └── Feature card: Burn
  │     │
  │     └── .onboarding-stats
  │
  └── (end)
```

### Decorative Preview Card Fan

Three empty card outlines fanned at angles. Pure CSS, no images:

```tsx
<div className="preview-card-fan">
  <div className="preview-card-ghost" style={{ transform: 'rotate(-8deg) translateX(-20px)' }} />
  <div className="preview-card-ghost" style={{ transform: 'rotate(0deg)' }} />
  <div className="preview-card-ghost" style={{ transform: 'rotate(8deg) translateX(20px)' }} />
</div>
```

Each ghost card: 120px wide, 160px tall, `--color-surface` bg, 1px `--color-border` border, `--radius-lg` corners. The center card gets a subtle `--glow-primary` box-shadow. The fan container has `margin-top: 32px`.

### Feature Cards

Each feature card uses the existing `.card` class for hover glow. Structure:

```tsx
<div className="card p-5 flex flex-col items-center gap-3 text-center">
  <div className="feature-card-icon" style={{ background: 'rgba(255, 107, 0, 0.12)' }}>
    {/* Inline SVG icon */}
  </div>
  <h3 className="font-semibold text-sm">Vote</h3>
  <p className="text-secondary text-xs">Swipe through community Wojaks. Your votes shape the meta.</p>
</div>
```

Icon background tints by feature:
- Vote: `rgba(255, 107, 0, 0.12)` (orange)
- Battle: `rgba(0, 212, 255, 0.12)` (cyan)
- Burn: `rgba(239, 68, 68, 0.12)` (red)

Icon stroke/fill colors:
- Vote: `var(--color-primary)`
- Battle: `var(--color-cyan)`
- Burn: `var(--color-error)`

### Stats Strip

Static text initially — no API call:
```tsx
<p className="onboarding-stats">Join the Wojak metagame</p>
```

---

## Component: GateChecklist.tsx (Visual Upgrade)

### CRITICAL: Preserve Existing Functionality

The GateChecklist has been extensively updated. It now has:

**Props (3 callbacks):**
- `onLinkDid?: (did: string) => Promise<void>` — registers DID
- `onAutoVerify?: () => Promise<boolean>` — auto-checks DID for Phase 1 NFTs
- `onVerifyNft?: (nftId: string) => Promise<boolean>` — manual NFT launcher ID verification

**DID input (step 1):**
- `isValidDid()` validation function
- `useState` hooks: `didInput`, `didError`, `linking`
- `handleLinkDid` async handler
- Input field, error display, "Link DID" button, "Learn how" link

**NFT verification (step 2) — auto-verify + manual fallback:**
- `VerifyState` type: `'idle' | 'checking' | 'not_found' | 'error'`
- `isValidNftId()` validation function
- `useState` hooks: `verifyState`, `showManual`, `nftInput`, `nftError`, `verifyingNft`
- `autoVerifyAttempted` ref to prevent double-checking
- `useEffect` that auto-triggers `onAutoVerify` when step 3 becomes active
- `useEffect` that resets state when step 3 becomes inactive
- `handleRetryAutoVerify` handler
- `handleVerifyNft` handler for manual input
- Three UI states for step 2:
  - "Checking your DID..." (auto-verify in progress)
  - "Not found" with Retry + "Paste Launcher ID instead" + MintGarden link
  - Manual input form with NFT ID field, error, verify button, "Back to auto-check" button

**ALL of this must be preserved.** The visual upgrade only changes:
1. Container and icons (emoji → SVG)
2. Adding a connecting line between steps
3. Adding glow/pulse on the active step icon
4. Removing inline `maxWidth` (parent controls width)
5. Container padding `p-8` → `p-6`

### Replace Emoji Icons with SVG

Replace the emoji `✅` / `☐` / `<div className="gate-step-icon-future">` with proper SVG icon states:

**Done state** — Green circle with white checkmark:
```tsx
<div className="gate-step-icon-done">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 12 9 17 20 6"/>
  </svg>
</div>
```

**Active state** — Orange pulsing ring with step-specific icon inside:
```tsx
<div className="gate-step-icon-active">
  {/* Step-specific icon — see table below */}
</div>
```

**Pending state** — Muted empty circle:
```tsx
<div className="gate-step-icon-pending" />
```

### Step-Specific Icons (Active State)

| Step | Icon |
|------|------|
| 0: Connect Wallet | Wallet outline |
| 1: Link DID | Chain link |
| 2: Hold NFT | Image/picture frame |
| 3: Start Swiping | Play triangle |

### Vertical Connecting Line

Add a `.gate-stepper-line` element inside the `.gate-stepper` container:

```tsx
<div className="gate-stepper">
  <div className="gate-stepper-line" />
  <ol className="flex flex-col gap-3 w-full" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
    {/* steps */}
  </ol>
</div>
```

### CTA Content Per Step (preserve existing)

- **Step 0 active** (Connect Wallet): `<button className="btn btn-primary">` calling `connect()` — same as current
- **Step 1 active** (Link DID): DID input field + "Link DID" button + "Don't have a DID?" link — **PRESERVE THE ENTIRE EXISTING DID INPUT FORM AS-IS** (lines 73-103 of current GateChecklist.tsx). Only change: the helper text and input styling remain the same.
- **Step 2 active** (Hold NFT): `<a className="btn btn-ghost">View Collection →</a>` linking to MintGarden — same as current

### Container

```tsx
<div className="card-static p-6 flex flex-col items-center gap-4">
```
- Changed from `p-8` to `p-6`
- Removed `style={{ maxWidth: 380, width: '100%' }}` — the parent OnboardingHero grid controls width

---

## File: GameVoting.tsx Changes

### Current Structure (lines 47-62):
```tsx
export default function GameVoting() {
  const { isDesktop } = useLayout();
  return (
    <GameProvider>
      <SwipeAutoRegister />
      <PageSEO ... />
      {isDesktop ? <VotingPageDesktop /> : <VotingPageMobile />}
    </GameProvider>
  );
}
```

### New Structure:
```tsx
import { OnboardingHero } from '@/components/game/OnboardingHero';
import { useGame } from '@/contexts/GameContext';
import { useSageWallet } from '@/sage-wallet';

// ... existing imports ...

function VotingPageInner({ isDesktop }: { isDesktop: boolean }) {
  const { player, isRegistered, isVerified, register, verifyPhase1 } = useGame();
  const { address, status: walletStatus } = useSageWallet();

  const walletConnected = walletStatus === 'connected' && !!address;
  const hasDid = isRegistered;
  const hasPhase1 = isVerified;

  if (!walletConnected || !hasDid || !hasPhase1) {
    return (
      <OnboardingHero
        walletConnected={walletConnected}
        hasDid={hasDid}
        hasPhase1={hasPhase1}
        onLinkDid={async (did) => { if (address) await register(did, address); }}
        onAutoVerify={async () => { if (player?.did) return verifyPhase1(player.did); return false; }}
        onVerifyNft={async (nftId) => { if (player?.did) return verifyPhase1(player.did, nftId); return false; }}
      />
    );
  }

  return isDesktop ? <VotingPageDesktop /> : <VotingPageMobile />;
}

export default function GameVoting() {
  const { isDesktop } = useLayout();
  return (
    <GameProvider>
      <SwipeAutoRegister />
      <PageSEO
        title="Wojak Swipe - Vote on Community NFTs"
        description="Swipe through Wojak NFTs. Like or pass. Climb the leaderboard."
        path="/swipe"
        type="game"
      />
      <VotingPageInner isDesktop={isDesktop} />
    </GameProvider>
  );
}
```

**Important:** `VotingPageInner` must be a child of `<GameProvider>` so it can use `useGame()`. The three callbacks replicate the exact patterns from VotingFeed lines 212-214:
- `onLinkDid`: `async (did) => { if (address) await register(did, address); }`
- `onAutoVerify`: `async () => { if (player?.did) return verifyPhase1(player.did); return false; }`
- `onVerifyNft`: `async (nftId) => { if (player?.did) return verifyPhase1(player.did, nftId); return false; }`

Note: `verifyPhase1` must be destructured from `useGame()` alongside `player`, `isRegistered`, `isVerified`, `register`.

---

## File: VotingFeed.tsx Changes

Remove the gate checklist logic (lines 201-214). The gate check has moved up to GameVoting. VotingFeed now assumes the gate has been passed and starts at the loading/error/voting states.

**Remove these lines (201-215):**
```tsx
// Gate: wallet not connected or player not registered/verified
const walletConnected = walletStatus === 'connected' && !!address;
const hasDid = isRegistered;
const hasPhase1 = isVerified;

if (!walletConnected || !hasDid || !hasPhase1) {
  return (
    <GateChecklist
      walletConnected={walletConnected}
      hasDid={hasDid}
      hasPhase1={hasPhase1}
      onLinkDid={async (did) => { if (address) await register(did, address); }}
      onAutoVerify={async () => { if (player?.did) return verifyPhase1(player.did); return false; }}
      onVerifyNft={async (nftId) => { if (player?.did) return verifyPhase1(player.did, nftId); return false; }}
    />
  );
}
```

**Also remove these imports (no longer needed in VotingFeed):**
```tsx
import { useSageWallet } from '@/sage-wallet';
import { GateChecklist } from './GateChecklist';
```

**Also remove the `useSageWallet` destructuring** wherever it appears in VotingFeed. Check: `address` and `walletStatus` are used ONLY for the gate check. After removing the gate check, VotingFeed no longer needs wallet state.

**Also check and remove from `useGame()` destructuring:** `register`, `verifyPhase1`, `isRegistered`, `isVerified` — these were only used for the gate check. Only keep what VotingFeed actually uses post-gate (like `player`, `feed`, `castVote`, `loadFeed`, etc.).

---

## CSS: theme.css Additions

Find the existing gate checklist CSS section in theme.css. It's around lines 2140-2169 and starts with comments about gate steps. **Replace** that entire block with the following:

```css
/* ══════════════════════════════════════════════════════════════════════════
   ONBOARDING HERO
   Full-width premium onboarding for gate state.
   ══════════════════════════════════════════════════════════════════════════ */

.onboarding-hero {
  width: 100%;
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 20%, rgba(255, 107, 0, 0.06) 0%, transparent 60%),
    var(--color-bg);
  padding: 48px 24px;
}

.onboarding-hero-content {
  max-width: 900px;
  width: 100%;
}

.onboarding-hero-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}

.onboarding-hero-brand h1 {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--color-text);
  margin: 0;
}

.onboarding-hero-tagline {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 8px;
}

.onboarding-hero-desc {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-top: 12px;
}

/* Preview Card Fan (decorative) */
.preview-card-fan {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 32px;
  height: 180px;
  position: relative;
}

.preview-card-ghost {
  width: 120px;
  height: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  position: absolute;
  transition: transform 300ms ease;
}

.preview-card-ghost:nth-child(2) {
  box-shadow: var(--glow-primary);
  z-index: 1;
}

/* Feature Cards Grid */
.onboarding-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 48px;
}

.feature-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Stats Strip */
.onboarding-stats {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

/* ── Gate Stepper (Upgraded) ── */

.gate-stepper {
  position: relative;
}

.gate-stepper-line {
  position: absolute;
  left: 15px;
  top: 36px;
  bottom: 36px;
  width: 2px;
  background: var(--color-border);
  border-radius: 1px;
}

.gate-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}

.gate-step-icon-done {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-success);
  border: 1.5px solid rgba(34, 197, 94, 0.4);
}

.gate-step-icon-active {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-primary-muted);
  color: var(--color-primary);
  border: 1.5px solid rgba(255, 107, 0, 0.4);
  animation: gate-step-pulse 2s ease-in-out infinite;
}

.gate-step-icon-pending {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid var(--color-text-muted);
}

@keyframes gate-step-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.12); }
  50% { box-shadow: 0 0 0 8px rgba(255, 107, 0, 0.05); }
}

.gate-step-content {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}

/* ── Onboarding Mobile Overrides ── */

@media (max-width: 767px) {
  .onboarding-hero {
    padding: 24px 16px;
    min-height: auto;
    align-items: flex-start;
  }

  .onboarding-hero-split {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .onboarding-hero-brand {
    text-align: center;
  }

  .onboarding-hero-brand h1 {
    font-size: 26px;
  }

  .onboarding-hero-tagline {
    font-size: 18px;
  }

  .preview-card-fan {
    display: none;
  }

  .onboarding-features {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* ── Reduced Motion ── */

@media (prefers-reduced-motion: reduce) {
  .gate-step-icon-active {
    animation: none;
    box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.12);
  }
}
```

---

## Inline SVG Icons Reference

The CLI should create these as small inline SVG components within GateChecklist. No icon library needed.

### Wallet (step 0)
```tsx
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
  <path d="M18 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
</svg>
```

### Chain Link (step 1 — DID)
```tsx
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
</svg>
```

### Image (step 2 — NFT)
```tsx
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <circle cx="8.5" cy="8.5" r="1.5"/>
  <path d="M21 15l-5-5L5 21"/>
</svg>
```

### Play (step 3 — Start)
```tsx
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <polygon points="5 3 19 12 5 21 5 3"/>
</svg>
```

### Checkmark (done state)
```tsx
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <polyline points="4 12 9 17 20 6"/>
</svg>
```

### Feature Card Icons

**Heart (Vote):**
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
</svg>
```

**Swords (Battle):**
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
  <path d="M13 19l6-6"/>
  <path d="M16 16l4 4"/>
  <path d="M19 21l2-2"/>
  <path d="M9.5 6.5L21 18v3h-3L6.5 9.5"/>
  <path d="M11 5l-6 6"/>
  <path d="M8 8L4 4"/>
  <path d="M5 3L3 5"/>
</svg>
```

**Flame (Burn):**
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 23c-3.87 0-7-3.13-7-7 0-2.38 1.19-4.47 3-5.74C10.38 8.61 12 5.5 12 2c1.5 2 3 4.5 3 7 0 .83-.23 1.61-.63 2.29C16.32 12.61 19 14.71 19 17.5 19 20.54 16.31 23 12 23z"/>
</svg>
```

---

## Copy

### Heading
"WOJAK SWIPE"

### Tagline
"Vote. Battle. Burn."

### Description
"Shape which Wojaks rise and which get burned. The community decides."

### Feature Card Copy
| Card | Title | Description |
|------|-------|-------------|
| Vote | "Vote" | "Swipe through community Wojaks. Your votes shape the meta." |
| Battle | "Battle" | "Pit your NFTs head-to-head. Winner takes the power." |
| Burn | "Burn" | "Remove the weakest Wojaks and earn credits." |

### Stats Strip
"Join the Wojak metagame"

### Gate Step Labels (same as current)
1. "Connect wallet"
2. "Link your DID"
3. "Hold a Wojak Farmers Plot"
4. "Start swiping"

### Gate Step 1 (DID) Content — PRESERVE AS-IS
When step 1 is active, the existing DID input form renders:
- Helper text: "Paste your DID from Sage wallet."
- Input field: `<input className="input text-sm" placeholder="did:chia:1..." />`
- Error display (when validation fails)
- "Link DID" button (with loading state)
- "Don't have a DID? Learn how to create one →" link

**Do NOT change this form. Just upgrade the icon next to it.**

### Gate Step 2 (Hold NFT) Content — PRESERVE AS-IS
Step 2 now has an **auto-verify + manual fallback** flow:

**Auto-verify state (checking):**
- "Checking your DID for Wojak Farmers Plot NFTs..."

**Auto-verify failed (not_found/error) — before manual toggle:**
- Status text ("No Wojak Farmers Plot found" or "Could not check")
- "Retry" button → re-runs auto-verify
- "Paste Launcher ID instead" button → switches to manual input
- "Don't have one? View collection →" MintGarden link

**Manual input (showManual=true):**
- "Paste the Launcher ID from Sage wallet for instant verification."
- Input field: `<input className="input text-sm" placeholder="nft1..." />`
- Error display
- "Verify NFT" button (with loading state)
- "← Back to auto-check" button → switches back to auto-verify

**Do NOT change any of this flow. Just upgrade the icon next to it.**

---

## Build Verification

After implementation, verify:
1. `npx tsc -b` passes (no type errors)
2. `npm run build` succeeds (Vite build)
3. Desktop: full-width hero with branding left, gate stepper right, 3 feature cards below
4. Mobile: stacked layout (heading → stepper → feature cards), no preview card fan
5. Gate checklist functions correctly at each state:
   - No wallet: "Connect Wallet" button works
   - Wallet connected, no DID: DID input form works, can paste and submit DID
   - DID linked, no Phase 1: "View Collection →" link works
   - All gates passed: normal 3-column voting layout renders (no hero)
6. No `!important` in CSS
7. No new npm dependencies added
8. No redundant checklists visible (old "Getting Started" panel eliminated during gate)
9. Reduced motion respected (no pulse animation)
10. `SwipeAutoRegister` still runs during onboarding (invisible side-effect)
