# Wojak Swipe — End-to-End Smoke Test Plan

> Run this after Phase 4 deploys. Each test has pass/fail criteria and curl commands for API verification.
> Total estimated time: 30-45 minutes manual walkthrough.

---

## Prerequisites

Before starting, ensure:

1. **Phase 4 deployed** — all commits merged, `npx wrangler pages deploy dist` completed
2. **DID indexer redeployed** — `cd workers/did-indexer && npx wrangler deploy` completed
3. **`did_holdings` wiped and re-indexed** — old corrupted data cleared, indexer run triggered
4. **Battle cron redeployed** — `cd workers/battle-cron && npx wrangler deploy` completed
5. **Sage Wallet installed** — Chrome extension with at least one DID that holds a Wojak Farmers Plot NFT
6. **At least 2 test accounts** — two DIDs needed for battle testing (can be same wallet, different DIDs)

### Quick Deploy Verification

```bash
# Verify game tables exist
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'game_%' OR name LIKE 'battle%' OR name LIKE 'wojak%' OR name = 'did_holdings' OR name = 'nft_names') ORDER BY name;"

# Expected tables:
# battle_queue, battle_votes, battles, credit_events, did_holdings,
# game_activity, game_players, nft_names, wojak_burns, wojak_scores, wojak_votes

# Verify collection IDs are correct in deployed code
curl -s 'https://wojak.ink/api/game/feed?did=test' | jq '.error'
# Should return "Player not registered" (not a server crash)
```

---

## Test 0: Database Health

**What:** Verify the schema is intact and no leftover corrupted data exists.

```bash
# Check did_holdings is empty (was wiped) or freshly populated
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT COUNT(*) as total, COUNT(DISTINCT did_id) as dids FROM did_holdings;"

# Check game_players table
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT COUNT(*) as total FROM game_players;"

# Verify no orphan data from old wrong collection IDs
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT DISTINCT collection FROM did_holdings;"
# Should show only: 'phase1' and 'phase2' (or empty if no players indexed yet)
```

**Pass:** Tables exist, `did_holdings` has no stale data from bogus collection IDs.

---

## Test 1: Registration Flow

**Route:** `https://wojak.ink/swipe`

### 1a: No Wallet Connected

1. Open `/swipe` in a browser with no wallet extension
2. **Expected:** GateChecklist shows with "Connect Wallet" as first incomplete step
3. **Pass:** Gate UI renders, no console errors

### 1b: Wallet Connected, Auto-Registration

1. Connect Sage Wallet (must have at least one DID)
2. Navigate to `/swipe`
3. **Expected:** SwipeAutoRegister fires `POST /api/game/register` automatically
4. Check registration:

```bash
# Replace DID with your actual DID
curl -s -X POST https://wojak.ink/api/game/register \
  -H 'Content-Type: application/json' \
  -d '{"did":"did:chia:1YOUR_DID_HERE","walletAddress":"xch1YOUR_ADDRESS_HERE"}' | jq .
```

**Expected response:**
```json
{
  "success": true,
  "player": {
    "did": "did:chia:1...",
    "powerLevel": 0,
    "phase1Verified": false,
    "votesToday": 0,
    "onboarding": { "did": true, "phase1": false, "minted": false, "voted": false, "battled": false }
  }
}
```

**Pass:** Player object returned, `onboarding.did` is `true`, `phase1Verified` is `false`.

### 1c: Phase 1 Verification

1. Stay on `/swipe`
2. **Expected:** GateChecklist shows "Verify Phase 1 NFT" step. If DID holds a Wojak Farmers Plot, auto-verify fires.
3. Manual test:

```bash
curl -s -X POST https://wojak.ink/api/game/verify-phase1 \
  -H 'Content-Type: application/json' \
  -d '{"did":"did:chia:1YOUR_DID_HERE"}' | jq .
```

**Expected (if DID holds Phase 1 NFT):**
```json
{ "success": true, "verified": true, "message": "Phase 1 NFT verified!..." }
```

**Expected (if DID does NOT hold Phase 1 NFT):**
```json
{ "success": true, "verified": false, "message": "No Wojak Farmers Plot NFT found..." }
```

**Pass:** Verification correctly detects Phase 1 NFT ownership via MintGarden API. The collection ID `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah` is queried (not the old bogus ID).

### 1d: Verify MintGarden API is Actually Queried with Correct Collection

```bash
# Check if MintGarden returns NFTs for this collection + DID
curl -s "https://api.mintgarden.io/nfts?collection_id=col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah&owner_did=did:chia:1YOUR_DID_HERE&size=1" | jq '.items | length'
# Should match what verify-phase1 returns
```

**Pass:** MintGarden returns items matching the player's actual Wojak Farmers Plot holdings.

---

## Test 2: Voting Flow

**Route:** `https://wojak.ink/swipe`

### 2a: Feed Loads

1. After verification, the GateChecklist should disappear
2. **Expected:** Card stack loads (skeleton → first card with Wojak image)
3. **Pass:** At least 1 Wojak card visible, image loads from MintGarden CDN

```bash
curl -s "https://wojak.ink/api/game/feed?did=did:chia:1YOUR_DID_HERE&limit=3" | jq '.feed | length'
# Should be >= 1 (if any Phase 2 NFTs exist that you haven't voted on)
```

### 2b: Image Fallback (Phase 4 fix)

1. Open browser DevTools → Network tab
2. Find a MintGarden image request and block the domain (`assets.mintgarden.io`)
3. **Expected:** Card shows SVG fallback "Image unavailable" instead of broken image icon
4. **Pass:** Fallback SVG renders, no broken image icon visible

### 2c: Cast Vote (Like)

1. Swipe right or click the heart button
2. **Expected:** Card animates out, next card appears, vote counter decrements
3. Check the vote was recorded:

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM wojak_votes WHERE voter_did = 'did:chia:1YOUR_DID_HERE' ORDER BY created_at DESC LIMIT 1;"
```

**Pass:** Vote row exists with correct `nft_id`, `vote_type = 1`.

### 2d: Cast Vote (Dislike)

1. Swipe left or click the X button
2. **Expected:** Card animates out, vote counter decrements
3. **Pass:** Vote row exists with `vote_type = -1`.

### 2e: Vote Failure Feedback (Phase 4 fix)

1. Open DevTools → Network tab
2. Intercept and block `POST /api/game/vote` (or use throttling to cause a timeout)
3. Swipe on a card
4. **Expected:** Toast notification "Vote failed to save" appears
5. **Pass:** Error toast is visible to the user (not silent failure)

### 2f: Daily Vote Limit

1. Cast 10 votes
2. **Expected:** PostRoundSummary screen appears showing session stats
3. **Pass:** Summary shows correct like/dislike counts, votesRemaining = 0

### 2g: First Vote Milestone

If this is your first vote ever (`onboarding.voted` was false):

1. **Expected:** Milestone toast "+2 credits / First Vote!" appears
2. **Pass:** Toast fires, `game_activity` has a `vote_milestone` event with `milestone: 'first_vote'`

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM game_activity WHERE did_id = 'did:chia:1YOUR_DID_HERE' AND event_type = 'vote_milestone' ORDER BY created_at DESC LIMIT 1;"
```

### 2h: Keyboard Shortcuts (Desktop Only)

1. On a desktop browser, press → (right arrow) to like
2. Press ← (left arrow) to dislike
3. **Pass:** Both keyboard shortcuts work, card animates correctly

---

## Test 3: Dashboard

**Route:** `https://wojak.ink/swipe/dashboard`

### 3a: Power Level Display

1. Navigate to `/swipe/dashboard`
2. **Expected:** Power level number renders (may be 0 for new players)
3. Click "View Breakdown"
4. **Expected:** Holdings score and Creations score visible

```bash
curl -s "https://wojak.ink/api/game/power-level?did=did:chia:1YOUR_DID_HERE" | jq .
```

**Expected response includes `rank` and `credits` (Phase 4 fix):**
```json
{
  "success": true,
  "powerLevel": 123,
  "rank": 5,
  "credits": 700,
  "breakdown": { "holdings": {...}, "creations": {...} }
}
```

**Pass:** `rank` and `credits` are present in the response (not `undefined`).

### 3b: Latest Event Banner (Phase 4 fix)

1. After casting votes, the banner should show a `vote_milestone` event
2. **Expected:** Banner displays formatted text like "Reached 10 total votes" or "Cast your first vote!"
3. If a battle has been resolved, banner should show "Won battle!" or "Lost battle" with vote counts
4. **Pass:** Banner renders actual event types (`vote_milestone`, `battle_won`, `battle_lost`, `battle_draw`, `burn`) — NOT `battle_result`

```bash
curl -s "https://wojak.ink/api/game/activity?did=did:chia:1YOUR_DID_HERE&limit=5" | jq '.events[] | {eventType, eventData}'
```

### 3c: Collection Scroll

1. **Expected:** Horizontal row of owned Wojak thumbnails (from `did_holdings`)
2. **Pass:** At least one thumbnail visible if player owns Phase 2 NFTs; images load from MintGarden CDN

```bash
curl -s "https://wojak.ink/api/game/collection?did=did:chia:1YOUR_DID_HERE" | jq '.nfts | length'
```

### 3d: Collection Scroll Error State (Phase 4 fix)

1. Block `GET /api/game/collection` in DevTools
2. Reload dashboard
3. **Expected:** "Couldn't load collection." message with "Retry" button
4. Click Retry
5. **Expected:** Collection attempts to reload
6. **Pass:** Error state renders with working retry button (not a silent empty state)

### 3e: Collection Scroll Image Fallback (Phase 4 fix)

1. Block `assets.mintgarden.io` in DevTools
2. **Expected:** Thumbnail images show SVG fallback, not broken icons
3. **Pass:** Fallback renders for all collection thumbnails AND the modal detail image

### 3f: Active Battle Card

1. If player has an active battle:
   - **Expected:** Shows NFT images, vote counts, countdown timer
2. If no active battles:
   - **Expected:** "No active battles" with "Find a Battle" link
3. **Pass:** Correct state renders

### 3g: Onboarding Checklist

1. For a new player, checklist should show incomplete milestones
2. As milestones complete (vote, battle, etc.), checkmarks appear
3. When all 5 complete, checklist disappears
4. **Pass:** Checklist correctly reflects player's onboarding state

---

## Test 4: Burn Flow

**Route:** `https://wojak.ink/swipe/dashboard` → Collection → NFT Detail Modal

### 4a: Open NFT Detail

1. Click a Wojak thumbnail in collection scroll
2. **Expected:** Modal opens with edition number, likes, dislikes, net score, total votes
3. **Pass:** Modal renders with correct stats

### 4b: Fetch Coin ID on Burn Click (Phase 4 fix — BLOCKER B)

1. Click "Burn" button in the modal
2. **Expected:** Loading spinner appears while fetching real `nftCoinId` from MintGarden API
3. **Expected:** The system fetches `https://api.mintgarden.io/nfts/<nftId>` to get the on-chain coin ID
4. **Pass:** The actual BurnButton appears only after the coin ID is fetched (NOT immediately)

### 4c: Burn Confirmation

1. After coin ID loads, click the BurnButton
2. **Expected:** BurnConfirmDialog appears with warning text
3. Click Cancel
4. **Expected:** Dialog closes, no burn occurs
5. **Pass:** Confirmation dialog is blocking

### 4d: Burn Execution (requires test NFT you're willing to burn)

> ⚠️ This permanently destroys an NFT. Only test if you have a disposable Phase 2 NFT.

1. Click Burn → Confirm
2. **Expected:** Wallet prompt (Sage) to sign the `transferNFT` transaction (sends to burn address)
3. After wallet confirms, `POST /api/game/burn` fires
4. **Expected:** Modal closes, collection refreshes (burned NFT disappears), power level recalculates
5. **Pass:** NFT gone from collection, credits awarded, power level updated

```bash
# Check burn was recorded
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM wojak_burns ORDER BY created_at DESC LIMIT 1;"

# Check credits awarded
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM credit_events WHERE source = 'burn' ORDER BY created_at DESC LIMIT 1;"
```

### 4e: Burn Error Feedback (Phase 4 fix)

1. Disconnect wallet or reject the Sage wallet prompt during burn
2. **Expected:** Error message "Burn failed. Your NFT was not destroyed." appears
3. **Pass:** User sees clear error, not silent failure

### 4f: Post-Burn State Refresh (Phase 4 fix — Task 1)

1. After a successful burn:
   - **Expected:** Burned NFT disappears from collection scroll immediately
   - **Expected:** Power level recalculates (may go up or down depending on the NFT's score)
2. **Pass:** Both collection and power level reflect the burn without page reload

---

## Test 5: Battle Flow

**Route:** `https://wojak.ink/swipe/battles`

### 5a: Battle Queue — Enter

1. Navigate to `/swipe/battles`
2. Select a Phase 2 NFT from dropdown
3. Click "Enter Battle Queue"
4. **Expected (no opponent):** Message "Added to queue. Waiting for an opponent..."
5. **Expected (opponent found):** Message "Battle started! Your NFT has been matched." (green)
6. **Pass:** Queue join succeeds

```bash
# Check queue state
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM battle_queue ORDER BY created_at DESC LIMIT 5;"
```

### 5b: Battle Queue — Match (requires 2 accounts)

1. With Account A: queue an NFT
2. With Account B: queue a different NFT
3. **Expected:** Battle is created, both see "Battle started!" message
4. **Pass:** `battles` table has a new row with both NFT IDs, `status = 'active'`

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT id, nft_a_id, nft_b_id, status, ends_at FROM battles ORDER BY created_at DESC LIMIT 1;"
```

### 5c: Battle Voting

1. With a 3rd account (not a battle participant), view the active battle
2. Click Vote on one NFT
3. **Expected:** Vote count updates, button becomes disabled
4. **Pass:** `battle_votes` row created, `battles.votes_a` or `votes_b` incremented

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM battle_votes ORDER BY created_at DESC LIMIT 1;"
```

### 5d: Battle Voting — Self-Vote Prevention

1. As a battle participant, try to vote on your own battle
2. **Expected:** 403 error, "Cannot vote on your own battle"
3. **Pass:** Vote is rejected

### 5e: Battle Resolution (after 24h or manual trigger)

```bash
# Manually trigger resolution (for testing, set a battle's ends_at to the past)
npx wrangler d1 execute wojak-users --remote --command \
  "UPDATE battles SET ends_at = datetime('now', '-1 hour') WHERE id = YOUR_BATTLE_ID AND status = 'active';"

# Then trigger resolution
curl -s -X POST https://wojak.ink/api/game/battle-resolve | jq .
```

**Expected:** `{ "success": true, "resolved": 1, "draws": 0, "total": 1 }`

```bash
# Verify battle was resolved
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT id, status, winner_nft_id FROM battles WHERE id = YOUR_BATTLE_ID;"

# Verify game_activity events were created
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT event_type, event_data FROM game_activity WHERE event_type IN ('battle_won', 'battle_lost', 'battle_draw') ORDER BY created_at DESC LIMIT 2;"
```

**Pass:** Battle status is `completed`, `winner_nft_id` set, activity events created for both players.

### 5f: Battle Image Fallback (Phase 4 fix)

1. Block `assets.mintgarden.io` in DevTools
2. View an active battle
3. **Expected:** Both NFT images show SVG fallback
4. **Pass:** No broken image icons

---

## Test 6: Leaderboard

**Route:** `https://wojak.ink/swipe/leaderboard`

### 6a: Players Tab

1. Navigate to `/swipe/leaderboard`
2. **Expected:** Player rankings table loads with power level, rank
3. Click "Load More" if available
4. **Pass:** Table renders, pagination works

### 6b: Top Wojaks Tab

1. Click "Top Wojaks" tab
2. **Expected:** Wojak rankings table loads with scores, vote counts
3. **Pass:** Tab switch triggers load, table renders

### 6c: Your Position

1. Check the sticky footer bar (GamePositionBar)
2. **Expected:** Shows your rank and points to next rank
3. **Pass:** Bar renders with correct rank (matches power-level API response)

---

## Test 7: DID Indexer

### 7a: Manual Indexer Run

```bash
# Trigger manual run (if deployed with /run endpoint)
curl -s https://did-indexer.YOUR_SUBDOMAIN.workers.dev/run
```

**Pass:** Returns "DID indexer run complete" (not an error).

### 7b: Verify Holdings Populated

```bash
# After indexer runs, check holdings
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT did_id, COUNT(*) as nfts, collection FROM did_holdings GROUP BY did_id, collection ORDER BY nfts DESC LIMIT 10;"
```

**Pass:** Holdings reflect actual NFT ownership per MintGarden, with correct `collection` labels (`phase1` or `phase2`).

### 7c: Verify Phase 1 Status Updated

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT did_id, phase1_verified, power_level FROM game_players LIMIT 10;"
```

**Pass:** `phase1_verified` = 1 for players who hold Phase 1 NFTs, 0 for those who don't.

---

## Test 8: Cross-Cutting Concerns

### 8a: Mobile Responsiveness

1. Open `/swipe` on mobile (or Chrome DevTools mobile emulator, iPhone 12/13 size)
2. **Expected:** MobileStatsBar appears above feed, cards are full-width, buttons are touch-friendly
3. Swipe left/right on a card
4. **Pass:** Touch swipe works, card animates, vote fires

### 8b: Error Recovery

1. Disconnect network, try to vote
2. Reconnect network
3. **Expected:** Toast "Vote failed to save" appeared during disconnect
4. New votes after reconnect succeed
5. **Pass:** Graceful degradation, no stuck UI

### 8c: Console Errors

1. Open DevTools console on every page (`/swipe`, `/swipe/dashboard`, `/swipe/battles`, `/swipe/leaderboard`)
2. **Pass:** No red errors related to game functionality (some third-party warnings acceptable)

### 8d: Navigation Between Routes

1. `/swipe` → dashboard link → `/swipe/dashboard`
2. `/swipe/dashboard` → "Find a Battle" → `/swipe/battles`
3. `/swipe/battles` → back → `/swipe/dashboard`
4. `/swipe/dashboard` → leaderboard → `/swipe/leaderboard`
5. **Pass:** All navigation works, state persists (GameContext maintained)

---

## Test Results Template

| Test | Result | Notes |
|------|--------|-------|
| 0: DB Health | ☐ Pass / ☐ Fail | |
| 1a: No Wallet | ☐ Pass / ☐ Fail | |
| 1b: Auto-Register | ☐ Pass / ☐ Fail | |
| 1c: Phase 1 Verify | ☐ Pass / ☐ Fail | |
| 1d: Collection ID Check | ☐ Pass / ☐ Fail | |
| 2a: Feed Loads | ☐ Pass / ☐ Fail | |
| 2b: Image Fallback | ☐ Pass / ☐ Fail | |
| 2c: Vote Like | ☐ Pass / ☐ Fail | |
| 2d: Vote Dislike | ☐ Pass / ☐ Fail | |
| 2e: Vote Fail Toast | ☐ Pass / ☐ Fail | |
| 2f: Daily Limit | ☐ Pass / ☐ Fail | |
| 2g: First Vote Milestone | ☐ Pass / ☐ Fail | |
| 2h: Keyboard Shortcuts | ☐ Pass / ☐ Fail | |
| 3a: Power Level | ☐ Pass / ☐ Fail | |
| 3b: Event Banner | ☐ Pass / ☐ Fail | |
| 3c: Collection Scroll | ☐ Pass / ☐ Fail | |
| 3d: Collection Error | ☐ Pass / ☐ Fail | |
| 3e: Collection Fallback | ☐ Pass / ☐ Fail | |
| 3f: Active Battle Card | ☐ Pass / ☐ Fail | |
| 3g: Onboarding Checklist | ☐ Pass / ☐ Fail | |
| 4a: NFT Detail Modal | ☐ Pass / ☐ Fail | |
| 4b: Coin ID Fetch | ☐ Pass / ☐ Fail | |
| 4c: Burn Confirm Dialog | ☐ Pass / ☐ Fail | |
| 4d: Burn Execution | ☐ Pass / ☐ Fail | |
| 4e: Burn Error Feedback | ☐ Pass / ☐ Fail | |
| 4f: Post-Burn Refresh | ☐ Pass / ☐ Fail | |
| 5a: Queue Enter | ☐ Pass / ☐ Fail | |
| 5b: Queue Match | ☐ Pass / ☐ Fail | |
| 5c: Battle Vote | ☐ Pass / ☐ Fail | |
| 5d: Self-Vote Prevention | ☐ Pass / ☐ Fail | |
| 5e: Battle Resolution | ☐ Pass / ☐ Fail | |
| 5f: Battle Image Fallback | ☐ Pass / ☐ Fail | |
| 6a: Players Leaderboard | ☐ Pass / ☐ Fail | |
| 6b: Top Wojaks | ☐ Pass / ☐ Fail | |
| 6c: Your Position | ☐ Pass / ☐ Fail | |
| 7a: Indexer Manual Run | ☐ Pass / ☐ Fail | |
| 7b: Holdings Data | ☐ Pass / ☐ Fail | |
| 7c: Phase 1 Status | ☐ Pass / ☐ Fail | |
| 8a: Mobile | ☐ Pass / ☐ Fail | |
| 8b: Error Recovery | ☐ Pass / ☐ Fail | |
| 8c: Console Errors | ☐ Pass / ☐ Fail | |
| 8d: Navigation | ☐ Pass / ☐ Fail | |
