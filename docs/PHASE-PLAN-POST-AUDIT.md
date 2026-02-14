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

Phases 1-2, Phase 3, and Phase 7 can run in parallel if you have multiple Claude CLI sessions.
Phase 7 depends on Phase 3 (credit formula must be finalized before inserting airdrop credits).
