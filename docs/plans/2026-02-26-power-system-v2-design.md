# Power System v2 — Design

**Date:** 2026-02-26

---

## Goal

Replace the dual power system (complex + simple) with ONE simple formula, computed live. Kill all complex formula code. Add collection bonus to the leaderboard.

## Formula

**Total Power = Plot Power + Wojak Power + Collection Bonus**

| Component | Formula |
|-----------|---------|
| **Plot Power** | `plotCount × 20` |
| **Wojak Power** | `SUM(net_score)` for all Your Wojaks held |
| **Collection Bonus** | `SUM(max(0, floor(net_score × 0.10)))` for qualifying Wojaks |

### Collection Bonus Eligibility

A held Your Wojak qualifies if BOTH conditions are true:

1. **Not your creation:** Creator's DID ≠ holder's DID. Lookup: `game_players WHERE wallet_address = phase2_mints.wallet_address` → get creator's `did_id`. If creator has no registered DID, the Wojak qualifies (they're definitely a different person).

2. **Top 42% by votes:** The Wojak's `net_score` is at or above the 42nd-percentile threshold of ALL Your Wojaks. Threshold = net_score at position `ceil(totalWojakCount × 0.42)` when sorted DESC.

### Rules

- Collection bonus per Wojak is never negative (`max(0, ...)`)
- No hard cap on total power (9000 is aspirational, not enforced)
- Burn bonus is on pause (not implemented)

## Architecture

**Live compute everywhere. No caching. No new columns.**

- `_power.ts` is the single source of truth for all power calculations
- Leaderboard, my-score, and battles all call `_power.ts` functions
- The indexer no longer computes power (just does DID sync + holdings)

## Anti-Gaming Properties

- New/unvoted Wojaks have 0 net_score → bottom of ranking → not in top 42%
- Self-created Wojaks → excluded by DID check
- Even if a Wojak squeaks into top 42%, 10% of a low score ≈ 0
- Users cannot easily upvote their own Wojaks (320+ in voting feed, random order)
- Gaming with a second DID requires a second Farmer's Plot (costs real money)

## What Gets Deleted

| File/Code | Reason |
|-----------|--------|
| `functions/api/game/_powerLevel.ts` | Complex formula — replaced |
| `functions/api/game/power-level.ts` | Endpoint for complex formula — replaced |
| `recalcPowerLevel()` in indexer | No longer caching power |
| `POWER_LEVEL_MAX` enforcement | No hard cap |
| Burn bonus code | On pause |
| Legacy tier constants in `_shared.ts` | Dead code |

## What Gets Modified

| File | Change |
|------|--------|
| `functions/api/fight-club/_power.ts` | Rewrite `calculateCollectionBonus()`: 10% of net_score + top 42% threshold + DID check |
| `functions/api/fight-club/vote-leaderboard.ts` | Include collection bonus in player ranking query |
| `functions/api/fight-club/my-score.ts` | Fix rank query to include collection bonus |
| `functions/api/game/_shared.ts` | Remove `POWER_LEVEL_MAX`, clean up legacy constants |
| `functions/api/game/recalc-power-levels.ts` | Update to use `_power.ts` simple formula |
| `workers/did-indexer/worker.ts` | Remove `recalcPowerLevel()` and power calculation code |
| `src/components/combat/FightClubRankings.tsx` | Show collection bonus in player breakdown |
| `src/hooks/useFightClubMyScore.ts` | Update `MyScoreData` interface for collection bonus |

## User-Facing Change

When viewing a player on the leaderboard, the breakdown shows:

```
Power Level: 284

  Farmer's Plots:    180  (9 × 20)
  Your Wojaks:        94  (net vote scores)
  Collection Bonus:   10  (top Wojaks from other creators)
```

## Decisions Made

- Kill complex system: YES
- Collection bonus: 10% of net_score (not flat 10)
- Top 42% includes all Wojaks (including unvoted)
- Creator check: DID-based (not wallet, not sales_history)
- No cap on collection bonus
- Negative bonus floors to 0
- Live compute (no caching, no migration)
- Burn bonus: on pause
- POWER_LEVEL_MAX: removed (aspirational only)
