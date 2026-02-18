# Blind Battles Design

**Date:** 2026-02-18
**Status:** Approved

## Problem

The current battle system uses explicit Vote A / Vote B buttons on a separate battles page. This has several issues:
- Small community means few people visit the battles page, leading to low vote counts and frequent draws
- Users must actively seek out battles to participate
- Side-by-side comparison introduces positional bias
- Separate voting flow fragments engagement away from the core swipe mechanic

## Design: Blind Battles

Battles are resolved by normal swipe votes accumulated during the 24h battle window. Users never know a battle is happening -- they just swipe like/dislike as usual. The battles page becomes a spectator view.

### Core Mechanic

1. Player queues an NFT for battle (unchanged)
2. Auto-matchmaking pairs it with an opponent (unchanged)
3. A 24h battle window starts
4. Both battle NFTs get boosted priority in everyone's swipe feed (~5x weight)
5. Users swipe normally -- likes and dislikes accumulate on `wojak_scores`
6. At window end, hourly cron resolves: compare net score change for each NFT
7. Higher net score change wins

### Win Condition: Net Score Change

At battle creation, snapshot each NFT's current `net_score` from `wojak_scores`. At resolution, read current `net_score` and compute delta.

- `delta_a = current_net_score_a - snapshot_a`
- `delta_b = current_net_score_b - snapshot_b`
- Higher delta wins
- If tied or both NFTs received fewer than 5 total votes during window: draw

New columns on `battles` table:
- `nft_a_score_start INTEGER` -- net_score snapshot at battle creation
- `nft_b_score_start INTEGER` -- net_score snapshot at battle creation

### Feed Boost

Modify `feed.ts` to detect active battle NFT IDs and give them ~5x weight in the random ordering. Existing exclusions remain (already voted, own NFTs, own holdings).

### Spectator Battle Card

**Active battle:**
- Both NFT images (MintGarden thumbnail)
- NFT names + edition numbers
- Countdown timer
- "VS" divider
- No vote buttons, no vote counts -- scores hidden until resolved

**Resolved battle (history):**
- Both NFT images
- Winner highlighted (green border/glow), loser dimmed
- Final net score changes revealed: "+8" vs "+3"
- Winner / Draw badge

### Removed

- `battle-vote.ts` endpoint (delete)
- `battle_votes` table writes (stop using; keep table for backward compat)
- Vote A / Vote B buttons in BattleCard
- `votes_a` / `votes_b` columns on battles (stop using for resolution; keep columns)
- `hasVoted` tracking in battle-list (no longer relevant)

### Image Fix

Battle card images use `https://assets.mintgarden.io/thumbnails/medium/{nftId}.png`. Verify nftId values in battles table match MintGarden launcher IDs.

## Files to Modify

| File | Change |
|------|--------|
| `functions/migrations/05X_blind_battles.sql` | Add `nft_a_score_start`, `nft_b_score_start` to battles |
| `functions/api/game/battle-queue.ts` | Snapshot net_score at battle creation |
| `functions/api/game/battle-resolve.ts` | Use net score delta instead of votes_a/votes_b |
| `functions/api/game/battle-list.ts` | Remove hasVoted logic, stop returning vote counts for active battles |
| `functions/api/game/feed.ts` | Boost active battle NFTs in feed weighting |
| `functions/api/game/battle-vote.ts` | Delete file |
| `src/components/game/BattleCard.tsx` | Remove vote buttons, hide scores for active, show delta for resolved |
| `src/components/game/BattleView.tsx` | Remove handleVote, remove onVote prop passing |
