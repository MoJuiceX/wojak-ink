# Fight Club — Complete Design Document

**Date:** 2026-02-19
**Status:** Approved
**Launch Target:** Friday 2026-02-21

---

## 1. Overview

Fight Club is the unified competitive layer for Wojak Ink. It merges the existing Wojak Swipe (voting) and Arena (battling) into a single branded experience with a unified Power scoring system and consolidated navigation.

### Goals (Priority Order)
1. **Incentivize Farmers Plot trading** — every sale earns 10% royalty to artist. This is the #1 revenue driver.
2. **Incentivize Wojak minting + trading** — users create Wojaks (0.1 XCH base + surcharge). Trades earn 10% to creator + 2% to treasury via XCH split.
3. **Incentivize buying Farmers Plot NFTs** — required access pass to Fight Club, gives best credit rewards
4. **Create a fair, fun competitive loop** — quality matters, quantity helps, but both contribute

---

## 2. Navigation Restructure

### New Sidebar (8 items, down from 12)

```
── Primary ──────────────────────
Gallery
BigPulp              · (featured badge)
Generator
Fight Club           · (Swords icon)
Games
── Secondary ────────────────────
Chat Rooms
Shop
Treasury
Settings
── Bottom ───────────────────────
Account
```

### Removed Items
- ~~Wojak Swipe~~ → absorbed into Fight Club > Vote tab
- ~~Arena~~ → absorbed into Fight Club > Battle tab
- ~~Leaderboard~~ → killed as standalone page; arcade scores into Games, combat/swipe scores into Fight Club > Rankings tab

### URL Redirects
- `/swipe/*` → `/fight-club/vote/*`
- `/arena/*` → `/fight-club/battle/*`
- `/leaderboard` → `/fight-club/rankings`

### Mobile More Menu
Same consolidation. Fight Club replaces Swipe + Arena entries.

---

## 3. Fight Club Page Structure

**Route:** `/fight-club`
**Icon:** Swords (lucide-react)

### Four Tabs: Battle | Vote | Rankings | Burn

**Battle** (`/fight-club/battle`) — DEFAULT landing tab
- Current Arena experience: pick fighter, queue, turn-based combat
- HP bars, 174 moves, 18 types, status effects
- Manual play or OpenClaw AI agent
- Shows active battles, queue status, battle history
- 2-minute queue timeout → offer AI sparring (reduced Power rewards)
- Battle counter: "Battles today: 2/4"

**Vote** (`/fight-club/vote`)
- Current Swipe experience: Tinder-style single card
- Like (swipe right) or Dislike (swipe left)
- Each vote = +1 or -1 Power on the Wojak being voted on
- 24-hour cooldown per Wojak: after voting, it won't appear again for 24 hours
- Re-voting: if user changes their mind (like→dislike), Power delta is applied correctly
- Carousel never runs dry: old votes expire, Wojaks re-enter the pool

**Rankings** (`/fight-club/rankings`)
- Two sub-tabs:
  - **Players** — DIDs ranked by total Power (sum of all owned Wojaks)
  - **Wojaks** — Individual NFTs ranked by Power score
- Shows: rank, DID name, number of Wojaks owned, total Power, top fighter

**Burn** (`/fight-club/burn`)
- Shows Wojaks eligible for burn rewards (bottom 25% by Power score)
- "Your Burnable Wojaks" — your own eligible Wojaks with burn button
- "Burn Marketplace" — all eligible Wojaks from any owner, buy cheap + burn
- Burn reward: 100 credits (1 free mint) — ONLY if you didn't mint the Wojak
- Burning your own creation = no reward (but removes the Power drag)

---

## 4. Power Scoring System

### Definition
**Power** is a per-Wojak score. Your DID's total Power = sum of ALL your Wojaks' Power.

### Power Sources

| Action | Power Change |
|--------|-------------|
| Community like (vote) | +1 |
| Community dislike (vote) | -1 |
| Battle win | +30 |
| Battle loss | -10 |
| Battle draw | +5 |

### Rules
- Power is stored per Wojak (per NFT ID)
- DID Power = sum of ALL Wojaks in that DID (no cap, no "top N")
- Power CAN go negative (bad Wojaks drag your DID down)
- When an NFT is sold/transferred, ALL stats transfer with it (Power, battle history, level, XP, ELO)
- The buyer inherits the Wojak's full Power — positive or negative
- ELO is hidden from public (used internally for fair matchmaking only)
- XP and Level still exist for battle progression (move unlocks, stat scaling)

### Flat Rate — No Diminishing Returns
Every battle win is +30 regardless of how many you've won today. Premium users earn more because they play more (4 battles/day vs 1). Simple to code, simple to understand.

---

## 5. Battle Economy

| Tier | Battles/Day | Duration |
|------|------------|----------|
| Trial (new users) | 4 | First 2 weeks after signup |
| Free (after trial) | 1 | Ongoing |
| Premium (paid) | 4 | $5/month or 1 XCH/month |

### Monthly Power Potential (60% win rate assumed)

| Tier | Wins | Losses | Battle Power/month |
|------|------|--------|-------------------|
| Free | 18 | 12 | +420 |
| Premium | 72 | 48 | +1,680 |

Premium users earn ~4x the battle Power. At $5/month, this is the incentive to subscribe.

---

## 6. Access Gating — Farmers Plot NFT

**Requirement:** Your DID must hold at least 1 Wojak Farmers Plot NFT to use Fight Club (voting AND battling).

**If you sell your only Farmers Plot:** Immediately locked out. Must buy another to regain access. No grace period.

**Why this matters:**
- Keeps Farmers Plot demand high (you NEED one)
- Every Farmers Plot purchase generates 10% royalty for the artist
- Creates a floor price for Farmers Plot (utility value)

---

## 7. Credit System (Redesigned for 0.1 XCH Base Price)

### New Base Mint Price
**0.1 XCH** + surcharge (trait-dependent)

### Free Mint Cost
**100 display credits = 1 free mint** (base, no surcharge traits)
Higher for surcharged traits: `100 * (0.1 + maxSurcharge) / 0.1`

### Credits Per XCH (Farmers Plot Purchases)
**100 credits per 1 XCH spent** (doubled from previous 50, because mint price halved)
Whale multiplier still applies (asymptotic cap at 1.3x)

| Farmers Plot Purchase | Credits | Free Mints |
|----------------------|---------|------------|
| At floor (2 XCH) | 200 | 2 |
| 2x floor (4 XCH) | ~460 | ~4.6 |
| 5x floor (10 XCH) | ~1,240 | ~12 |

### Burn Rewards (Revised — More Generous)

Burn reward ONLY if `burner_did !== minter_did` (you cannot earn credits for burning what you created).

| Dislike Ratio | Credits | Free Mints |
|--------------|---------|------------|
| >70% dislikes | 80 credits | ~0.8 mint |
| >50% dislikes | 50 credits | ~0.5 mint |
| >30% dislikes | 25 credits | ~0.25 mint |
| Otherwise | 10 credits | ~0.1 mint |

Buy 2 heavily-disliked Wojaks cheap → burn both → ~160 credits → 1.6 free mints. Actually worth doing.

### Participation Credits (Grindy by Design)

| Action | Credits | To earn 1 free mint |
|--------|---------|-------------------|
| Vote on 20 Wojaks | 1 credit | Vote on 2,000 Wojaks |
| Win a battle | 5 credits | Win 20 battles |
| Lose a battle | 1 credit | Lose 100 battles |
| 7-day voting streak | 10 credits | 10 weekly streaks |

### Credit Hierarchy (Most → Least Efficient)
1. Buy Farmers Plot NFT → instant 200+ credits
2. Burn disliked Wojaks → 25-80 credits per burn
3. Win battles → 5 credits per win
4. Vote → 1 credit per 20 votes

---

## 8. DID Names

### Display Name System
1. **Default:** Pull from Chia DID profile name (on-chain)
2. **Override:** User can set custom name in Settings/Account
3. **Random name generator:** Button to generate a fun random name
4. **Displayed everywhere:** Leaderboard, battle results, voting, profile

### Storage
- `did_profiles` table: `did_id`, `display_name`, `name_source` (chain/custom/random)
- Updated when user changes name or DID profile updates

---

## 9. Leaderboard Display

### Fight Club Rankings — Players Tab

```
#   Name              Wojaks   Power    Top Fighter
1   ChadFarmer          12    4,230    Wojak #0042
2   BasedHolder          8    3,710    Wojak #0187
3   DiamondHands         5    2,980    Wojak #0099
...
47  You                  3      235    Wojak #0512
```

### Fight Club Rankings — Wojaks Tab

```
#   Wojak             Type      Power   Votes    W/L/D    Owner
1   Wojak #0042       MARTIAL   1,890   +342     28/5/2   ChadFarmer
2   Wojak #0187       FIRE      2,100   +180     52/12/3  BasedHolder
3   Wojak #0099       PSYCHE    1,450   +290     35/8/1   DiamondHands
```

### Games Page
Arcade leaderboards move INTO the Games page. The existing LeaderboardPanel sidebar (desktop) already shows top scores per game. For full rankings, add a "Scores" tab or section within Games.

---

## 10. The Complete Incentive Flywheel

```
Mint Wojak (0.1 XCH) → Gets voted on → Accumulates Power
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                        POSITIVE          NEUTRAL        NEGATIVE
                        (liked +          (meh)          (disliked,
                         battles won)                     battles lost)
                              │               │               │
                              ▼               ▼               ▼
                        Valuable →       Battle it →     Drags DID
                        sell high        to improve      down →
                        or hold                          MUST sell
                              │               │               │
                              ▼               ▼               ▼
                        Buyer gets       Buyer gets       Buyer burns
                        instant Power    a project        for credits
                              │               │               │
                              └───────┬───────┘               │
                                      ▼                       ▼
                              TRADING VOLUME           Supply decreases
                              Creator: 10%             Scarcity increases
                              Treasury: 2%             Remaining Wojaks
                                                       more valuable
```

### Why Each Action Happens:
- **Why mint?** → Creates fighters, earns Power if good, creator gets 10% on resales
- **Why buy others' Wojaks?** → Instant proven Power boost to your DID rank
- **Why battle?** → +30 Power per win, fastest way to climb. Premium = 4x battles
- **Why vote?** → Shapes the meta, earns small credits, determines which Wojaks rise/fall
- **Why burn?** → Remove negative-Power Wojaks from circulation, earn credits (if not your creation)
- **Why sell?** → Get rid of negative-Power Wojaks dragging you down, or profit on positive ones
- **Why buy Farmers Plot?** → Required access pass + best credit rewards (200+ per purchase)
- **Why subscribe premium?** → 4 battles/day instead of 1. 4x Power earning potential

---

## 11. Technical Constants (Updated)

| Constant | Old Value | New Value |
|----------|-----------|-----------|
| BASE_PRICE_XCH | 0.2 | **0.1** |
| CREDITS_PER_XCH | 50 | **100** |
| FREE_MINT_CREDITS (display) | 100 | **100** (unchanged) |
| Burn >70% dislikes | 20 credits | **80 credits** |
| Burn >50% dislikes | 12 credits | **50 credits** |
| Burn >30% dislikes | 5 credits | **25 credits** |
| Burn otherwise | 2 credits | **10 credits** |

---

## 12. Deferred (Post-Launch)

- Premium subscription payment integration (Stripe / XCH)
- OpenClaw AI agent battling (subscription tier feature)
- PLP token distribution from LP
- Voter XP milestones / cosmetic badges
- Head-to-head voting mode (two Wojaks compared)
- Burn-specific UI page / marketplace for trash Wojaks
