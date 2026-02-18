# CLI Execution: Onboarding Hero Redesign

> **Read first:** `docs/specs/onboarding-hero-redesign.md` — the full design spec with every detail.
> **Goal:** Replace the sparse gate checklist + redundant side panels with a premium full-width onboarding hero page.

---

## Pre-Flight

Before writing any code:
1. Read `docs/specs/onboarding-hero-redesign.md` top to bottom
2. Read `CLAUDE.md` — especially CSS rules (no `!important`, theme.css for visuals, Tailwind for layout only)
3. Read the current files you'll be modifying:
   - `src/pages/GameVoting.tsx`
   - `src/components/game/GateChecklist.tsx` — **NOTE: This has 3 callback props (`onLinkDid`, `onAutoVerify`, `onVerifyNft`), DID input form, NFT auto-verify with `useEffect`, manual fallback with Launcher ID input, VerifyState type machine, 8 useState hooks, 2 useEffects, 3 handlers. PRESERVE ALL OF THIS. Only change the visual presentation (emoji icons → SVG, add connecting line, add glow).**
   - `src/components/game/VotingFeed.tsx`
   - `src/styles/theme.css` (search for the existing gate checklist CSS section)

---

## Tasks (Execute in Order)

### T1: Add CSS to theme.css

In `src/styles/theme.css`, find the existing gate checklist CSS block (search for `.gate-step` or `gate-step-icon` or `gate-step-icon-future`). **Replace** that entire section with the full new CSS from the spec's "CSS: theme.css Additions" section.

The new CSS includes:
- Onboarding hero layout (`.onboarding-hero`, `.onboarding-hero-content`, `.onboarding-hero-split`, etc.)
- Preview card fan (`.preview-card-fan`, `.preview-card-ghost`)
- Feature cards (`.onboarding-features`, `.feature-card-icon`)
- Stats strip (`.onboarding-stats`)
- Upgraded gate stepper (`.gate-stepper`, `.gate-stepper-line`, `.gate-step`, icon states with done/active/pending)
- `@keyframes gate-step-pulse`
- Mobile overrides (`@media max-width: 767px`)
- Reduced motion support (`@media prefers-reduced-motion`)

**Important:** Keep the new CSS in the same region where the old gate CSS was. Don't append it at the very end of the file.

### T2: Upgrade GateChecklist.tsx

Visually upgrade `src/components/game/GateChecklist.tsx` per the spec. **CRITICAL: Preserve ALL existing functionality:**

**KEEP (do not remove or rewrite):**
- ALL 3 callback props: `onLinkDid`, `onAutoVerify`, `onVerifyNft`
- The full `GateChecklistProps` interface
- `isValidDid()` and `isValidNftId()` validation functions
- `VerifyState` type (`'idle' | 'checking' | 'not_found' | 'error'`)
- ALL `useState` hooks (`didInput`, `didError`, `linking`, `verifyState`, `showManual`, `nftInput`, `nftError`, `verifyingNft`)
- `autoVerifyAttempted` ref
- Both `useEffect` hooks (auto-verify trigger + reset on step change)
- `handleLinkDid`, `handleRetryAutoVerify`, `handleVerifyNft` handlers
- The DID input form JSX (step 1)
- The wallet connect button (step 0)
- The NFT auto-verify + manual fallback flow (step 2: checking state, not_found state with retry + fallback toggle, manual input state)
- The step logic (`steps` array with `done` conditions)

**CHANGE:**
1. Replace emoji icons (`✅`, `☐`, `gate-step-icon-future` div) with proper SVG icon states using `.gate-step-icon-done`, `.gate-step-icon-active`, `.gate-step-icon-pending` classes
2. Add step-specific SVG icons for active state (wallet, chain-link, image, play) — all provided in the spec
3. Wrap the `<ol>` in a `.gate-stepper` container with a `.gate-stepper-line` child element
4. Container: remove inline `style={{ maxWidth: 380, width: '100%' }}`, change `p-8` to `p-6`
5. Remove the old `.gate-step-icon` span and `.gate-step-icon-future` div usage

All SVG icons are provided in the spec's "Inline SVG Icons Reference" section.

### T3: Create OnboardingHero.tsx

Create `src/components/game/OnboardingHero.tsx`:

1. Accept props: `{ walletConnected, hasDid, hasPhase1, onLinkDid?, onAutoVerify?, onVerifyNft? }`
2. Render the full-width hero layout (all details in spec):
   - `.onboarding-hero` wrapper
   - `.onboarding-hero-content` centered container (max-width 900px)
   - `.onboarding-hero-split` grid: left brand side + right GateChecklist
   - `.onboarding-features` grid: 3 feature cards below
   - `.onboarding-stats` strip at bottom
3. **Left brand side:** heading "WOJAK SWIPE", tagline "Vote. Battle. Burn.", description, preview card fan (3 ghost cards at angles)
4. **Right side:** `<GateChecklist>` passing through ALL props including `onLinkDid`, `onAutoVerify`, `onVerifyNft`
5. **Feature cards** use `.card` class for hover glow. Icons: Heart (orange), Swords (cyan), Flame (red) — SVGs from spec
6. Import GateChecklist from `./GateChecklist`

### T4: Modify GameVoting.tsx

Update `src/pages/GameVoting.tsx`:

1. Add a `VotingPageInner` component (see exact code in spec):
   - Uses `useGame()` for `player`, `isRegistered`, `isVerified`, `register`, `verifyPhase1`
   - Uses `useSageWallet()` for `address`, `status`
   - Checks gate state
   - Returns `<OnboardingHero>` with all 3 callbacks if gate not passed:
     - `onLinkDid={async (did) => { if (address) await register(did, address); }}`
     - `onAutoVerify={async () => { if (player?.did) return verifyPhase1(player.did); return false; }}`
     - `onVerifyNft={async (nftId) => { if (player?.did) return verifyPhase1(player.did, nftId); return false; }}`
   - Returns desktop/mobile voting layout if gate passed
2. `VotingPageInner` renders **inside** `<GameProvider>` (so hooks work)
3. Add imports for: `OnboardingHero`, `useGame`, `useSageWallet`
4. All 3 callbacks replicate the exact patterns from VotingFeed lines 212-214 (see spec for code)
5. Keep `<SwipeAutoRegister />` rendering (it still runs during onboarding)
6. Keep `<PageSEO />` rendering

### T5: Clean Up VotingFeed.tsx

Remove gate checklist logic from `src/components/game/VotingFeed.tsx`:

1. **Remove lines 201-214** — the gate state check and GateChecklist render block
2. **Remove imports:** `useSageWallet` from `'@/sage-wallet'` and `GateChecklist` from `'./GateChecklist'`
3. **Remove** any `useSageWallet()` destructuring call in the component body
4. **Check and clean** the `useGame()` destructuring — `register`, `verifyPhase1`, `isRegistered`, `isVerified` were only used for the gate check. Remove any that aren't used elsewhere in VotingFeed. Keep only what the post-gate voting logic needs (like `player`, `feed`, `castVote`, `loadFeed`, `refreshPowerLevel`, etc.).
5. VotingFeed now assumes it only renders when the gate is passed.

### T6: Verify Build

Run:
```bash
npx tsc -b && npm run build
```

Both must pass. Fix any type errors or build issues.

If there are lint warnings about unused imports after the cleanup, fix those too.

---

## Quality Checks

After all tasks, verify:
- [ ] No `!important` in any CSS
- [ ] No new npm dependencies
- [ ] All colors use CSS variables from theme.css (no hardcoded hex in JSX)
- [ ] Layout uses Tailwind classes (flex, grid, gap, p-*, etc.)
- [ ] Visual styling uses theme.css classes
- [ ] No inline color styles (except icon bg tints in feature cards, which use rgba)
- [ ] `prefers-reduced-motion` disables the pulse animation
- [ ] Mobile layout stacks vertically and hides preview card fan
- [ ] GateChecklist connect wallet button still works (step 0)
- [ ] GateChecklist DID input form still works — paste DID, validate, submit, error states (step 1)
- [ ] GateChecklist NFT auto-verify fires when step 2 becomes active (step 2)
- [ ] GateChecklist shows retry + "Paste Launcher ID instead" when auto-verify fails (step 2)
- [ ] GateChecklist manual NFT input works — paste nft1..., validate, submit (step 2 fallback)
- [ ] GateChecklist "Back to auto-check" button works (step 2 fallback → auto-verify)
- [ ] After gate passes, normal 3-column voting layout renders (with VotingStatsPanel + MiniLeaderboard)
- [ ] No redundant checklists visible during onboarding (the "Getting Started" panel only appears post-gate)
- [ ] `SwipeAutoRegister` still runs during onboarding

---

## Commit

When all tasks pass and build succeeds, commit with message:

```
feat: premium onboarding hero for Wojak Swipe gate screen

Replace the sparse gate checklist with a full-width onboarding experience:
- Hero section with branding, tagline, and decorative preview card fan
- Upgraded gate stepper with SVG icons, connecting line, and active pulse
- Feature cards explaining Vote/Battle/Burn mechanics
- Responsive: full split layout on desktop, stacked on mobile
- Gate logic moved from VotingFeed up to GameVoting for cleaner architecture
- Eliminates redundant "Getting Started" checklist during gate state
- Preserves all gate functionality: DID input, auto-verify, manual NFT verify fallback
```
