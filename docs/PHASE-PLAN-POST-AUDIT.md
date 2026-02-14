# Post-Audit Phase Plan — Claude CLI Prompts

> After the Mint Pipeline Audit (SPEC-MINT-PIPELINE-AUDIT.md) is complete, execute these phases in order. Each phase has a dedicated spec file and a copy-paste prompt for Claude CLI.

---

## Spec Files

| Phase | Spec File |
|-------|-----------|
| 0: Verify Audit | `docs/SPEC-PHASE0-VERIFY-AUDIT.md` |
| 1: Frontend Pricing | `docs/SPEC-PHASE1-FRONTEND-PRICING.md` |
| 2: Info Panel | `docs/SPEC-PHASE2-INFO-PANEL.md` |
| 3: Credit Formula | `docs/SPEC-PHASE3-CREDIT-FORMULA.md` |
| 4: Launch Readiness | `docs/SPEC-PHASE4-LAUNCH-READINESS.md` |
| 5: E2E Testing | `docs/SPEC-PHASE5-E2E-TESTING.md` |
| 6: Admin Dashboard | `docs/SPEC-PHASE6-ADMIN-DASHBOARD.md` |
| 7: Holder Airdrop | `docs/SPEC-HOLDER-AIRDROP.md` |
| 8: Pre-Launch Audit | `docs/SPEC-PRELAUNCH-AUDIT.md` |
| 9A: Admin Auth | `docs/SPEC-PHASE9A-ADMIN-AUTH.md` |
| 9B: CORS Lockdown | `docs/SPEC-PHASE9B-CORS-LOCKDOWN.md` |
| 9C: Code Quality | `docs/SPEC-PHASE9C-CODE-QUALITY.md` |
| 10A: Action Bar Declutter | `docs/SPEC-PHASE10A-ACTIONBAR-DECLUTTER.md` |
| 10B: Right Panel Polish | `docs/SPEC-PHASE10B-RIGHT-PANEL-POLISH.md` |
| 10C: Premium Polish | `docs/SPEC-PHASE10C-PREMIUM-POLISH.md` |

---

## Phase 0: Verify Audit Implementation

**Goal:** Make sure the audit spec was implemented correctly before building on top of it.

**Spec:** `docs/SPEC-PHASE0-VERIFY-AUDIT.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE0-VERIFY-AUDIT.md in full. This is your verification spec.
Read docs/SPEC-MINT-PIPELINE-AUDIT.md — the audit that was implemented.

Run every step in the verification spec:
1. Build check (npm run typecheck && npm run build)
2. Trait name map verification script
3. Anti-pattern greps (all 4 must return zero results)
4. Surcharge formula verification (all 11 test cases must pass)
5. File existence check (4 new files)
6. Server-side / client-side map sync
7. Final build

Fix any issues found. Report ✓ or ✗ for each step.
Do not proceed to other phases until every check passes.
```

---

## Phase 1: Frontend Pricing Display

**Goal:** Show trait usage counts and surcharges in the generator so users see prices before they pick traits.

**Spec:** `docs/SPEC-PHASE1-FRONTEND-PRICING.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE1-FRONTEND-PRICING.md in full. This is your implementation spec.
Read docs/BRAND-VOICE.md for copy/tone guidelines.

Implement exactly what the spec says:
1. Update MintContext to fetch full pricing data with 60s auto-refresh
2. Add price breakdown to ActionBar (format: "0.45 XCH (base 0.20 + 0.25 Crown surcharge)")
3. Add usage badges to trait selector ("87 minted" + surcharge for Head/Clothes/Face Wear)
4. Never show fair share, effective usage, or formula details
5. Use existing CSS classes (badge, text-secondary, text-muted) + Tailwind for layout
6. Handle edge cases: loading state, free mints, no surcharge

Run npm run typecheck && npm run build after changes. Both must pass.
```

---

## Phase 2: Generator Info / How It Works

**Goal:** Create an information panel that explains the generator, pricing, and what makes Your Wojak special.

**Spec:** `docs/SPEC-PHASE2-INFO-PANEL.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE2-INFO-PANEL.md in full. This is your implementation spec.
Read docs/BRAND-VOICE.md — follow the tone and word choices exactly.

Implement the info panel with all 5 content sections:
1. "What is Your Wojak?" — collection description, USP
2. "How to Create" — step-by-step guide
3. "Pricing" — base price, surcharges, how it works (NO formula details)
4. "Free Mints" — credits system, how to earn
5. "Why It's Special" — sales pitch, uniqueness, royalties

Add a trigger button near the mint area in ActionBar.
Use collapsible sections or tabbed layout.
Mobile-friendly. Use existing CSS classes. No new CSS files.

Run npm run typecheck && npm run build after changes. Both must pass.
```

---

## Phase 3: Credit Formula V2 Completion

**Goal:** Finish implementing the new credit formula (worker was already updated, need to verify everything is consistent).

**Spec:** `docs/SPEC-PHASE3-CREDIT-FORMULA.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE3-CREDIT-FORMULA.md in full. This is your verification spec.
Read docs/SPEC-CREDIT-FORMULA-V2.md — the full implementation spec (source of truth).

Run every verification step:
1. Verify worker formula matches spec (constants + calculateCredits function)
2. Verify backfill script matches worker
3. Verify credit consumers do NOT contain formula (balance.ts, leaderboard.ts, etc.)
4. Verify FREE_MINT_COST consistency (10000 stored units everywhere)
5. Verify documentation is updated (CREDITS-FORMULA.md, CREDIT-LEADERBOARD-SYSTEM.md)
6. Run formula tests (5 test cases)
7. Grep for old constants (CREDITS_PER_FLOOR, WHALE_COEFFICIENT — zero results expected)
8. Build check

Fix any discrepancies found. The spec (SPEC-CREDIT-FORMULA-V2.md) is the source of truth.
Report ✓ or ✗ for each step.
```

---

## Phase 4: Launch Readiness Update

**Goal:** Update the launch readiness doc with the new surcharge system and run the full test plan.

**Spec:** `docs/SPEC-PHASE4-LAUNCH-READINESS.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE4-LAUNCH-READINESS.md in full. This is your implementation spec.
Read docs/LAUNCH-READINESS.md — the file you will update.
Read docs/SPEC-MINT-PIPELINE-AUDIT.md (the completed audit).
Read docs/SPEC-CREDIT-FORMULA-V2.md (the credit formula).

Update LAUNCH-READINESS.md with all 5 sections from the spec:
1. Security Audit section (self-fetch, wallet validation, trait names, mint numbers)
2. Pricing section (fair-share formula, categories, exemptions, decay)
3. Database Migrations section (add 034_trait_decay.sql)
4. Known Gaps section (update resolved items, add new items)
5. Test Plan section (17 new test cases covering surcharge, decay, credits, validation)

Run npm run typecheck && npm run build after changes. Both must pass.
```

---

## Phase 5: End-to-End Testing

**Goal:** Simulate the full mint flow and verify everything works together.

**Spec:** `docs/SPEC-PHASE5-E2E-TESTING.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE5-E2E-TESTING.md in full. This is your implementation spec.
Read docs/LAUNCH-READINESS.md (the updated version with test plan).

Create scripts/test-mint-e2e.ts following the spec exactly:
1. Test 1: Paid mint full pipeline (prepare → verify response shape)
2. Test 2: Free mint with credit deduction (skip if no credits)
3. Test 3: Surcharge calculations per category rules
4. Test 4: Surcharge formula accuracy (7 test cases with tolerance)
5. Test 5: Decay behavior (4 test cases)
6. Test 6: Wallet validation (4 test cases)
7. Test 7: Pricing endpoint response shape

Use the test runner structure from the spec.
Environment variable TEST_API_URL (default: http://localhost:8788).

Run npm run typecheck after creating the script.
```

---

## Phase 6: Monitoring & Admin Dashboard (Optional)

**Goal:** Build a simple admin view to monitor trait distribution and mint activity post-launch.

**Spec:** `docs/SPEC-PHASE6-ADMIN-DASHBOARD.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE6-ADMIN-DASHBOARD.md in full. This is your implementation spec.
Read src/pages/ to see existing page patterns.
Read src/styles/theme.css for available styles.

Create an admin/stats page following the spec:
1. Trait Distribution Table (per category, color-coded by fair share %)
2. Supply Progress (minted / 4200 with progress bar)
3. Recent Mints (last 20 with wallet, traits, price, timestamp)
4. Credit System Health (total earned, spent, free mints, avg per wallet)

Create any needed API endpoints (admin/recent-mints, admin/credit-stats).
Simple access control (query param or admin wallet check).
Internal tool — functional over pretty. Use existing CSS classes.

Run npm run typecheck && npm run build after changes. Both must pass.
```

---

## Phase 7: Holder Airdrop

**Goal:** Apply one-time free mint credit airdrop to 112 wallets holding 5+ Wojak Farmers Plot NFTs.

**Spec:** `docs/SPEC-HOLDER-AIRDROP.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-HOLDER-AIRDROP.md in full. This is your implementation spec.
Read functions/migrations/ to understand existing migration numbering.
Read the credit_events table schema (check existing migrations for the CREATE TABLE).

Implement the holder airdrop:

1. Check if credit_events has an event_type column. If not, create a migration
   to add it: ALTER TABLE credit_events ADD COLUMN event_type TEXT DEFAULT 'trade';

2. Create migration 035_holder_airdrop.sql (or next available number) that
   inserts credit events for all 112 wallets listed in the spec.
   Each free mint = 10000 stored units (100 display credits).
   Use event_type = 'holder_airdrop'.
   Include metadata JSON with held count, freeMints, snapshot date, and formula.

3. Update the balance and leaderboard endpoints to include airdrop credits
   in the total. They should sum ALL credit_events regardless of event_type.

4. Update the history endpoint so airdrop events display as "Holder Airdrop"
   (not as an NFT purchase).

5. Verify:
   - SELECT COUNT(*) FROM credit_events WHERE event_type = 'holder_airdrop' = 112
   - SELECT SUM(credits_earned) FROM credit_events WHERE event_type = 'holder_airdrop' = 2260000
   - Top holder gets 40000 credits (4 free mints)
   - Smallest holder gets 10000 credits (1 free mint)

Run npm run typecheck && npm run build after changes. Both must pass.
```

---

## Phase 9A: Admin Endpoint Authentication (HIGH)

**Goal:** Add ADMIN_SECRET auth to both admin API endpoints + update the Admin.tsx frontend.

**Spec:** `docs/SPEC-PHASE9A-ADMIN-AUTH.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE9A-ADMIN-AUTH.md in full. This is your implementation spec.

Add ADMIN_SECRET authentication to both admin endpoints:
1. functions/api/admin/credit-stats.ts — add ADMIN_SECRET to Env, add Authorization to
   CORS headers, add auth check block (copy pattern from functions/api/mint/audit.ts)
2. functions/api/admin/recent-mints.ts — same 3 changes
3. src/pages/Admin.tsx — read secret from ?secret= URL param, send as Bearer token,
   show "access required" message if no secret provided, handle 401 responses

Run npm run typecheck && npm run build after all changes.
Run verification greps from the spec.
```

---

## Phase 9B: CORS Origin Lockdown (HIGH)

**Goal:** Replace `Access-Control-Allow-Origin: '*'` with `'https://wojak.ink'` across ALL 50+ API files.

**Spec:** `docs/SPEC-PHASE9B-CORS-LOCKDOWN.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE9B-CORS-LOCKDOWN.md in full. This is your implementation spec.

This is a large but simple change: replace '*' with 'https://wojak.ink' in every
CORS header across 50+ files in functions/api/.

1. Start by running: grep -rl "Access-Control-Allow-Origin.*'\*'" functions/ --include="*.ts"
   to get the definitive file list
2. Change functions/api/mint/_shared.ts first (covers 5 mint endpoints)
3. Change every other file in the grep results
4. DO NOT touch functions/api/chat/token.ts, presence.ts, or verify-eligibility.ts
   (they already use dynamic origin validation)
5. Proxy endpoints (coingecko, spacescan, mintgarden, dexie) have 3 CORS declarations
   each — change all 3 in each file

Run verification: grep -rn "Allow-Origin.*'\*'" functions/ --include="*.ts" must return ZERO.
Run npm run typecheck && npm run build after all changes.
```

---

## Phase 9C: Code Quality & Cleanup (MEDIUM + LOW)

**Goal:** 6 remaining fixes — image validation, leaderboard SQL, frontend wallet validation, orphan cleanup, TODO cleanup, CSS comment.

**Spec:** `docs/SPEC-PHASE9C-CODE-QUALITY.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE9C-CODE-QUALITY.md in full. This is your implementation spec.
Execute fixes in order 1-6:

Fix 1 (MEDIUM): Add WebP magic byte validation in functions/api/mint/uploadToIPFS.ts.
  Add isValidWebP() function, check right after base64ToUint8Array(), before size check.

Fix 2 (MEDIUM): Move leaderboard sorting/pagination into SQL.
  Add ORDER BY map from sort param, append LIMIT/OFFSET to both main and fallback queries,
  remove JS .sort() and .slice() calls.

Fix 3 (MEDIUM): Replace all startsWith('xch1') with isValidChiaAddress().
  Create src/lib/validation.ts, update MintContext.tsx (3 instances),
  SageWalletProvider.tsx (2 instances), useSageWalletStandalone.ts (2 instances).

Fix 4 (LOW): Delete 4 orphan pages after verifying no imports exist.
  Landing.tsx, Onboarding.tsx, SettingsPage.tsx, Game.tsx.

Fix 5 (LOW): Check if stale TODO in prepare.ts still exists. Remove if so.

Fix 6 (LOW): Add accessibility comment above !important rules in theme.css.

Run npm run typecheck && npm run build after all changes.
Run all verification greps from the spec.
Report results for each fix.
```

---

## Phase 10A: Action Bar Declutter

**Goal:** Reduce the 11-button action bar to 3 visual groups: Create (Random, Undo, Redo), Output (Save, Export, Copy, overflow ⋯), and Mint. Move Leaderboard, Metadata, and Info into an overflow menu.

**Spec:** `docs/SPEC-PHASE10A-ACTIONBAR-DECLUTTER.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE10A-ACTIONBAR-DECLUTTER.md in full. This is your implementation spec.
Read src/components/generator/ActionBar.tsx — the full component you'll modify.

Reorganize the action bar into 3 visual groups:
1. Add a MoreHorizontal overflow menu button (import from lucide-react)
2. Move Leaderboard, Metadata toggle, and How It Works into the overflow dropdown
3. Add a visual separator (1px divider) between Create group and Output group
4. Keep the existing mint section divider as-is
5. Use the same dropdown pattern as the existing Random menu (click-outside, AnimatePresence)

Delete the 3 standalone button blocks (Leaderboard, Metadata, Info).
Button order: Random, Undo, Redo | Save, Export, Copy, ⋯ | Mint section.

Run npm run typecheck && npm run build after all changes.
Test visually at localhost:5173/generator.
```

---

## Phase 10B: Right Panel & Color Picker Polish

**Goal:** Give the color picker and all right-panel sections consistent containers with labels, matching the trait grid's visual treatment. Add subtle background depth to the right panel.

**Spec:** `docs/SPEC-PHASE10B-RIGHT-PANEL-POLISH.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE10B-RIGHT-PANEL-POLISH.md in full. This is your implementation spec.
Read src/components/generator/GeneratorRightPanel.tsx — the right panel component.
Read src/components/generator/ColorPicker.tsx — the color palette.
Read src/pages/Generator.css — the panel layout styles.
Read src/styles/theme.css — existing .card-static pattern.

1. Add .generator-panel-section and .generator-panel-section-label classes to theme.css
   (surface bg, border-radius, border, 12px padding; label is uppercase, muted, 11px)
2. Wrap the ColorPicker in GeneratorRightPanel.tsx with .generator-panel-section + "Color" label
3. Wrap the fill target buttons section with .generator-panel-section + "Color Part" label
4. Wrap all other labeled sections (Mask style, Under layer, Suit style, Chia Farmer)
5. Add a subtle darker background + left border to .generator-details-panel in Generator.css
6. Check TraitSelector.tsx for mobile color picker — apply same container if found

Run npm run typecheck && npm run build after all changes.
Test visually at localhost:5173/generator — right panel should have labeled containers.
```

---

## Phase 10C: Premium Visual Polish

**Goal:** Subtle refinements to preview canvas depth, trait card hover, layer tab hover, and selection animation.

**Spec:** `docs/SPEC-PHASE10C-PREMIUM-POLISH.md`

### Prompt for Claude CLI:

```
Read docs/SPEC-PHASE10C-PREMIUM-POLISH.md in full. This is your implementation spec.
Read src/components/generator/PreviewWithControls.tsx — canvas frame.
Read src/pages/Generator.css — all generator visual styles.

4 changes (skip item 5 per spec):

1. Preview canvas: Add a two-layer dark box-shadow to PreviewWithControls.tsx
   for depth (40px + 8px black shadows). No colored glows.

2. Trait card hover: In Generator.css, change .generator-option-item:hover from
   scale(1.05) to scale(1.02), add a subtle warm glow (rgba orange 0.12).

3. Layer tab hover: Add .generator-layer-tab:not([aria-selected="true"]):not([aria-disabled="true"]):hover
   rule in Generator.css with rgba(255,255,255,0.04) background.

4. Selection pulse: Add @keyframes selectPulse in Generator.css (0.4s one-shot glow
   intensification), apply to .generator-option-item.selected.

Run npm run typecheck && npm run build after all changes.
Test visually at localhost:5173/generator.
```

---

## Execution Order

| Phase | When | Depends On | Spec File |
|-------|------|-----------|-----------|
| **0: Verify Audit** | Immediately after audit | Audit spec complete | `SPEC-PHASE0-VERIFY-AUDIT.md` |
| **1: Frontend Pricing** | After Phase 0 | Pricing endpoint working | `SPEC-PHASE1-FRONTEND-PRICING.md` |
| **2: Info Panel** | After Phase 1 | Frontend pricing visible | `SPEC-PHASE2-INFO-PANEL.md` |
| **3: Credit Formula** | Parallel with Phase 1-2 | Independent | `SPEC-PHASE3-CREDIT-FORMULA.md` |
| **4: Launch Readiness** | After Phase 0-3 | All fixes verified | `SPEC-PHASE4-LAUNCH-READINESS.md` |
| **5: E2E Testing** | After Phase 4 | Everything implemented | `SPEC-PHASE5-E2E-TESTING.md` |
| **6: Admin Dashboard** | Post-launch or parallel | Nice to have | `SPEC-PHASE6-ADMIN-DASHBOARD.md` |
| **7: Holder Airdrop** | After Phase 3 | Credit system working | `SPEC-HOLDER-AIRDROP.md` |
| **8: Pre-Launch Audit** | After Phase 0-7 | Everything implemented | `SPEC-PRELAUNCH-AUDIT.md` |
| **9A: Admin Auth** | After Phase 8 | HIGH — security | `SPEC-PHASE9A-ADMIN-AUTH.md` |
| **9B: CORS Lockdown** | After Phase 9A | HIGH — security | `SPEC-PHASE9B-CORS-LOCKDOWN.md` |
| **9C: Code Quality** | After Phase 9B | MEDIUM + LOW — cleanup | `SPEC-PHASE9C-CODE-QUALITY.md` |
| **10A: Action Bar** | After Phase 9C | UX — declutter | `SPEC-PHASE10A-ACTIONBAR-DECLUTTER.md` |
| **10B: Right Panel** | After Phase 10A | UX — visual consistency | `SPEC-PHASE10B-RIGHT-PANEL-POLISH.md` |
| **10C: Premium Polish** | After Phase 10B | UX — refinement | `SPEC-PHASE10C-PREMIUM-POLISH.md` |

Phases 1-2, Phase 3, and Phase 7 can run in parallel if you have multiple Claude CLI sessions.
Phase 7 depends on Phase 3 (credit formula must be finalized before inserting airdrop credits).
Phase 8 is the final gate before the real mint test.
Phases 9A → 9B → 9C address everything Phase 8 flagged.
Phases 10A → 10B → 10C are generator UX improvements — run in order after security is done.
