# Phase 2: Your Wojak — Complete Plan

> **Status:** Brainstorm complete, ready for implementation planning
> **Last updated:** February 7, 2026
> **Document purpose:** Captures all decisions, formulas, flows, and open questions from the Phase 2 brainstorming session.

---

## Table of Contents

1. [Overview](#overview)
2. [Product Details](#product-details)
3. [Pricing](#pricing)
4. [Credit System](#credit-system)
5. [Dynamic Trait Pricing](#dynamic-trait-pricing)
6. [Minting Pipeline](#minting-pipeline)
7. [Payment Flows](#payment-flows)
8. [Leaderboard](#leaderboard)
9. [Existing Infrastructure](#existing-infrastructure)
10. [Build Order](#build-order)
11. [Open Questions](#open-questions)

---

## Overview

Phase 2 introduces **"Your Wojak"** — a user-created NFT collection on the Chia blockchain where users design their own Wojaks using the existing Wojak Generator. Users choose their traits (head, eyes, clothes, mouth) and colors, then mint their creation as an NFT via MintGarden's Dynamic Minting API.

**Core loop:**
1. Users buy Wojak Farmers Plot NFTs on the secondary market → earn **credits**
2. Credits can be redeemed for **free mints** in the Wojak Generator
3. Users without credits can **pay directly** (0.2 XCH base + trait surcharges)
4. Popular/prestigious traits become **more expensive** over time (dynamic pricing)
5. Credit holders bypass dynamic pricing entirely — all traits are free

**Key message:** *"Buy 2 Wojak Farmers Plot NFTs, earn a free Your Wojak mint."*

---

## Product Details

| Property | Value |
|---|---|
| **Collection name** | Your Wojak |
| **Max supply** | 4,200 |
| **Naming** | Sequential: "Your Wojak #1", "Your Wojak #2", etc. |
| **Collection type** | Separate collection from Wojak Farmers Plot (Phase 1) |
| **Creator profile** | MoJuiceNFTs (`did:chia:15j5d0fm0x65nz7...`) |
| **Royalties** | 10% to creator address |
| **Duplicates** | Allowed (rare in practice due to color customization) |
| **Rate limiting** | None — no limit on mints per wallet |
| **Blockchain** | Chia |
| **Minting service** | MintGarden Dynamic Minting API |

### Trait Categories

Users select from these layers in the Generator:

| Category | Dynamic Pricing | Examples |
|---|---|---|
| **Base** | No (exempt) | Classic, Rekt, Rugged, Bleeding, Terminator |
| **Background** | No (exempt) | Cashtag backgrounds, plain, scenes |
| **Head** | **Yes** | Crown, caps, helmets, hats |
| **Eyes** | **Yes** | Laser eyes, sunglasses, etc. |
| **Clothes** | **Yes** | Suits, hoodies, etc. |
| **Mouth** | **Yes** | Mouth items, masks, facial hair (all one attribute) |

Each trait has **user-selectable colors**. Color choice does not affect pricing — dynamic pricing is per trait item regardless of color.

---

## Pricing

### Base Price

| Mint Type | Price |
|---|---|
| **Paid mint** | 0.2 XCH + highest trait surcharge |
| **Free mint (credits)** | 100 credits, all traits equal, no surcharges |
| **MintGarden credit cost** | 0.005 XCH per mint (at 5,000 batch rate) |

### Why 0.2 XCH

- Phase 1 minted at 0.3 XCH when XCH was ~$5 ($1.50 per mint)
- XCH is now ~$3, so 0.2 XCH = $0.60
- Deliberately lower than Phase 1 to signal: "The OGs are the premium collection"
- Creates clear hierarchy: Phase 1 (0.3 XCH original) > Phase 2 (0.2 XCH)
- At $0.60, price is not a barrier — interest and UX are what matter

### Economics Per Mint

| | Paid Mint | Free Mint |
|---|---|---|
| Revenue | 0.2+ XCH | 0 XCH (covered by royalties) |
| Cost to you | 0.005 XCH | 0.005 XCH |
| Margin | 97.5%+ | Royalty-funded |

---

## Credit System

### Overview

Credits are earned by buying Wojak Farmers Plot NFTs on the secondary market. They are tracked per wallet address and never expire.

| Property | Value |
|---|---|
| **Currency name** | Credits |
| **Free mint cost** | 100 credits |
| **Retroactive from** | ~January 5, 2026 (mint-out date, exact date TBD) |
| **Expiration** | Never |
| **CAT purchases** | Counted at XCH-equivalent value, same rate as XCH |
| **Sub-floor purchases** | Pro-rated (proportional credits) |

### Credit Formula

```
effective_floor = max(0.5, rolling_24h_floor)
price_ratio = max(1, purchase_price / effective_floor)
credits = 50 × price_ratio × (1 + 0.2 × ln(price_ratio))
```

**Components:**
- **Base rate:** 50 credits per floor-price purchase
- **Floor-relative scaling:** Buying above floor earns proportionally more
- **Whale bonus:** Logarithmic curve — smooth, no discrete tier cliffs
- **Floor cap:** Minimum effective floor of 0.5 XCH (prevents gaming)

### Floor Price Tracking

| Property | Value |
|---|---|
| **Method** | 24-hour rolling average |
| **Check frequency** | Every 6 hours (4 data points per day) |
| **Implementation** | Piggyback on existing `workers/fetch-sales.ts` cron |
| **Storage** | Cloudflare KV (last 4 readings) |
| **Source** | MintGarden collection API (`floor_price` field) |
| **Minimum cap** | 0.5 XCH |

### Whale Bonus Curve

The multiplier `1 + 0.2 × ln(price_ratio)` produces a smooth curve:

| Purchase (at 1 XCH floor) | Price Ratio | Bonus | Credits |
|---|---|---|---|
| 0.5 XCH (below floor) | 0.5x | — | 25 (pro-rated) |
| 1 XCH (floor) | 1x | 0% | 50 |
| 1.5 XCH | 1.5x | +8% | 81 |
| 2 XCH | 2x | +14% | 114 |
| 3 XCH | 3x | +22% | 166 |
| 4.5 XCH | 4.5x | +30% | 293 |
| 5 XCH | 5x | +32% | 330 |
| 5.1 XCH | 5.1x | +33% | 338 |
| 10 XCH | 10x | +46% | 730 |
| 20 XCH | 20x | +60% | 1,599 |

**Key comparison (same 10 XCH total spend):**
- 10 NFTs at 1 XCH each → 500 credits = **5 free mints**
- 1 NFT at 10 XCH → 730 credits = **7 free mints**

Whales get ~40% more free mints for the same total spend. The bonus scales smoothly — no cliffs between tiers.

### Credit Balance System

A simple ledger stored in D1:

**Credits In (earned):**
- Wallet address
- Sale ID (deduplication)
- Purchase price (XCH equivalent)
- Floor price at time of sale
- Credits earned
- Timestamp

**Credits Out (spent):**
- Wallet address
- Mint ID
- Credits spent (100)
- Timestamp

**Balance = sum(credits_in) - sum(credits_out)**

---

## Dynamic Trait Pricing

### Purpose

Prevents the "everyone picks a crown" problem. Popular/prestigious traits become more expensive over time, preserving economic rarity in a user-choice system.

### Rules

1. **Only cosmetic traits have dynamic pricing:** Head, Eyes, Clothes, Mouth
2. **Base and Background are exempt** — always included in the base price
3. **Tracking is per individual trait item** regardless of color (red crown and blue crown both increment "crown" usage count)
4. **Only the single highest surcharge applies** — if you pick a crown (+0.15 XCH) and laser eyes (+0.08 XCH), you only pay the crown surcharge. This prevents penalizing users for selecting more items.
5. **Free mints bypass dynamic pricing entirely** — all traits are equal when using credits

### Surcharge Formula (FINALIZED — Logarithmic)

```
trait_surcharge = 0.2 × ln(1 + uses / 20)
mint_surcharge = max(surcharge of each selected trait in [Head, Eyes, Clothes, Mouth])
total_price = 0.2 + mint_surcharge   // XCH
```

**Behavior:** Starts near-linear (~0.01 XCH per use), slows after ~20 uses, uncapped.

| Uses | Surcharge | Total Mint Price | Growth |
|---|---|---|---|
| 0 | +0.000 | 0.200 XCH | — |
| 1 | +0.010 | 0.210 XCH | Near-linear |
| 2 | +0.019 | 0.219 XCH | Near-linear |
| 3 | +0.028 | 0.228 XCH | Near-linear |
| 5 | +0.045 | 0.245 XCH | Near-linear |
| 10 | +0.081 | 0.281 XCH | Starting to slow |
| 20 | +0.139 | 0.339 XCH | Noticeably slower |
| 50 | +0.251 | 0.451 XCH | Slow growth |
| 100 | +0.358 | 0.558 XCH | Very gradual |
| 200 | +0.480 | 0.680 XCH | Very gradual |
| 500 | +0.651 | 0.851 XCH | Nearly flat |
| 1000 | +0.787 | 0.987 XCH | Nearly flat |

**No cap needed** — logarithmic growth self-limits. At 1000 uses, total price is still under 1 XCH.

### UX in Generator

- Each trait in the selector shows its current surcharge: **"Crown (+0.15 XCH)"**
- The total mint price updates live as traits are toggled
- Price breakdown is transparent: **"Base: 0.2 XCH + Crown premium: 0.15 XCH = 0.35 XCH"**
- Usage count shown per trait: **"Crown — used 150 times"**
- Credit users see: **"Free with credits — all traits included"**

---

## Minting Pipeline

### Technical Components Needed

#### 1. Image Composition
The Generator renders on a client-side canvas. For minting, a reliable server-side composite is needed.

**Options:**
- Send selected layers to a Cloudflare Worker that composites them
- Upload the client-rendered canvas directly
- Use an image processing service

#### 2. IPFS Upload
NFT images and metadata must be hosted on IPFS before calling MintGarden.

> **✅ CONFIRMED WITH MINTGARDEN:** The Dynamic Minting API does NOT offer an upload endpoint. We must host images and metadata on IPFS ourselves.

**Implementation:** Cloudflare Worker → Pinata (or similar pinning service) → returns IPFS URIs + SHA256 hashes

**Pipeline:**
1. Receive composited image from step 1
2. Upload image to Pinata → get IPFS URI (e.g., `https://ipfs.io/ipfs/Qm.../image.webp`)
3. Compute SHA256 hash of the image file → `data_hash`
4. Generate CHIP-0007 metadata JSON (see step 3 below)
5. Upload metadata JSON to Pinata → get IPFS URI
6. Compute SHA256 hash of the metadata JSON → `metadata_hash`
7. Return all 4 values to the minting step: `data_hash`, `data_uris`, `metadata_hash`, `metadata_uris`

#### 3. Metadata Generation (CHIP-0007)

```json
{
  "format": "CHIP-0007",
  "name": "Your Wojak #42",
  "description": "A custom Wojak created on Wojak.ink",
  "sensitive_content": false,
  "collection": {
    "name": "Your Wojak",
    "id": "<collection-uuid>"
  },
  "attributes": [
    { "trait_type": "Base", "value": "Classic" },
    { "trait_type": "Base Color", "value": "#FFD700" },
    { "trait_type": "Head", "value": "Crown" },
    { "trait_type": "Head Color", "value": "#FFD700" },
    { "trait_type": "Eyes", "value": "Laser" },
    { "trait_type": "Eyes Color", "value": "#FF0000" },
    { "trait_type": "Clothes", "value": "Suit" },
    { "trait_type": "Clothes Color", "value": "#1A1A2E" },
    { "trait_type": "Mouth", "value": "Cigar" },
    { "trait_type": "Background", "value": "Cashtag Green" },
    { "trait_type": "Background Color", "value": "#00FF00" }
  ]
}
```

#### 4. MintGarden API Call

```
POST https://api.mintgarden.io/mint/dynamic
Authorization: Bearer <API_KEY>

{
  "profile_id": "did:chia:15j5d0fm0x65nz7w6jr4c5any8mzrkru2x6l9uy2f0vcrc6jfedcqp20n4q",
  "metadata": {
    "data_hash": "<sha256-of-image>",
    "data_uris": ["https://ipfs.../image.webp"],
    "metadata_hash": "<sha256-of-metadata-json>",
    "metadata_uris": ["https://ipfs.../metadata.json"]
  },
  "royalty_address": "<your-xch-address>",
  "royalty_percentage": 10,
  "target_address": "<user-wallet-address>",
  // For paid mints only:
  "requested_mojos": 200000000000  // 0.2 XCH (+ surcharge in mojos)
}
```

#### 5. MintGarden Credits Available

| Property | Value |
|---|---|
| Credits available | 753 |
| Cost per credit | 0.005 XCH (5,000 batch) |
| Replenishment | Buy more at any time |
| Budget for 4,200 mints | 4,200 × 0.005 = 21 XCH total |

---

## Payment Flows

### Paid Mint Flow

> **✅ CONFIRMED WITH MINTGARDEN:** Credits are reserved immediately when an offer is created (the credit becomes an NFT precursor on-chain). If expiring offers are used, credits are freed after expiration. **All paid mint offers MUST use a 15-minute expiration.**

```
User designs Wojak → clicks "Mint"
    ↓
Frontend sends selected layers/colors to backend
    ↓
Backend composites image server-side
    ↓
Backend uploads image + metadata JSON to IPFS (via Pinata)
    ↓
Backend calls MintGarden API with:
  - target_address (user's wallet)
  - requested_mojos (0.2 XCH + highest trait surcharge)
  - reserve_for_seconds: 900 (15-minute expiration)
    ↓
MintGarden reserves 1 mint credit, returns offer file
    ↓
Frontend receives offer data
    ↓
Frontend calls chia_takeOffer via WalletConnect → Sage wallet
    ↓
UI shows countdown: "Accept in Sage — 14:59 remaining"
    ↓
EITHER:
  ✅ User accepts offer in Sage within 15 minutes
      → Transaction executes on-chain (atomic: payment + NFT)
      → Backend confirms mint
      → Congratulations page
      → Trait usage counters updated, supply counter incremented

  ❌ User does not accept within 15 minutes
      → Offer expires on-chain
      → Mint credit is freed back to your account
      → UI shows: "Offer expired. Your design is saved — try again when ready."
      → No charge, no mint, no credit lost
```

**Safety:**
- The Chia offer system is atomic — payment and NFT delivery happen in one transaction. There is no scenario where the user pays but doesn't receive the NFT.
- The 15-minute expiration ensures abandoned offers don't permanently consume mint credits.
- If the offer expires, the user's design remains saved in the Generator — they can re-mint with one click.

> **✅ CONFIRMED WITH MINTGARDEN:** The API parameter for offer expiration is `reserve_for_seconds`. For 15-minute offers, pass `reserve_for_seconds: 900`.

### Free Mint Flow (Credits)

```
User designs Wojak → clicks "Mint"
    ↓
System checks: wallet has ≥ 100 credits
    ↓
User confirms credit redemption
    ↓
Backend composites image + uploads to IPFS
    ↓
Backend calls MintGarden API with:
  - target_address only (NO requested_mojos)
    ↓
NFT mints directly to user's wallet
    ↓
100 credits deducted from balance
    ↓
Congratulations page
    ↓
Trait usage counters updated (but no surcharge applied)
Supply counter incremented
```

### Refund / Error Handling

- **Offer not accepted (expired):** Credit is freed automatically after the 15-minute expiration. No refund needed.
- **Offer rejected by user:** Same as expired — credit freed when the offer expires on-chain.
- **MintGarden API failure after image upload:** Retry with same image/metadata. IPFS content is already hosted. No credit consumed since the offer was never created.
- **Free mint failure:** Credits are not deducted until mint is confirmed successful.
- **IPFS upload failure:** Retry upload. No MintGarden credit involved yet at this stage.

**Edge case monitoring:** Admin dashboard to track:
- Offers created vs offers accepted (to monitor abandonment rate)
- Failed API calls
- Credit balance reconciliation (credits reserved vs credits freed vs credits consumed)

---

## Leaderboard

### Design

- **Separate from the games leaderboard** — lives in/near the Wojak Generator
- **Primary view:** Personal credit balance (connect wallet → see your credits, mints earned, mints used)
- **Public view:** Opt-in leaderboard with truncated wallet addresses (`xch1a3f...7k2d`)
- **DID integration:** If a wallet has a DID with a name, show the name (like the existing gallery lightbox)
- **Accessible via:** Button in the Generator that opens a lightbox

### Display

- Wallet address (truncated) or DID name
- Total credits earned
- Free mints used
- Free mints remaining
- Rank

---

## Existing Infrastructure (Ready to Use)

| Component | Status | Location |
|---|---|---|
| **Generator UI** | ✅ Fully built | `/generator` — 6+ layer categories, 130+ assets, live preview, randomize, undo/redo, favorites, export |
| **Sage wallet connection** | ✅ Built (not in Generator) | `src/sage-wallet/` — WalletConnect, connect/disconnect, address retrieval, NFT fetching |
| **Sales tracking** | ✅ Active | Dexie (primary) + Parse.bot (fallback), localStorage + Cloudflare KV |
| **Sales worker** | ✅ Running | `workers/fetch-sales.ts` — cron every 30 minutes |
| **MintGarden API** | ✅ Integrated | Used for fetching NFTs, listings, collection data (not yet minting) |
| **MintGarden credits** | ✅ 753 available | MoJuiceNFTs profile, 0.005 XCH per credit |
| **Currency system** | ✅ Built | Oranges + Gems (separate from Credits) |
| **Games leaderboard** | ✅ Built | D1 database, API endpoints, UI (separate from Credits leaderboard) |
| **Layer assets** | ✅ Available | `public/assets/wojak-layers/` — 130+ PNG files across all categories |

### Gaps to Fill

| Component | Status | What's Needed |
|---|---|---|
| **Buyer wallet tracking** | ✅ Built | `workers/credit-tracker/` fetches MintGarden Events API (XCH trades only) |
| **Historical backfill** | ✅ Built | `scripts/backfill-credits.ts` — fetches all events, generates SQL |
| **Credit calculation engine** | ✅ Built | Formula in worker + API endpoints in `functions/api/credits/` |
| **Floor price tracking** | ✅ Built | Daily snapshot in credit-tracker worker, stored in D1 + KV |
| **Dynamic pricing tracker** | ✅ Built | `trait_usage` table + `functions/api/mint/pricing.ts` endpoint |
| **Credit leaderboard API** | ✅ Built | `functions/api/credits/leaderboard.ts` |
| **IPFS upload pipeline** | ❌ Missing | Cloudflare Pages Function + Pinata (confirmed: MintGarden has no upload endpoint) |
| **Image approach** | ✅ Decided | Client-upload (canvas render → WebP blob → backend → IPFS) |
| **MintGarden mint integration** | ❌ Missing | API call to Dynamic Minting endpoint (UNBLOCKED: `reserve_for_seconds: 900`) |
| **Mint button in Generator** | ❌ Missing | Wallet connection + paid/free flow + offer file copy |
| **Color system** | ❌ Missing | Fill/outline rendering, color picker (BLOCKED: layers in progress) |
| **Credit leaderboard UI** | ❌ Missing | Lightbox component in Generator |

---

## Build Order

### Phase A — Foundation (Do First)

1. **Start capturing buyer wallet addresses** from Dexie trade data in the sales worker
2. **Backfill historical buyer data** for all sales since ~January 5, 2026
3. **Add floor price tracking** to the existing worker (every 6 hours, store in KV)
4. **Build the credit calculation engine** (formula, D1 storage, balance endpoint)
5. **Build the trait usage tracking system** (per-trait counters, surcharge calculation)

### Phase B — Minting Pipeline

6. **IPFS upload pipeline** (Cloudflare Worker → Pinata API for image + metadata hosting)
7. **Server-side image composition** (or client-upload approach)
8. **Metadata generation** (CHIP-0007 compliant JSON)
9. **MintGarden Dynamic Minting API integration** (secure backend endpoint)
10. **Wire Sage wallet into the Generator** (WalletConnect already exists)

### Phase C — User Experience

11. **Mint button** with dual flow (paid with 15-min expiring offers / free with credits)
12. **Live price display** in Generator (updates as traits are selected)
13. **Credit balance display** (connect wallet → see credits)
14. **Supply counter** ("X of 4,200 minted")
15. **Congratulations page** after successful mint
16. **Error handling and refund detection**

### Phase D — Polish & Launch

17. **Credit leaderboard** (personal + public opt-in)
18. **Testing** with real mints (budget: ~10 credits = 0.05 XCH)
19. **Soft launch** with core community members
20. **Public announcement** (a few days before full launch)
21. **Retroactive credit surprise** — existing collectors discover their credits

---

## Open Questions

### Must Resolve Before Building

- [ ] **Exact retroactive date** — Around January 5, 2026. Will determine from backfill event data.
- [x] **Trait surcharge formula** — ✅ Logarithmic: `0.2 × ln(1 + uses / 20)`. Starts linear, slows after ~20 uses.
- [x] **Surcharge cap** — ✅ Uncapped. Logarithmic growth self-limits (~0.79 XCH at 1000 uses).
- [x] **MintGarden: offer expiration parameter** — ✅ Confirmed: `reserve_for_seconds: 900` (value in seconds). 15 minutes = 900s.
- [x] **CAT trade handling** — ✅ XCH-only. CAT trades excluded from credit system (unreliable conversion). Revisit in Phase 2.5.
- [x] **Credit storage precision** — ✅ INTEGER × 100 (50 credits = 5000 units). Eliminates float errors.
- [x] **Floor price snapshots** — ✅ Once per day (simplest, sufficient for low volume).
- [x] **Backfill floor price** — ✅ Fixed 1.0 XCH for all historical events.
- [x] **Worker architecture** — ✅ New dedicated `workers/credit-tracker/` with KV + D1 bindings.
- [x] **Mint numbering** — ✅ Assigned at confirmation only (no gaps). Sequential via D1 transaction.
- [x] **Image format** — ✅ WebP for IPFS uploads.
- [x] **Free mint default** — ✅ Default to free mint with "Pay with XCH instead" toggle.
- [x] **Trait usage timing** — ✅ Increment at confirmation only (not at offer creation).

### Resolved (Confirmed with MintGarden)

- [x] **MintGarden: offer credit consumption** — ✅ Credits are reserved immediately when offer is created. Use **expiring offers** (15 min) to free credits on abandoned offers.
- [x] **MintGarden: IPFS upload** — ✅ No upload endpoint. Must self-host via Pinata or similar IPFS pinning service.

### Can Decide Later

- [ ] **After 4,200 strategy** — Most likely open mint that stays open indefinitely. 4,200 is a soft cap.
- [ ] **Royalty customization** — User-chosen royalty address/split (Phase 2.5 or Phase 3 feature, using CHIP-0008 Splitter Puzzle)
- [ ] **Mint confirmation UX details** — Celebration animations, share buttons, MintGarden link
- [ ] **CAT trade credits** — Could be added in Phase 2.5 if reliable price oracle becomes available

---

## Appendix: Key Formulas

### Credit Calculation

```
effective_floor = max(0.5, rolling_24h_floor)
price_ratio = max(1, purchase_price_xch / effective_floor)
whale_multiplier = 1 + 0.2 × ln(price_ratio)
credits = 50 × price_ratio × whale_multiplier
```

### Dynamic Trait Surcharge (Logarithmic)

```
trait_surcharge = 0.2 × ln(1 + times_trait_used / 20)
mint_surcharge = max(surcharge for each selected trait in [Head, Eyes, Clothes, Mouth])
total_price = 0.2 + mint_surcharge  // XCH
```

Uncapped. Starts near-linear (~0.01/use), slows after ~20 uses.

### Free Mint Eligibility

```
balance = sum(all credits earned by wallet) - sum(all credits spent by wallet)
can_free_mint = balance >= 100
```

---

## Appendix: Color Palette (192 Colors)

### Overview

- **48 base colors** (original palette refined + 7 new additions)
- **3 variants per base**: Lighter (+30% white), Darker (+30% black), Muted (-35% saturation)
- **Total: 192 colors** (48 × 4 including base)
- Color choice does NOT affect dynamic trait pricing
- Ivory lighter variants naturally produce near-white/white tones

### Variant Definitions

| Variant | Method | Purpose |
|---|---|---|
| **Base** | Original color | The core palette color |
| **Lighter** | Mix 30% toward #FFFFFF | Softer, brighter version |
| **Darker** | Mix 30% toward #000000 | Deeper, richer version |
| **Muted** | Reduce saturation 35% | Desaturated, dusty version |

---

### Grays & Black (5 base × 4 = 20 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 1 | Light Gray | #B0B0B0 | #CFCFCF | #7B7B7B | #B0B0B0 |
| 2 | Medium Gray | #808080 | #A6A6A6 | #595959 | #808080 |
| 3 | Dark Gray | #606060 | #8F8F8F | #434343 | #606060 |
| 4 | Charcoal | #404040 | #737373 | #2D2D2D | #404040 |
| 5 | Black | #202020 | #5C5C5C | #161616 | #202020 |

> Note: Grays are achromatic — muted variants are identical to base since there is no saturation to reduce.

### Warm Neutrals (5 base × 4 = 20 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 6 | Ivory | #F5F5DE | #F9F9EC | #ABAB9B | #EDEDDF |
| 7 | Peach | #FFDAB9 | #FFE8D1 | #B39882 | #F2DFCD |
| 8 | Light Beige | #C0C0A3 | #D6D6C2 | #868672 | #BDBDAD |
| 9 | Sand | #A0A083 | #C0C0A6 | #70705C | #9D9D90 |
| 10 | Taupe | #8C8072 | #B1A89E | #625A50 | #8A8580 |

### Pinks & Magentas (4 base × 4 = 16 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 11 | Pastel Pink | #F5C3CB | #F8D8DE | #AB8A8E | #ECCFD4 |
| 12 | Hot Pink | #ED72B2 | #F3A1CB | #A64F7D | #D48AAE |
| 13 | Magenta | #EA3891 | #F17DB5 | #A32766 | #CF5E9B |
| 14 | Neon Magenta | #EA33F7 | #F17CF9 | #A324AD | #CB5DDC |

### Reds (6 base × 4 = 24 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 15 | Salmon Red | #ED6D52 | #F39C8A | #A64C3A | #D4847A |
| 16 | Coral | #FF7F50 | #FFA888 | #B35938 | #E49578 |
| 17 | Bright Red | #EA3323 | #F17568 | #A32418 | #CD524B |
| 18 | Neon Red | #EB473D | #F18477 | #A4322B | #CE6562 |
| 19 | Dark Red | #7F170E | #A65F59 | #59100A | #6F3530 |
| 20 | Burgundy | #800020 | #A64D66 | #5A0016 | #6E2639 |

### Oranges & Yellows (3 base × 4 = 12 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 21 | Orange | #F2A93B | #F6C47B | #A97629 | #DEBB6A |
| 22 | Yellow | #FFFF54 | #FFFF8F | #B3B33B | #EDED7E |
| 23 | Gold | #F8D849 | #FAE588 | #AE9733 | #E6D773 |

### Browns & Metallics (7 base × 4 = 28 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 24 | Tan | #CDB591 | #DDD0B4 | #907F66 | #C5BAA3 |
| 25 | Metallic Gold | #CEB04E | #DEC988 | #907B37 | #C0B56D |
| 26 | Bronze | #C28342 | #D5A67B | #885C2E | #B3926A |
| 27 | Saddle Brown | #965635 | #B58871 | #693C25 | #8B6A55 |
| 28 | Chocolate | #824920 | #A87E63 | #5B3316 | #7C6044 |
| 29 | Dark Brown 2 | #5D3A10 | #8E7459 | #41290B | #5D4A30 |
| 30 | Dark Brown | #584135 | #8B7B73 | #3E2D25 | #5B5049 |

### Greens (5 base × 4 = 20 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 31 | Neon Green | #75FB4C | #A3FC87 | #52B035 | #8FE078 |
| 32 | Lime Green | #67CA4D | #94DA81 | #488D36 | #82BD73 |
| 33 | Olive | #6B8E23 | #97B268 | #4B6318 | #7A8A48 |
| 34 | Forest Green | #458933 | #7DAB70 | #306024 | #5F844E |
| 35 | Sea Green | #4A895C | #82AB92 | #346040 | #628A6D |

### Teals & Cyans (4 base × 4 = 16 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 36 | Neon Cyan | #75FBFD | #A3FCFE | #52B0B1 | #92E4E5 |
| 37 | Turquoise | #74DDD0 | #A2E9E1 | #519B92 | #8ED5CE |
| 38 | Light Sea Green | #55AFA9 | #88C7C3 | #3B7B76 | #73AFAB |
| 39 | Teal | #008B8B | #4DB1B1 | #006161 | #2D8A8A |

### Blues (5 base × 4 = 20 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 40 | Deep Sky Blue | #56BCF9 | #8AD2FB | #3C84AE | #78BFEA |
| 41 | Dodger Blue | #458EF7 | #82B2F9 | #3064AD | #6A97E2 |
| 42 | Slate Blue | #5F7F8F | #8FA6B1 | #425964 | #6F838B |
| 43 | Medium Blue | #0000C5 | #4D4DD7 | #00008A | #2F2FB1 |
| 44 | Navy Blue | #00007B | #4D4DA3 | #000056 | #262678 |

### Purples (4 base × 4 = 16 colors)

| # | Name | Base | Lighter | Darker | Muted |
|---|---|---|---|---|---|
| 45 | Lavender | #B39DDB | #CDB9E7 | #7D6E99 | #B0A4CC |
| 46 | Orchid | #AD5BCD | #C68DDB | #793F90 | #A174BC |
| 47 | Violet | #932CE7 | #B574EE | #671FA2 | #8653C8 |
| 48 | Dark Purple | #75147C | #A25DA7 | #520E57 | #6E3774 |

---

### Color Palette Summary

| Family | Base Colors | Total with Variants |
|---|---|---|
| Grays & Black | 5 | 20 |
| Warm Neutrals | 5 | 20 |
| Pinks & Magentas | 4 | 16 |
| Reds | 6 | 24 |
| Oranges & Yellows | 3 | 12 |
| Browns & Metallics | 7 | 28 |
| Greens | 5 | 20 |
| Teals & Cyans | 4 | 16 |
| Blues | 5 | 20 |
| Purples | 4 | 16 |
| **Total** | **48** | **192** |

### Changes from Original Palette

**Removed (4):**
- ~~Neon Lime #7FFB50~~ (near-identical to Neon Green)
- ~~Dark Turquoise #5DCBCF~~ (too close to Turquoise)
- ~~Metallic Silver #C0C0C0~~ (too close to Light Gray)
- ~~Dark Orange #F09235~~ (too close to Orange)

**Added (7):**
- Peach #FFDAB9
- Coral #FF7F50
- Burgundy #800020
- Olive #6B8E23
- Teal #008B8B
- Slate Blue #5F7F8F
- Lavender #B39DDB

### Generator UX for Colors

When a user selects a trait, they see the **48 base color swatches** in a grid. Tapping a base color expands to show the base + 3 variants (lighter, darker, muted) — a "color family" zoom. This keeps the UI clean while giving full access to all 192 colors.

---

## Appendix: Reference Links

- **MintGarden Dynamic Minting API:** https://mintgarden.io/minting-api
- **MintGarden API docs:** https://api.mintgarden.io/docs
- **Secure the Mint (MintGarden):** https://github.com/mintgarden-io/secure-the-mint
- **CHIP-0007 (NFT metadata standard):** Chia NFT metadata format
- **CHIP-0008 (Splitter Puzzle / royalty splitting):** https://github.com/Chia-Network/chips/pull/30
- **Sage Wallet:** https://sagewallet.net/
- **Sage WalletConnect offer commands:** `chia_takeOffer`, `chia_checkOfferValidity`, `chia_getOfferSummary`
