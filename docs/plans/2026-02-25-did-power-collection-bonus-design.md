# DID Power System & Collection Bonus Design

**Date:** 2026-02-25
**Status:** Approved
**Goal:** Incentivize buying NFTs from other creators while keeping the system simple to track and explain.

---

## Business Goals

1. **Primary:** Drive Wojak Farmer's Plot NFT purchases (main revenue)
2. **Secondary:** Encourage use of the generator to mint Your Wojaks
3. **Tertiary:** Create secondary market demand for Your Wojaks

---

## Design Principles

- **Easy to track:** Reuse existing infrastructure (sales_history, did_holdings)
- **Easy to explain:** One sentence per mechanic
- **Bulletproof:** On-chain proof of purchase via marketplace APIs
- **No gaming:** Only verified purchases count, not transfers

---

## Power System Overview

```
DID Power Level = Farmer's Plot Power + Your Wojak Power + Collection Bonus
```

### 1. Farmer's Plot Power (Phase 1)

**Rule:** Each Farmer's Plot NFT in your DID gives flat power.

```
Farmer's Plot Power = (Count of Farmer's Plots in DID) × PLOT_POWER_VALUE
```

| Setting | Value | Notes |
|---------|-------|-------|
| `PLOT_POWER_VALUE` | 20 points | Flat per NFT, 2x base Your Wojak value |

**User explanation:**
> "Each Wojak Farmer's Plot in your DID gives you 20 power."

---

### 2. Your Wojak Power (Phase 2)

**Rule:** Each Your Wojak contributes its vote score to your power.

```
Your Wojak Power = Sum of (Glazes - Fades) for top N Wojaks in DID
```

| Setting | Value | Notes |
|---------|-------|-------|
| `PLAYER_TOP_N` | 10 | Only top 10 scoring Wojaks count |

**User explanation:**
> "Your Wojaks earn power from community votes. Glazes add points, Fades subtract."

---

### 3. Collection Bonus (New)

**Rule:** Buying Wojaks from other creators gives bonus power based on creator diversity.

```
Collection Bonus = Sum of points from BOUGHT Wojaks (from other creators)
```

#### Qualification Requirements

A Wojak qualifies for Collection Bonus if ALL conditions are met:

1. **In your DID:** You currently hold it
2. **Phase 2 collection:** It's a Your Wojak (not Farmer's Plot)
3. **Bought, not gifted:** Exists in `sales_history` with `buyer_address = your wallet`
4. **From another creator:** `creator_wallet != your wallet`

#### Bonus Calculation

**Tier-based on creator diversity:**

| Unique Creators Collected | Bonus Per Qualifying Wojak |
|---------------------------|---------------------------|
| 1-2 creators | 0 points (no bonus) |
| 3-5 creators | +3 points each |
| 6-10 creators | +5 points each |
| 11+ creators | +7 points each |

**Cap:** Maximum 25 Wojaks count toward collection bonus.

**User explanation:**
> "Collect Wojaks from different creators to earn bonus power. The more creators you collect from, the bigger the bonus."

---

## Technical Implementation

### Existing Infrastructure (Reuse)

| Component | Purpose | Changes Needed |
|-----------|---------|----------------|
| `sales_history` table | Track all NFT sales with buyer/seller | Add `collection` column for phase1/phase2 |
| `fetch-sales` worker | Sync Dexie + MintGarden sales | Add Phase 2 collection ID |
| `did_holdings` table | Track DID NFT ownership | Already has `creator_wallet` |
| `game_players` table | Link DID to wallet | No changes |

### New/Modified Queries

#### Count Farmer's Plots in DID
```sql
SELECT COUNT(*) as plot_count
FROM did_holdings
WHERE did_id = ? AND collection = 'phase1'
```

#### Get Collection Bonus Eligible Wojaks
```sql
SELECT
  dh.nft_id,
  ws.net_score,
  pm.wallet_address as creator_wallet
FROM did_holdings dh
JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
JOIN game_players gp ON gp.did_id = dh.did_id
JOIN sales_history sh ON sh.nft_id = dh.nft_id
  AND sh.buyer_address = gp.wallet_address
  AND sh.collection = 'phase2'
WHERE dh.did_id = ?
  AND dh.collection = 'phase2'
  AND pm.wallet_address != gp.wallet_address  -- Not your own creation
ORDER BY ws.net_score DESC
LIMIT 25
```

#### Calculate Collection Bonus
```sql
WITH bought_wojaks AS (
  -- Query above
),
unique_creators AS (
  SELECT COUNT(DISTINCT creator_wallet) as creator_count
  FROM bought_wojaks
)
SELECT
  creator_count,
  CASE
    WHEN creator_count >= 11 THEN 7
    WHEN creator_count >= 6 THEN 5
    WHEN creator_count >= 3 THEN 3
    ELSE 0
  END as bonus_per_wojak,
  COUNT(*) as qualifying_wojaks
FROM bought_wojaks, unique_creators
```

### Database Migration

```sql
-- Migration: Add collection column to sales_history for Phase 1 vs Phase 2
ALTER TABLE sales_history ADD COLUMN collection TEXT DEFAULT 'phase1';
CREATE INDEX IF NOT EXISTS idx_sh_collection ON sales_history(collection);

-- Add nft_id column to link to did_holdings/wojak_scores
ALTER TABLE sales_history ADD COLUMN nft_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sh_nft_id ON sales_history(nft_id);
```

### Worker Changes

**fetch-sales worker:**
1. Add Phase 2 collection ID as second collection to sync
2. Populate `collection` column ('phase1' or 'phase2')
3. Populate `nft_id` from MintGarden launcher_id

---

## Power Calculation Flow

```
1. Load DID holdings
   ├── Count Farmer's Plots → × 20 = Plot Power
   └── Get Your Wojaks with vote scores

2. Calculate Your Wojak Power
   └── Sum top 10 vote scores = Wojak Power

3. Calculate Collection Bonus
   ├── Filter to BOUGHT Wojaks (exists in sales_history as buyer)
   ├── Filter to OTHER CREATORS (creator_wallet != your wallet)
   ├── Count unique creators → determines bonus tier
   ├── Cap at 25 Wojaks
   └── Sum bonuses = Collection Bonus

4. Total DID Power = Plot Power + Wojak Power + Collection Bonus
```

---

## Example Scenarios

### Scenario 1: New Player
- 1 Farmer's Plot (verification minimum)
- 2 self-minted Your Wojaks (+5, +3 vote scores)
- No purchased Wojaks

```
Plot Power:       1 × 20 = 20
Wojak Power:      5 + 3 = 8
Collection Bonus: 0 (no purchases)
───────────────────────────
Total:            28 power
```

### Scenario 2: Active Collector
- 3 Farmer's Plots
- 5 self-minted Your Wojaks (top 10 scores: +15, +12, +8, +5, +2)
- 4 bought Wojaks from 3 different creators (+20, +18, +10, +8 scores)

```
Plot Power:       3 × 20 = 60
Wojak Power:      15+12+8+5+2 + 20+18+10+8 = 98 (top 10)
Collection Bonus: 4 wojaks × 3 pts (3 creators) = 12
───────────────────────────
Total:            170 power
```

### Scenario 3: Whale Collector
- 10 Farmer's Plots
- 30 bought Wojaks from 15 different creators

```
Plot Power:       10 × 20 = 200
Wojak Power:      (sum of top 10 vote scores)
Collection Bonus: 25 wojaks × 7 pts (11+ creators) = 175 (capped at 25)
───────────────────────────
Total:            375+ power
```

---

## Anti-Gaming Measures

| Attack Vector | Prevention |
|---------------|------------|
| Gift Wojaks to yourself | Only `sales_history` purchases count |
| Create alt wallet, mint, transfer | No sale record = no bonus |
| Buy from yourself | Same wallet = not "another creator" |
| Spam low-quality Wojaks | Vote score still matters for power |

---

## Monitoring & Admin

### Dashboard Queries

**Collection bonus leaderboard:**
```sql
SELECT
  gp.did_id,
  dp.display_name,
  COUNT(DISTINCT pm.wallet_address) as unique_creators_collected,
  COUNT(*) as total_bought
FROM did_holdings dh
JOIN game_players gp ON gp.did_id = dh.did_id
JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
JOIN sales_history sh ON sh.nft_id = dh.nft_id
  AND sh.buyer_address = gp.wallet_address
LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
WHERE pm.wallet_address != gp.wallet_address
GROUP BY gp.did_id
ORDER BY unique_creators_collected DESC, total_bought DESC
```

**Phase 2 sales activity:**
```sql
SELECT
  DATE(completed_at) as date,
  COUNT(*) as sales,
  SUM(xch_equivalent) as volume_xch
FROM sales_history
WHERE collection = 'phase2'
GROUP BY DATE(completed_at)
ORDER BY date DESC
```

---

## User-Facing Copy

### Rules Modal Update

```
## How Power Works

**Farmer's Plot NFTs**
Each Wojak Farmer's Plot in your DID gives you 20 power.

**Your Wojaks**
Your Wojaks earn power from community votes:
- Glaze = +1 point
- Fade = -1 point
- Your top 10 scoring Wojaks count toward your power

**Collection Bonus**
Buy Wojaks from other creators to earn bonus power:
- 3-5 unique creators: +3 per collected Wojak
- 6-10 unique creators: +5 per collected Wojak
- 11+ unique creators: +7 per collected Wojak
- Maximum 25 collected Wojaks count

Only verified marketplace purchases count (not gifts or transfers).
```

---

## Implementation Order

1. **Database migration** - Add columns to sales_history
2. **Worker update** - Sync Phase 2 sales
3. **API update** - Add collection bonus to power calculation endpoints
4. **Frontend update** - Display collection bonus in player stats
5. **Rules modal** - Update copy to explain new mechanics

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Phase 2 secondary sales | +50% in 30 days | sales_history count |
| Unique creators collected per player | Avg 3+ | Dashboard query |
| Players with collection bonus | 25%+ of active | Dashboard query |

---

## Open Questions (Resolved)

1. ~~How to identify "bought vs gifted"?~~ → Use sales_history with buyer_address
2. ~~How to identify "from another creator"?~~ → Compare creator_wallet vs holder's wallet
3. ~~Whale dominance?~~ → Cap at 25 Wojaks for collection bonus
