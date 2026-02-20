# Voting System Audit — Your Wojak NFTs

**Date:** 2026-02-20  
**Goal:** Confirm voting works end-to-end and identify gaps vs “new wallets on left + power level, NFT in middle, users can always vote; only D&D + Wojak Farmers get incentivized (later).”

---

## 1. Current flow (how it works now)

### Page and layout
- **Route:** `/swipe` (GameVoting page, under Fight Club).
- **Desktop:** 3 columns — left: MiniLeaderboard | center: VotingFeed (card stack) | right: VotingStatsPanel.
- **Mobile:** MobileStatsBar + VotingFeed.

### Center: NFT and voting
- **VotingFeed** loads items from `GET /api/game/feed?did=<optional>&guestId=<optional>&limit=10`.
- **Feed logic:** Weighted random (recency + vote count + active battles). Excludes:
  - **Authenticated (DID):** NFTs voted in last **24 hours**, own creations, own holdings.
  - **Guest (guestId):** NFTs voted in last **24 hours** only.
  - **Anonymous:** No exclusions (full random).
- **Card stack:** Up to 3 cards; top card is the “current” NFT (visually in the middle). User swipes or uses like/dislike buttons.
- **On vote:** `POST /api/game/vote` with `voterDid` or `guestId`, `nftId`, `editionNumber`, `voteType` (1 or -1). Frontend removes that NFT from local feed and refetches when `feed.length <= 3`.

### Left: MiniLeaderboard
- **Data:** `GET /api/game/leaderboard?limit=10`.
- **Shows:** Top 10 players by **power level** (not “new” wallets). Only players with `phase1_verified = 1` and `power_level > 0`.
- **Columns:** Rank, power level, wallet (truncated). “You” pinned at bottom if not in top 10.

### Right: VotingStatsPanel
- **Shows:** Only when user is logged in (player). “Your Game” — power level, tier label, onboarding checklist, link to rankings.

### Backend: vote API
- **Auth:** Either `voterDid` (Clerk DID after wallet connect) or `guestId` (localStorage). No vote without one.
- **Rate limit:** **20 votes per 60 seconds** per voter (DID or guestId). 429 when exceeded.
- **Cooldown:** Same user can re-vote the same NFT after **24 hours** (update/change vote). Feed excludes that NFT for 24h so normally you don’t see it again until cooldown expires.
- **Business rules:** Cannot vote on NFTs you hold; cannot vote on your own creations. Power/score updates for all voters; credits only for holders (see below).

### Incentivization (who gets what)
- **Holder = D&D + Wojak Farmers Plot:** `phase1_verified = 1`. Set by:
  - **verify-phase1:** Checks MintGarden for Phase 1 collection `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah` (Wojak Farmers Plot) for that DID.
  - **refresh-did:** Indexes DID holdings and sets `phase1_verified` / `phase1_nft_count` from Phase 1 NFTs.
- **Credits (only for holders):** First vote onboarding credits; 1 credit per 20 votes (participation); streaks etc. Non-holders can vote but get no credits.
- You said incentivization will be done later — no code changes suggested here for that.

---

## 2. Gaps vs your goals

| Goal | Current state | Gap |
|------|----------------|-----|
| **New wallets on the left + power level** | Left = top 10 by power level (verified players only). No “new” or “recent” list. | Left is “top power”, not “new wallets”. Need a definition of “new” (e.g. recently registered, or recently active voters) and either a new API or a second list/section. |
| **NFT always in the middle** | Top card of the stack is the current NFT and is centered. | Already correct. |
| **Users can always vote** | Feed can run out: after voting, each NFT is excluded for that voter for 24h. So if there are fewer minted NFTs than votes in a session, user hits “All Caught Up” and cannot vote until cooldowns expire. | Feed is “finite” per 24h window. To allow “always vote”, either: (A) Remove 24h exclusion from feed (allow same NFT to reappear; backend already supports re-vote), or (B) Keep cooldown but add more supply (e.g. include other sources). |
| **No limit on voting** | No daily cap: backend and frontend treat votes as unlimited. | **But:** rate limit **20 votes/minute** and **feed running out** effectively cap how much a user can vote in practice. |

So the two main blockers to “always vote” and “no limit” in practice are:
1. **Feed runs out** (24h cooldown) → “All Caught Up”.
2. **Rate limit** 20/min → burst voting is capped.

---

## 3. Summary of what to change (excluding incentivization)

1. **Left panel — “new wallets” + power level**
   - Today: only “top 10 by power”.
   - Option A: Add a “New / recent” section (e.g. recently registered or recently voted) with power level next to each; keep or merge with current leaderboard.
   - Option B: Replace left with “new wallets” list + power level and move “top power” elsewhere (e.g. “View Full”).
   - Needs: API (e.g. “recent players” or “recent voters”) and MiniLeaderboard (or new component) to show them with power level.

2. **Center — NFT in middle**
   - No change; already correct.

3. **Always vote / no effective limit**
   - **Feed never empty:** Easiest approach: **stop excluding voted NFTs from the feed** (or only exclude for a much shorter window, e.g. 1–5 minutes). Same NFT can reappear; user can change vote or re-vote (backend already allows re-vote after 24h; if we shorten or remove cooldown in feed, we may want to allow re-vote sooner in `vote.ts` so UX is consistent).
   - **Rate limit:** 20/min is for abuse protection. If you want “no limit” in practice, increase (e.g. 60–120/min) or remove; document in spec.

4. **Incentivization**
   - As requested: only D&D + Wojak Farmers (`phase1_verified`) get incentivized; you’ll do that part later. No code changes proposed here.

---

## 4. Files reference

| Area | Files |
|------|--------|
| Voting page | `src/pages/GameVoting.tsx` |
| Feed UI | `src/components/game/VotingFeed.tsx`, `SwipeCard.tsx`, `VoteButtons.tsx` |
| Left panel | `src/components/game/MiniLeaderboard.tsx` |
| Right panel | `src/components/game/VotingStatsPanel.tsx` |
| Game state / feed + vote | `src/contexts/GameContext.tsx` (loadFeed, castVote) |
| Feed API | `functions/api/game/feed.ts` (24h exclusion in WHERE) |
| Vote API | `functions/api/game/vote.ts` (rate limit, cooldown, holder-only credits) |
| Leaderboard API | `functions/api/game/leaderboard.ts` (top by power, phase1_verified) |
| Rate limits | `functions/lib/rateLimit.ts` (GAME_RATE_LIMITS.vote: 20/min) |
| D&D / Phase 1 | `functions/api/game/verify-phase1.ts`, `_shared.ts` (PHASE1_COLLECTION_ID), `functions/api/profile/refresh-did.ts` |

---

## 5. Quick test checklist (current behavior)

- [ ] Open `/swipe`; see left (leaderboard), center (card), right (your game if logged in).
- [ ] Vote with guest: no DID; feed uses guestId; after many votes, feed can empty → “All Caught Up”.
- [ ] Vote with logged-in user: feed uses DID; own creations/holdings excluded; same 24h cooldown.
- [ ] Vote 21 times in 1 minute: 21st vote should return 429 (rate limit).
- [ ] phase1_verified = 0: votes count for power/score, no credits. phase1_verified = 1: credits on first vote and per 20 votes, etc.

Once you define “new wallets” (e.g. recent signups vs recent voters) and desired rate limit / feed behavior, the code changes above are straightforward to implement.
