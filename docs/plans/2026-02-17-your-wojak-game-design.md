# Your Wojak Game — Design Doc

**Goal:** Build a self-reinforcing game economy on top of the Your Wojak NFT collection that incentivizes minting, trading, collecting, voting, burning, battling, and staking — creating a flywheel where every player action benefits the ecosystem.

**Date:** 2026-02-17

**Scale:** 0–9,000 Power Level ("IT'S OVER 9,000!" — the #1 player should land around this mark)

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Entry Requirements](#2-entry-requirements)
3. [The 5 Actions](#3-the-5-actions)
4. [Power Level (Scoring)](#4-power-level-scoring)
5. [Voting System](#5-voting-system)
6. [Burn Mechanic](#6-burn-mechanic)
7. [Battle System](#7-battle-system)
8. [NFT Staking (CHIP-0051)](#8-nft-staking-chip-0051)
9. [NFT Naming](#9-nft-naming)
10. [Royalty Structure (SplitXCH)](#10-royalty-structure-splitxch)
11. [Credits (Free Mints)](#11-credits-free-mints)
12. [Identity Architecture](#12-identity-architecture)
13. [Dashboard & Profiles](#13-dashboard--profiles)
14. [Anti-Gaming Measures](#14-anti-gaming-measures)
15. [The Flywheel](#15-the-flywheel)
16. [Build Phases](#16-build-phases)
17. [Future Features (Not In Initial Launch)](#17-future-features-not-in-initial-launch)

---

## 1. Game Overview

### One Sentence

Mint, vote, burn, battle, and stake Your Wojak NFTs to climb the Power Level leaderboard and earn real yield.

### The Loop

```
MINT → VOTE → BURN/COLLECT → BATTLE → STAKE → EARN → MINT
```

### 5 Actions, 1 Score, 1 Leaderboard

| Action | What You Get |
|--------|-------------|
| **Mint** | NFT + name it + 10% royalties forever |
| **Vote** | Shape the game (10/day) |
| **Burn** | Credits + Power Level improves |
| **Battle** | Visibility → votes → higher Power Level |
| **Stake** | PLP yield (NFT still fully participates in game) |

**Power Level** = your one score (0–9,000 scale). One leaderboard. One rank.

### Player Types

| Player Type | What They Want | How We Hook Them |
|-------------|---------------|------------------|
| **The Creator** | Express themselves, earn royalties | Naming, 10% perpetual royalties, creator stats |
| **The Collector** | Own rare/cool stuff, flex status | Power Level, breadth scoring, DID showcase |
| **The Flipper** | Buy low, sell high | Voting data = alpha, trending signals |
| **The Degen** | High risk/reward | Burn mechanics, staking, battles |
| **The Social Player** | Community, fun | Voting, lore, naming, burn feed, battle drama |

---

## 2. Entry Requirements

To participate in the Your Wojak Game, a user must have:

1. **A Chia DID** — Decentralized Identifier, created via Sage wallet or any Chia wallet
2. **At least 1 Wojak Farmers Plot NFT (Phase 1)** assigned to that DID

This requirement:
- Ensures every voter is an invested participant (prevents sybil attacks)
- Creates demand for Phase 1 NFTs (benefits existing holders)
- Filters out bots and casual trolls
- Aligns incentives — everyone in the game has skin in the game

**Without these two requirements:** Users can still mint, buy, sell, and hold Your Wojak NFTs normally. They just can't vote, battle, or appear on the leaderboard. The game is opt-in.

---

## 3. The 5 Actions

### 3.1 Mint

- User designs a Wojak in the generator, optionally names it (15 chars max)
- Pays XCH (base price + surcharge for popular traits)
- Receives the NFT with 10% creator royalty (via SplitXCH, see Section 10)
- NFT immediately enters the voting feed
- Creator identity stored in `phase2_mints.wallet_address`

### 3.2 Vote

- Tinder-style: swipe left (dislike) or right (like)
- 10 votes per day (adjustable later)
- Requires DID + Phase 1 NFT
- Cannot vote on your own Wojaks
- Cannot vote on Wojaks currently in your DID
- Each user sees each Wojak only once (no repeat voting)
- Weighted random feed — newer Wojaks appear more often, older ones fade but never disappear
- Full details in Section 5

### 3.3 Burn

- Destroy a Wojak you own — permanently, on-chain
- Earn credits: more for disliked Wojaks, less for liked ones
- Removes the NFT's score contribution from your Power Level (positive if it was dragging you down)
- Deflationary — reduces total supply, increases scarcity of survivors
- Full details in Section 6

### 3.4 Battle

- Put your Wojak in a battle queue
- System matches you against another queued Wojak
- Community votes side-by-side for 24 hours
- Winner's Wojak gets more likes → higher Power Level for the holder
- Battle history tracked on profiles (W/L record, streaks)
- Full details in Section 7

### 3.5 Stake

- Lock your Wojak in the CHIP-0051 reward distributor
- Earn PLP tokens continuously (WOJAK CAT/XCH liquidity pool tokens from TibetSwap)
- **Staked NFTs still fully participate in the game** — they still get voted on, still count toward Power Level, can still battle
- Only restriction: can't sell or transfer while staked (unstake anytime to sell)
- Game participation works because our backend tracks staking in its own database (see Section 12), independent of on-chain ownership
- Full details in Section 8

---

## 4. Power Level (Scoring)

### The Scale

0–9,000. Calibrated so the #1 player with optimal play during Wave 1 (4,200 NFTs) lands around 9,000.

Dragon Ball Z reference: "IT'S OVER 9,000!" is the ultimate milestone.

| Range | Tier |
|-------|------|
| 0–100 | New player |
| 100–500 | Casual |
| 500–2,000 | Active |
| 2,000–5,000 | Serious |
| 5,000–8,999 | Top tier |
| 9,000+ | Legend ("IT'S OVER 9,000!") |

### Formula (Conceptual)

```
Power Level = (Score from holdings) + (Score from creations)
```

**Score from holdings** (Collector side):
```
For each NFT in your DID:
  quality  = likes - dislikes (from community votes)
  value    = logarithmic scale based on surcharge tier at mint time
  breadth  = small one-time bonus if this is a unique creator you don't already hold

  nft_contribution = quality + value + breadth
```

**Score from creations** (Creator side):
```
For each NFT you created (identified by phase2_mints.wallet_address):
  creator_quality = likes - dislikes across all your creations
  collector_spread = small bonus for how many unique DIDs hold your work
```

**Total Power Level** = sum of all contributions, capped/scaled to the 0–9,000 range.

### Design Principles

- **Conservative and additive** — no multipliers, no dramatic advantages
- **All pillars contribute, none dominates** — quality, value, breadth, and creation all matter
- **Logarithmic curves for value** — expensive traits help but don't dominate
- **Small breadth bonuses** — encourage collecting from many creators without making it mandatory
- **Negative votes hurt** — holding disliked Wojaks drags your Power Level down
- **Double-counting is intentional** — if you created a Wojak AND hold it in your DID, it counts for both your holdings score and your creations score. This rewards creators who believe in their own work. The breadth bonus won't trigger (you're not a unique creator to yourself), keeping the advantage modest.
- **Exact weights tuned during implementation** based on expected supply and activity

### One Leaderboard

- All-time leaderboard at launch
- Seasonal leaderboards added later (monthly or quarterly, TBD)
- Fully public — everyone can see everyone's Power Level and rank

---

## 5. Voting System

### Feed Mechanics

- **Weighted random**: newer Wojaks have higher weight in the feed. As a Wojak accumulates votes, its weight decreases. Old Wojaks rarely appear but never completely disappear.
- **No tiers to manage**: one algorithm, one feed. Weight decreases with vote count.
- **One Wojak at a time**: full-screen swipe interface (like Tinder)

### Rules

| Rule | Detail |
|------|--------|
| Votes per day | 10 (adjustable) |
| Who can vote | DID + at least 1 Wojak Farmers Plot NFT |
| Vote on own Wojaks | No |
| Vote on Wojaks in your DID | No |
| Repeat votes on same Wojak | No (each user sees each Wojak once) |
| Battle votes | Separate from daily cap (1 vote per user per battle) |

### What Votes Do

- **Likes** increase the Wojak's quality score → helps the holder's Power Level
- **Dislikes** decrease the Wojak's quality score → hurts the holder's Power Level
- Votes are the primary driver of the entire game economy
- No credits earned from voting — the incentive is shaping the game and protecting the value of your own holdings

### Fairness

- Weighted random ensures new Wojaks get seen
- DID + Phase 1 NFT requirement prevents sybil voting
- 10/day cap limits manipulation
- Can't vote on own or held Wojaks prevents self-boosting

---

## 6. Burn Mechanic

### How It Works

1. User selects a Wojak they own
2. Clicks "Burn" → confirmation dialog (irreversible)
3. NFT is destroyed on-chain (permanent)
4. User receives credits based on the Wojak's vote ratio

### Credit Reward Formula

| Vote Ratio | Credits Earned |
|------------|---------------|
| Heavily disliked (many dislikes, few likes) | Highest |
| Moderately disliked | Moderate |
| Neutral (roughly equal likes/dislikes) | Small |
| Liked (more likes than dislikes) | Very small |

**Why more credits for disliked burns:** We incentivize removing low-quality NFTs from circulation. Burning a liked Wojak is a sacrifice (you're destroying value), so the credit reward is minimal — the community already valued it.

### On-Chain Burn Mechanism

On Chia, NFTs are burned by transferring them to the **standardized burn address**:

```
xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy
Puzzle hash: 0x000000000000000000000000000000000000000000000000000000000000dead
```

No private key exists for this address. NFTs sent there are permanently frozen and unrecoverable.

**Two burn paths (both supported):**

**Path A — Burn via Sage wallet directly:**
Sage wallet has a built-in burn button (three dots → Burn, as shown in the Sage UI). The user burns in their wallet without visiting wojak.ink. Our backend detects it via MintGarden API burn events (`NftEvent.type === 3`, already defined in our `marketApi.ts`), then awards credits.

**Path B — Burn via wojak.ink UI:**
User clicks "Burn" on wojak.ink → confirmation dialog → we call `chia_transferNFT` via WalletConnect with the burn address as target → Sage wallet prompts for approval → NFT is burned → credits awarded.

**Implementation note:** Path B requires adding `chia_transferNFT` to the WalletConnect required methods in `SageWalletProvider.tsx` and `useSageWalletStandalone.ts` (currently not requested).

**Detection:** Either path results in the same on-chain state — NFT owned by the burn address. MintGarden indexes both as `type: 3` burn events. Our backend processes them identically.

### What Burning Achieves

- **Deflation**: fewer NFTs in circulation → surviving ones gain scarcity
- **Curation**: community self-moderates (offensive/low-quality Wojaks get burned)
- **Score improvement**: removes negative score drag from holder's Power Level
- **Credit recycling**: earned credits → free mints → new NFTs enter circulation
- **Content**: burn feed creates lore ("RIP *Ugly Steve*, burned after 847 dislikes")

---

## 7. Battle System

### Queue-Based Matchmaking (Launch Version)

1. User selects which Wojaks from their collection are "battle-ready" (battle roster)
2. User puts a Wojak from their roster into the battle queue
3. System matches two queued Wojaks randomly
4. Both Wojaks displayed side-by-side in a battle view
5. All eligible users can vote (1 vote per user per battle — separate from daily 10)
6. Battle lasts 24 hours
7. Wojak with more votes wins

### Rules

| Rule | Detail |
|------|--------|
| Duration | 24 hours |
| Votes | 1 vote per user per battle (pick A or B, that's it) |
| Simultaneous battles per Wojak | 1 (a Wojak can only be in one battle at a time) |
| Minimum votes to count | 10 (otherwise it's a draw — no result) |
| Staked Wojaks | Can battle (staking doesn't restrict game participation) |
| Battle roster | User explicitly selects which Wojaks are available for battle |
| Battle votes vs daily cap | Battle votes are separate — they don't consume your 10 daily votes |

### What The Winner Gets

The winner doesn't receive credits or tokens. The reward is **organic**:

- The battle puts both Wojaks in front of every voter
- If the community likes your Wojak, it accumulates likes
- More likes → higher quality score → higher Power Level for the holder
- Battle win recorded on profile (W/L record, win streak)
- A strong battle record makes an NFT more desirable on secondary market

### What The Loser Gets

- No punishment for losing (no negative score from losing)
- The battle votes still count normally — if people liked your Wojak even though it lost, those likes still help
- Loss recorded on profile (but losing isn't shameful — it means you competed)

### Battle History

Each Wojak's profile shows:
```
⚔️ Battle Record: 7W - 2L
🏆 Best Victory: defeated "Copium Cowboy" 847-231
🔥 Current Win Streak: 3
```

### Future Battle Formats (Not In Initial Launch)

- **Direct challenges**: challenge a specific Wojak (accept/decline flow)
- **Tournaments**: 8/16 Wojak bracket-style elimination over a week
- **King of the Hill**: one Wojak holds the throne, challengers try to dethrone
- **Guild Wars**: team vs team (needs guild system)

---

## 8. NFT Staking (CHIP-0051)

### How It Works

The project deploys a **CHIP-0051 Reward Distributor** on-chain (Chialisp singleton). This is the same mechanism DIG Network uses for their DataLayerMinion NFT staking.

1. Project earns XCH from minting revenue
2. Project buys WOJAK CAT with some of that XCH
3. Project pairs WOJAK CAT + XCH → provides liquidity on TibetSwap
4. TibetSwap returns PLP tokens (WOJAK/XCH LP tokens)
5. Project funds the CHIP-0051 reward distributor with PLP tokens
6. Users stake their Your Wojak NFTs → earn PLP tokens continuously
7. PLP tokens represent real liquidity (earning swap fees in the pool)

### Key Properties

| Property | Detail |
|----------|--------|
| Reward token | PLP (WOJAK CAT/XCH liquidity pool token from TibetSwap) |
| Distribution | Continuous, per-second, based on cumulative accumulator |
| Weight | 1 NFT = 1 share (equal weight for all staked Wojaks) |
| Unstake | Anytime (get NFT back, stop earning, keep accumulated PLP) |
| Game participation | **Staked NFTs fully participate** — votes, battles, Power Level, everything |
| Only restriction | Can't sell or transfer while staked |
| NFT filter | Only Your Wojak NFTs (filtered by minter DID) |

### Why PLP Instead of WOJAK CAT Directly

- PLP tokens represent active liquidity — they earn swap fees 24/7
- Distributing PLP deepens the WOJAK CAT/XCH pool (more liquidity = better trading)
- Supports the WOJAK CAT price floor (liquidity is locked in the pool)
- Double reward: PLP holders earn swap fees AND can later redeem for underlying WOJAK CAT + XCH

### Economic Flow

```
Mint Revenue (XCH)
  → Buy WOJAK CAT
  → Pair with XCH on TibetSwap
  → Receive PLP tokens
  → Fund CHIP-0051 reward distributor
  → Users stake NFTs → earn PLP continuously
```

### References

- [CHIP-0051 Reward Distributor Spec](https://github.com/Chia-Network/chips/blob/822146272b41db9b8160a97f96286d9041071bd4/CHIPs/chip-0051.md)
- [CHIP-0050 & 0051 Pull Request](https://github.com/Chia-Network/chips/pull/165)
- [Reward Distributors 101 by Yakuhito](https://blog.fireacademy.io/p/reward-distributors-101)
- [DIG Network NFT Staking (first live implementation)](https://x.com/digdotnet/status/1961449065574441198)

---

## 9. NFT Naming

### Format

```
Your Wojak #42: Pepe Slayer
```

If no name provided:
```
Your Wojak #42
```

### Rules

| Rule | Detail |
|------|--------|
| Max length | 15 characters |
| Character set | Alphanumeric + spaces + basic punctuation |
| Required | No — optional |
| Unique | No — duplicates allowed (edition number differentiates) |
| Immutable | Yes — stored in CHIP-0007 metadata JSON on IPFS |

### Name Generator

A "Generate Random Name" button in the mint flow that suggests fun, meme-culture names. Examples: "Moon Boy", "Chia Chad", "Degen King", "Cope Lord".

Name generator logic TBD during implementation — could be random combinations from word lists, trait-influenced suggestions, or both.

### Metadata Impact

The `name` field in the CHIP-0007 JSON changes from:
```json
{ "name": "Your Wojak #42" }
```
To:
```json
{ "name": "Your Wojak #42: Pepe Slayer" }
```

The `edition_number` field still holds `42` separately for programmatic access. MintGarden displays the `name` field as the NFT title. Searchable on marketplace by "Your Wojak #42".

### Moderation

No word blacklist. No approval queue. Community self-moderates through the voting and burn mechanics:
- Offensive names get disliked → become burn targets
- Burn incentives are higher for disliked Wojaks
- The economic system IS the moderation layer

---

## 10. Royalty Structure (SplitXCH)

### How It Works

Using [CHIP-0008 (Splitter Puzzle)](https://github.com/Chia-Network/chips/pull/30) via [SplitXCH.com](https://splitxch.com), each Your Wojak NFT's royalty address is a splitter that automatically divides royalty payments between the creator and the project treasury.

**API:** `POST https://splitxch.com/api/compute/fast` — one call per new creator, cached forever. Returns a deterministic splitter address. SplitXCH charges 150 basis points (1.5%) platform fee from each royalty payment. See [SplitXCH API docs](https://clawhub.ai/Koba42Corp/chia-splitxch) for details.

### Wave Structure

Total royalty always stays at 12%. Creator share decreases per wave, treasury share increases.

| Wave | Mints | Creator Royalty | Treasury Royalty | Total |
|------|-------|----------------|-----------------|-------|
| Wave 1 | #1 – #4,200 | 10% | 2% | 12% |
| Wave 2 | #4,201 – #8,400 | 9% | 3% | 12% |
| Wave 3 | #8,401 – #12,600 | 8% | 4% | 12% |
| Wave 4 | #12,601 – #16,800 | 7% | 5% | 12% |
| Wave 5+ | TBD | TBD | TBD | 12%+ |

**Note:** Waves 2–4 are directional. The same Your Wojak collection continues, same generator, same game. Only the royalty split changes. Exact pricing and trait availability for future waves are TBD based on Wave 1 data.

### Phase 1 vs Phase 2 Royalties

| Collection | Royalty | Recipient |
|-----------|---------|-----------|
| Wojak Farmers Plot (Phase 1) | 10% | Artist (MoJuiceNFTs) |
| Your Wojak (Phase 2, Wave 1) | 12% | 10% creator + 2% treasury via SplitXCH |

---

## 11. Credits (Free Mints)

### What Credits Are

Free mint credits let users mint Your Wojak NFTs at no XCH cost. 100 credits = 1 free mint. This system already exists for Phase 1 NFT purchases and is extended to Phase 2 actions.

### Credit Sources

Only three sources. Simple, hard to game.

| Source | Credits Earned | Why |
|--------|---------------|-----|
| **Buy Phase 1 NFT** (Wojak Farmers Plot) | Highest | Rewards early supporters, creates Phase 1 demand |
| **Buy Phase 2 NFT** (Your Wojak secondary) | Moderate | Encourages secondary trading |
| **Burn a Wojak** | Moderate (disliked) / Small (liked) | Encourages curation and deflation |

### What Credits Are NOT Earned From

- Voting (incentive = shaping the game, not credits)
- Battling (incentive = visibility and votes)
- Staking (incentive = PLP tokens)
- Holding (incentive = Power Level)

### Anti-Gaming

- Wash trading costs 2% per round trip (treasury portion of royalty is a real loss)
- Database detection: if `buyer_address` matches `phase2_mints.wallet_address` for that edition, it's a self-buy — can withhold credits
- Credit amounts tuned so that wash trading is never profitable (credit value < 2% royalty cost)

---

## 12. Identity Architecture

### Creator Identity

- **Source:** `phase2_mints.wallet_address` in the project database
- **Set at:** Mint time (immutable)
- **Why not royalty address:** Royalty address is now a SplitXCH splitter address, not the creator's wallet
- **Why not minterDid:** Can be null if user had no DID at mint time
- **Why not metadata:** Keeping metadata clean (Option C — no creator field in CHIP-0007 JSON)
- **External verification:** MintGarden API returns `minter_address` independently

### Collector Identity

- **Source:** Chia DID
- **Why DID:** Solves the multi-address problem (one seed = many xch1 addresses, but one DID)
- **Requirement:** NFTs must be assigned to a DID to count for the game
- **Opt-in:** Users without a DID can still mint/buy/sell — they just don't participate in the game

### How Collector Scoring Works

```
User's DID holds NFTs
  → Get edition numbers from each NFT
  → Look up phase2_mints.wallet_address for each
  → Count unique wallet_addresses = creator breadth
  → Sum quality + value + breadth = Power Level
```

### Data Infrastructure

The game system needs to know what every player holds, at all times, not just when they're online. This requires:

**DID Holdings Indexer** (background worker):
- Periodically scans DID holdings via MintGarden API or on-chain data
- Updates a `did_holdings` table: `did_id, nft_id, edition_number, detected_at`
- Recalculates Power Level scores when holdings change
- Frequency: every 30–60 minutes (trade-off between freshness and API load)

**Staking Tracker** (database table):
- When a user stakes via our UI, we record: `nft_id, owner_did, staked_at`
- When they unstake: update `unstaked_at`
- Staked NFTs still count as "held" for scoring — our database is the authority, not on-chain ownership

**Phase 1 NFT Verification** (event-driven):
- On first wallet connect: verify DID holds at least 1 Wojak Farmers Plot NFT → grant game access
- Cache the verification — no need to re-check constantly
- When a Wojak Farmers Plot NFT sells on secondary (detected via our existing MintGarden sales scraper):
  - Check: does the SELLER's DID still hold at least 1 Phase 1 NFT?
  - If no → revoke game access on next session
  - Check: does the BUYER's DID now qualify?
  - If yes → grant game access
- This is efficient — Phase 1 sales are infrequent (~4,208 item collection)

**SplitXCH Splitter Management:**
- Each unique creator wallet needs its own splitter address per wave
- Created via `POST https://splitxch.com/api/compute/fast` with recipients array
- SplitXCH takes 150 basis points (1.5%) platform fee — total must equal 10,000
- Wave 1 split: creator 8258bp + treasury 1592bp + fee 150bp = 10,000 (fee split 50/50 between creator and treasury)
- Response returns the deterministic splitter address instantly
- Cached in `splitter_addresses` table: `(creator_wallet, wave) → splitter_address`
- First mint from a wallet: one API call → cache result
- Subsequent mints from same wallet in same wave: use cached address (zero API calls)
- Wave 2+ creates new splitters with different basis points for the same creator

```sql
CREATE TABLE splitter_addresses (
  creator_wallet TEXT NOT NULL,
  wave INTEGER NOT NULL DEFAULT 1,
  splitter_address TEXT NOT NULL,
  splitxch_id TEXT NOT NULL,
  creator_points INTEGER NOT NULL,
  treasury_points INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (creator_wallet, wave)
);
```

---

## 13. Dashboard & Profiles

### One Dashboard, Fully Public

Every user's profile is visible to everyone. One unified view showing:

#### Your Profile
- **Power Level:** #47 (520 points) with breakdown
  - From holdings: +340 (quality + value + breadth)
  - From creations: +180 (community reception)
- **Collection:** all Wojaks in your DID, with individual vote counts
- **Creations:** all Wojaks you minted, with vote counts and collector count
- **Battle Roster:** which Wojaks are battle-ready
- **Battle Record:** W/L, streaks, best victories
- **Royalty Earnings:** total XCH earned from creator royalties
- **Credits:** current balance, earning history

#### Activity Feed

A simple chronological feed of events relevant to you:

```
⚔️ "Moon Degen" challenged your "Chia Samurai" to a battle
🏆 Your "Chia Samurai" won! (387 vs 214)
📈 You moved from #52 to #47 on the leaderboard
🔥 You burned "Ugly Steve" — earned 45 credits
🎉 Your "Pepe Slayer" hit 100 likes
```

**Notification priority** (what we must show):
- Battle challenges and results
- Leaderboard position changes
- Vote milestones on your Wojaks

**Nice-to-have** (show if easy to implement):
- Royalty earnings from sales
- Credit earnings

#### Onboarding Experience

New users see "Getting Started" milestones:
- ☐ Create a DID
- ☐ Get a Wojak Farmers Plot NFT
- ☐ Mint your first Your Wojak
- ☐ Cast your first vote
- ☐ Enter your first battle

Small one-time **credit bonus** for completing each milestone. Power Level should always be a pure reflection of your collection quality — no artificial bumps. Credits are useful (they help you mint) and create positive momentum for new players.

---

## 14. Anti-Gaming Measures

### Wash Trading Prevention

| Mechanism | How It Works |
|-----------|-------------|
| **2% treasury royalty** | Every secondary sale costs 2% to treasury — wash trading has a real cost |
| **Database detection** | If buyer = creator for the same edition, flag as self-buy, withhold credits |
| **Credit tuning** | Credit reward from buying < 2% royalty cost, making wash trading unprofitable |

### Vote Manipulation Prevention

| Mechanism | How It Works |
|-----------|-------------|
| **DID + Phase 1 NFT required** | Every voter has skin in the game |
| **10 votes/day cap** | Limits the impact of any single voter |
| **Can't vote on own/held Wojaks** | Prevents direct self-boosting |
| **One vote per user per Wojak** | No repeat voting |

### Power Level Gaming Prevention

| Mechanism | How It Works |
|-----------|-------------|
| **Conservative curves** | No multipliers, logarithmic value scaling, small bonuses |
| **Negative scores possible** | Holding bad Wojaks hurts you — can't just accumulate junk |
| **Quality dominates quantity** | 50 disliked Wojaks score worse than 5 loved ones |

---

## 15. The Flywheel

```
MINT (pay XCH, name it, earn credits)
│
├──→ New Wojak enters voting feed
│
▼
VOTE (swipe, 10/day, shape the game)
│
├──→ Liked Wojaks gain value → holder's Power Level rises
├──→ Disliked Wojaks lose value → become burn targets
│
▼
BURN disliked (earn credits, improve Power Level)
│
├──→ Deflation → survivors worth more
├──→ Credits → free mints → back to MINT
│
▼
BUY from other creators (earn credits, Power Level from breadth)
│
├──→ 10% royalty to creator (they're rewarded for quality)
├──→ 2% to treasury (funds the ecosystem)
│
▼
BATTLE (put your best in the ring)
│
├──→ Winner gets visibility → more votes → higher Power Level
├──→ Battle history becomes NFT provenance
│
▼
STAKE (lock your NFTs, earn PLP)
│
├──→ Real yield from liquidity fees
├──→ Deepens WOJAK CAT/XCH pool
├──→ NFTs still play the full game while staked
│
▼
LEADERBOARD (Power Level ranking)
│
├──→ Status, visibility, bragging rights
├──→ Seasonal resets keep it competitive (added later)
│
▼
REPEAT — every action feeds back into the loop
```

### Project Benefits

| Benefit | Source |
|---------|--------|
| Mint revenue | Users want to mint more (credits, game participation) |
| Secondary volume | Collectors trade actively (scoring incentives) |
| Treasury income | 2% royalty on every secondary sale |
| WOJAK CAT demand | PLP rewards create buy pressure |
| Liquidity depth | PLP distribution deepens TibetSwap pool |
| User retention | Daily voting, battles, leaderboard changes |
| Organic growth | Creators promote their Wojaks to get votes → free marketing |
| Deflation | Burning reduces supply → increases perceived value |

---

## 16. Build Phases

### Phase A — The Foundation

**What ships:** Voting + Power Level + Dashboard + NFT Naming

- Voting feed (weighted random, swipe UI, 10/day)
- Power Level calculation (quality from votes, basic formula)
- Leaderboard (all-time)
- Dashboard (profile, Power Level breakdown, activity feed)
- NFT naming in mint flow (15 chars, random generator)
- Onboarding experience (milestones)
- DID + Phase 1 NFT gate for voting

**Why first:** Voting is the heartbeat. Without it, nothing else works. Power Level gives users a reason to care. Dashboard gives them a home.

### Phase B — The Economy

**What ships:** Credits expansion + Burn mechanic + SplitXCH + Royalty waves

- Credits earned from Phase 2 secondary purchases
- Burn button with credit reward (scaled by vote ratio)
- SplitXCH integration for 12% royalty (10% creator / 2% treasury)
- Burn feed (public log of burns)
- Anti-wash-trading detection
- Value pillar added to Power Level (surcharge tier scoring)
- Breadth pillar added to Power Level (unique creator bonus)
- `creator_address` lookup via `phase2_mints.wallet_address`

**Why second:** The economic layer gives meaning to the votes. Burns create deflation. Credits create the free-mint loop.

### Phase C — Competition

**What ships:** Battles

- Battle queue (random matchmaking)
- Battle view (side-by-side, 24-hour duration)
- Battle voting (unlimited, separate from daily cap)
- Battle roster management (select which Wojaks are battle-ready)
- Battle history on profiles (W/L record, streaks, best victories)
- Minimum vote threshold (10 votes to count)

**Why third:** Battles need voting to work. They need the dashboard to display results. They build on everything in A and B.

### Phase D — DeFi

**What ships:** CHIP-0051 NFT Staking + PLP Distribution

- Deploy CHIP-0051 reward distributor on-chain
- Fund with PLP tokens from TibetSwap LP
- Stake/unstake UI on wojak.ink
- PLP earnings display on dashboard
- Staked NFT indicator on profiles

**Why fourth:** DeFi layer is independent of the game mechanics. It can launch once the game is active and there's demand for staking.

---

## 17. Future Features (Not In Initial Launch)

These are validated ideas that we build later, based on real data and community feedback:

| Feature | When | Depends On |
|---------|------|-----------|
| **Promoted Wojaks** | After voting feed is active | Pay XCH for more visibility in feed |
| **Direct battle challenges** | After queue battles prove popular | Accept/decline flow |
| **Tournaments** | After battles prove popular | Bracket system, weekly events |
| **King of the Hill** | After battles prove popular | Throne mechanic |
| **Trait collection sets** | After thousands minted | Real data on popular traits |
| **Seasonal leaderboard** | After all-time is established | Monthly/quarterly resets, prizes TBD |
| **Gifting/sending** | When social features mature | Send Wojak to any DID, gift feed |
| **Guild system** | When community is large enough | Create/join guilds, guild wars |
| **Wall of Fame / Shame** | After enough votes accumulated | Most liked / most burned displays |
| **Voting challenges** | After voting is established | Themed weekly challenges |
| **Portfolio analytics** | After scoring is live | "Which NFTs help/hurt your score" |
| **Post-Wave-1 royalty changes** | After 4,200 minted | Waves 2–4 royalty adjustments |

---

## Appendix: Key Technical References

| Component | Technology |
|-----------|-----------|
| Royalty splitting | CHIP-0008 via SplitXCH.com |
| NFT staking | CHIP-0051 Reward Distributor |
| Metadata format | CHIP-0007 |
| LP tokens | TibetSwap WOJAK CAT/XCH pool |
| Creator identity | `phase2_mints.wallet_address` (database) |
| Collector identity | Chia DID (`ownerDid` on NFT) |
| Wallet integration | Sage wallet via WalletConnect |
| NFT marketplace | MintGarden |

---

*This design document is the single source of truth for the Your Wojak Game. Implementation plan to follow in a separate document.*
