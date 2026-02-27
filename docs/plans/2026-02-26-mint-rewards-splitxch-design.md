# Mint Rewards — Top 10 Leaderboard Incentive via SplitXCH

**Date:** 2026-02-26
**Status:** Shelved — revisit when mint volume increases

---

## The Idea

Use SplitXCH on-chain splitter contracts to automatically distribute a portion of every paid mint to the current top 10 leaderboard players. When someone pays 0.2 XCH to mint a Wojak, the XCH goes to a splitter puzzle that auto-distributes: 90% to treasury, ~1% to each of the top 10 players.

**This is about the primary mint payment, not royalties.** Royalties remain as-is (creator/treasury split). The splitter is the payment destination for the initial mint.

---

## How It Works

1. **Daily snapshot** — A cron job captures today's top 10 player wallet addresses
2. **Create splitter** — Calls SplitXCH API to create an 11-recipient on-chain puzzle (treasury + 10 players)
3. **Route mints** — All paid mints that day use the splitter as `target_address` instead of treasury directly
4. **On-chain auto-split** — The Chialisp puzzle automatically distributes incoming XCH. No trust required.
5. **Next day** — New snapshot, new splitter, new top 10

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Fund source | Primary mint payment only (not royalties) |
| Snapshot frequency | Daily |
| Distribution | Equal split among top 10 |
| Top 10 share | 10% of mint price |
| Treasury share | ~88.5% (after 1.5% SplitXCH fee) |
| SplitXCH fee | 1.5% (unavoidable, charged by SplitXCH) |

---

## Game Theory

- **"Be in the top 10"** — Direct financial incentive to climb the leaderboard
- **Daily race** — Rankings lock at snapshot time, creating urgency
- **Virtuous cycle** — More engagement → higher rank → earn from mints → more engagement
- **Every mint matters** — Each new mint directly rewards the current top players

---

## Numbers (per 0.2 XCH mint)

| Recipient | Amount |
|-----------|--------|
| Treasury | ~0.177 XCH |
| Each top 10 player | ~0.002 XCH |
| SplitXCH fee | ~0.003 XCH |

With surcharges (0.2+ XCH mints), the pot is bigger for everyone.

---

## Technical Constraints

- **SplitXCH puzzles are immutable** — once created, recipients can't change. That's fine: each daily snapshot creates a new one.
- **Free plan cron limit** — All 5 Cloudflare cron slots are used. Solution: piggyback on `mint-cron` (runs every 10 min, already mint-related). Check if today's splitter exists; if not, create it.
- **Free mints excluded** — Only paid mints generate XCH, so only paid mints feed the top 10.
- **< 10 ranked players** — Use however many exist (min 3). Redistribute points proportionally.

---

## Open Questions / Prerequisites

1. **Verify SplitXCH supports 11 recipients** — We've only ever tested with 1-2. Must test before building.
2. **Frontend display?** — Should the site show who's in today's top 10 earning pool? (Not v1, but future consideration)
3. **Minimum player threshold** — Skip splitter creation if fewer than 3 ranked players?
4. **Surcharge handling** — Full payment (base + surcharge) goes through splitter. Is that desired?

---

## Key Files (for future implementation)

| Area | File |
|------|------|
| Mint payment routing | `functions/api/mint/request.ts` (target_address logic, line 135-162) |
| Mint processing | `functions/api/mint/process.ts` (calls MintGarden) |
| Existing SplitXCH | `functions/api/mint/splitxch.ts` (reusable pattern) |
| Leaderboard query | `functions/api/fight-club/vote-leaderboard.ts` (top 10 SQL) |
| Player wallets | `game_players` table (did_id + wallet_address) |
| Cron host | `workers/mint-cron/` (piggyback daily logic here) |
| Paid mint recipient | `CREATOR_PAYOUT_ADDRESS` env var (dashboard secret) |

---

## Analysis: Why Shelved (2026-02-26)

Real leaderboard data showed the economics don't justify implementation yet:

- At ~5 paid mints/day × 0.2 XCH × 10% = **0.01 XCH/day per player** (~$0.20)
- The leaderboard is plot-whale-dominated (8/10 top players have zero Wojaks)
- Gap between #10 and #11 is only 20 power (1 Plot) — already competitive without incentive

**Revisit when:**
- Mint volume reaches 20+ paid mints/day consistently
- Leaderboard scoring evolves beyond pure plot ownership
- A mint event or launch creates natural demand spike

The mechanism (SplitXCH daily splitter) is technically sound and can be built in 1-2 days when the time comes. The 11-recipient SplitXCH test should be done first.

---

## Future Expansion Ideas

- **Top Creators** — Reward creators whose Wojaks get the most votes
- **Top Collectors** — Reward people who buy the most Wojaks
- **Tournament Winners** — Battle champs earn from mints for a period
- **Seasonal rotation** — Different reward criteria per season/wave
