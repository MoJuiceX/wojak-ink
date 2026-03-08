# AI Enhance v2 — Unified Design Document

**Date:** 2026-03-08
**Status:** Approved
**Supersedes:** `2026-03-08-reve-ai-enhance-design.md` (original design)

---

## Overview

Four workstreams to complete the AI Enhance feature:

1. **Credit Pricing Update** — new 4-tier pricing structure
2. **Credits Purchase Flow** — real XCH payment via SageWallet + Spacescan verification
3. **Metadata Integration** — AI option labels replace trait values in CHIP-0007
4. **Combat Stats Integration** — AI enhancements affect type/nature/ability

Additionally, the preset catalog is pruned from 917 → 569 options with full combat mapping.

---

## 1. Credit Pricing

### Old (5 tiers — to be replaced)

| Tier | Credits | XCH |
|------|---------|-----|
| 1 | 1 | 0.08 |
| 5 | 5 | 0.35 |
| 15 | 15 | 0.90 |
| 30 | 30 | 1.50 |
| 50 | 50 | 2.00 |

### New (4 tiers)

| Tier | Credits | XCH | Mojos | USD/credit | Discount | Badge |
|------|---------|-----|-------|-----------|----------|-------|
| `'1'` | 1 | 0.10 | 100,000,000,000 | 25¢ | — | — |
| `'10'` | 10 | 0.80 | 800,000,000,000 | 20¢ | 20% off | — |
| `'25'` | 25 | 1.50 | 1,500,000,000,000 | 15¢ | 40% off | POPULAR |
| `'50'` | 50 | 2.40 | 2,400,000,000,000 | 12¢ | 52% off | BEST VALUE |

**Unit economics:** ReV API costs ~$0.086/image (54 credits at $12/7,500). At XCH = $2.50:
- Single credit: 25¢ → 66% margin
- Best value: 12¢ → 28% margin

### Files to update

- `src/types/aiEnhance.ts` — frontend `AI_CREDIT_BUNDLES`
- `functions/api/ai/_shared.ts` — backend `AI_CREDIT_BUNDLES` + mojos
- `src/components/generator/ai/AICreditsShop.tsx` — `BASE_PRICE_PER_CREDIT` (0.08 → 0.10), default tier (`'15'` → `'25'`)

---

## 2. Credits Purchase Flow

### Current state

`buy.ts` and `confirm.ts` are stubs with hardcoded `'TODO_WALLET'`. No real payment.

### Payment mechanism

Direct XCH transfer via SageWallet's `sendXCH(treasuryAddress, amountMojos, fee)`. No offer files.

### On-chain verification

Chia uses a coin model (UTXO-like) — transaction IDs aren't directly queryable by ID on Spacescan. Solution: **unique mojo amounts**.

Each purchase gets a random 1–9,999 mojo offset added to the bundle's base price. This makes each payment uniquely identifiable when scanning the treasury address for incoming coins.

### Purchase flow

```
1. User selects bundle → clicks "Buy"
2. POST /api/ai/credits/buy
   → { walletAddress, tier }
   → Backend generates unique amount: base mojos + random(1, 9999)
   → Creates pending purchase row in D1
   → Returns { purchaseId, amountMojos, treasuryAddress }
3. Frontend calls sendXCH(treasuryAddress, amountMojos, fee)
   → User approves in Sage wallet
   → Gets back transactionId
4. POST /api/ai/credits/confirm
   → { purchaseId, transactionId }
   → Backend polls Spacescan proxy for matching coin on treasury address
   → Match by exact mojo amount (unique offset ensures no collision)
   → On match: status → 'confirmed', credits added
   → Returns { creditsAdded, newBalance }
5. Frontend: confetti + success, refetch balance
```

### Spacescan integration

- Proxy exists at `functions/api/spacescan/[[path]].ts` (5-min edge cache)
- Treasury puzzle hash: derived from `xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd`
- Poll with retry — coins take 1–3 minutes to appear on-chain
- Pending purchases expire after 30 minutes

### Frontend changes (AICreditsShop.tsx)

- Import `useSageWallet` for `sendXCH()`
- Wallet connection check (show "Connect wallet" if not connected)
- Multi-state UI: selecting → sending → waiting → success/error
- Polling indicator during on-chain confirmation wait

---

## 3. Metadata Integration

### Decision

AI enhancement names **replace** the original trait value in CHIP-0007 metadata. No separate "AI Enhanced" flag.

### Both modes behave the same

- **Enhance existing**: User has Hoodie, enhances with "Tiger Stripes" → `"Clothes": "Tiger Stripes"`
- **Create new**: User has T-Shirt, creates "Skeleton Bone Armor" → `"Clothes": "Skeleton Bone Armor"`

In both cases the original layer name disappears from metadata.

### Rules

- Each AI preset option uses its `label` as the metadata trait value
- Multiple enhancements on same category: last one wins
- Non-enhanced categories keep their original layer trait values
- Non-AI mints are completely unchanged
- Pre-mint only (post-mint enhancement is a future feature)

### Example

```json
{
  "attributes": [
    { "trait_type": "Base", "value": "Classic" },
    { "trait_type": "Clothes", "value": "Skeleton Bone Armor" },
    { "trait_type": "Head", "value": "Cap Red" },
    { "trait_type": "MouthBase", "value": "Numb" }
  ]
}
```

### Files involved

- Mint flow metadata assembly — check if category has active AI enhancement, use option label instead of layer trait name
- `AIEnhanceContext` — already tracks `enhancedCategories` and selected options per category

---

## 4. Combat Stats Integration

### Decision

AI enhancements affect type/nature/ability. Same combat points as regular layers. Last enhancement wins (replaces previous). Pre-mint only.

### Structure

Each AI option has a combat mapping:

```typescript
interface AICombatMapping {
  primaryType: CombatType;    // 4-8 pts
  primaryPts: number;
  secondaryType: CombatType;  // 2-4 pts
  secondaryPts: number;
  natureStat: NatureStat;     // 1-3 pts
  natureStatPts: number;
}
```

### Mapping strategy

- **Family-level defaults** for thematically uniform families (43 families)
- **Per-option overrides** for diverse families (8 families, ~93 individual mappings)
- Total mappings: ~51 family defaults + ~93 overrides = ~144

### Integration point

`identity-calculator.ts` gets a new `aiEnhancements` parameter — a map of category → active AI option. For each AI-enhanced category, the AI combat mapping replaces the regular layer's combat contribution.

### New file

`src/lib/combat/data/ai-combat-map.ts` — all family defaults and per-option overrides.

---

## 5. Preset Catalog Pruning

### Summary

917 → 569 options (348 cut, 38% reduction). All 51 families retained, each trimmed from 18 to 10–12.

### Cut criteria

1. Too similar to another option in same family
2. Too niche/obscure for most users
3. Cross-family redundancy
4. Literal duplicates (3 found)
5. Culturally sensitive without clear value

### Per-section counts

| Section | Before | After | Cut |
|---------|--------|-------|-----|
| UNIVERSAL_ENHANCE | 126 | 81 | 45 |
| CLOTHES_ENHANCE | 162 | 101 | 61 |
| HEAD_ENHANCE | 108 | 64 | 44 |
| CLOTHES_CREATE | 180 | 115 | 65 |
| HEAD_CREATE | 180 | 101 | 79 |
| BACKGROUND_CREATE | 161 | 107 | 54 |
| **TOTAL** | **917** | **569** | **348** |

### Combat type distribution (all 18 types covered)

| Tier | Types |
|------|-------|
| Well-represented (6-8 families) | ELECTRIC, DARK, METAL, FIRE, LIGHT, STONE, PSYCHIC, SPIRIT |
| Adequate (3-4 families) | GRASS, DRAGON, COSMIC, AIR |
| Niche (1-2 families) | WATER, ICE, GHOST, VENOM, INSECT |

### Families requiring per-option combat overrides (8)

1. **Elemental** (12 options) — fire/ice/lightning/water/stone/etc.
2. **Energy & Power** (11 options) — electric/cosmic/light/dark/spirit
3. **Magical** (11 options) — spirit/dark/fire/psychic/cosmic
4. **Material Swap** (11 options) — stone/ice/grass/air/ghost
5. **Fantasy & Magical clothes** (12 options) — spirit/grass/ghost/water/electric
6. **Fantasy & Creature head** (12 options) — dragon/light/dark/fire/venom/stone
7. **Nature & Wild bg** (12 options) — water/grass/ice/fire/stone
8. **Action & Extreme bg** (12 options) — fire/electric/ghost/water/air/cosmic

### Key rebalancing decisions

- **Animal Prints**: INSECT → VENOM primary (snake, croc, shark = venomous creatures)
- **Hats & Classic**: NEUTRAL → AIR primary (hats = wind/outdoor)
- **Indoor Scenes**: NEUTRAL → DARK primary (enclosed spaces)
- **Sport & Activity**: NEUTRAL → FIRE primary (competitive fire)
- **Food families**: NEUTRAL → GRASS primary (organic/food)
- **Nature & Wild bg**: GRASS → WATER primary (many aquatic options)
- **Material Swap**: STONE → ICE primary (frozen/crystalline materials)

---

## 6. What is NOT in scope

- Post-mint AI enhancement (future)
- Freeform text prompts (structured presets only)
- Facewear AI enhancement (excluded from wizard)
- New database migrations (existing schema is sufficient)
- ReV Remix/Create endpoints (future)
- AI credits from trading (future)

---

## 7. Success criteria

- [ ] Credit pricing updated to 4-tier structure in all 3 files
- [ ] Real XCH payment via SageWallet sendXCH works end-to-end
- [ ] Spacescan verification matches payments by unique mojo amounts
- [ ] Pending purchases expire after 30 minutes
- [ ] AI option label replaces trait value in CHIP-0007 metadata
- [ ] Non-AI mints remain unchanged
- [ ] Combat identity calculator accepts AI enhancement overrides
- [ ] All 18 combat types are reachable through AI presets
- [ ] Preset catalog reduced to ~569 options
- [ ] 8 families have per-option combat overrides (~93 mappings)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
