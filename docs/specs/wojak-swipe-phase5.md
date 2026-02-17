# Wojak Swipe Phase 5 — Social & Engagement Features

> **Dependency:** Phase 4 complete + smoke test passing
> **Scope:** Features that increase engagement and retention within the Wojak Swipe game system
> **Principle:** Build on existing infrastructure — the codebase already has profiles, friends, leaderboards, a shop system, gifting, and notification templates. Phase 5 wires the Swipe game into these systems.

---

## Existing Infrastructure (what we're building on)

| System | Status | Files |
|--------|--------|-------|
| User profiles | ✅ Full (display name, avatar, stats) | `functions/api/profile/`, `src/pages/AccountPage.tsx` |
| Friends | ✅ Full (add/remove, search) | `functions/api/friends/`, `src/contexts/FriendsContext.tsx` |
| Global leaderboards | ✅ Full (per-game rankings) | `functions/api/leaderboard/` |
| Shop + inventory | ✅ Full (emoji, frames, titles, effects) | `functions/api/shop/`, `shop_items` table |
| Gifting | ✅ Full (items, oranges, gems to friends) | `functions/api/gift/` |
| Notifications | ⚠️ Templates ready, backend not wired | `src/types/notification.ts`, `NotificationContext.tsx` |
| Messages | ⚠️ Partial (announcement-style only) | `functions/api/messages/` |
| Currency (oranges/gems) | ✅ Full (balance, transactions) | `user_currency`, `currency_transactions` tables |
| Game activity | ✅ Swipe events only | `game_activity` table |

---

## Feature 1: Activity Feed Page

**Priority:** High — gives players a reason to return and check what happened

### What

A dedicated `/swipe/activity` page showing a chronological feed of all game events for the current player, replacing the single-event LatestEventBanner with a full history.

### Design

```
/swipe/activity
┌──────────────────────────────────┐
│  Your Activity                   │
├──────────────────────────────────┤
│  🏆 Won battle! (8-3 votes)     │ 2 hours ago
│  ⚔️ Battle started vs #42       │ 26 hours ago
│  🔥 Burned Wojak #17 (+12 cr)   │ yesterday
│  ⭐ Reached 50 total votes       │ 2 days ago
│  👍 Cast your first vote!        │ 3 days ago
│  ────────────────────────────    │
│  [Load More]                     │
└──────────────────────────────────┘
```

### Implementation

**Backend:** The `GET /api/game/activity` endpoint already exists and supports `?did=&limit=&offset=` pagination. No backend changes needed — just increase the default limit and add `offset` support if not present.

Check if `offset` parameter is supported in `activity.ts`. If not, add it:
```ts
const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
// Add to query: LIMIT ? OFFSET ?
```

**Frontend:**

1. Create `src/pages/GameActivity.tsx`:
   - Fetch `GET /api/game/activity?did=&limit=20&offset=0`
   - Render each event using the same formatting logic as `LatestEventBanner.formatEvent()`
   - Extract `formatEvent()` into a shared utility: `src/lib/gameEvents.ts`
   - "Load More" button appends next page
   - Empty state: "No activity yet. Start voting!"

2. Add route in `App.tsx`: `/swipe/activity` → `GameActivity`

3. Update `LatestEventBanner` to link to `/swipe/activity` ("View all →")

**Estimated effort:** Small (1 new page, extract shared utility, minor routing)

---

## Feature 2: Battle History

**Priority:** High — players want to see past battle outcomes

### What

Extend the `/swipe/battles` page with a "History" tab showing completed and drawn battles.

### Design

```
/swipe/battles
┌──────────────────────────────────┐
│ [Active Battles] [History]       │
├──────────────────────────────────┤
│ History tab:                     │
│                                  │
│ ┌────────────┐ ┌────────────┐   │
│ │ Your #42   │ │ Opponent   │   │
│ │ 🏆 WON     │ │ #17        │   │
│ │ 12 votes   │ │ 5 votes    │   │
│ └────────────┘ └────────────┘   │
│  Ended: Feb 15 • You won!       │
│                                  │
│ ┌────────────┐ ┌────────────┐   │
│ │ Your #8    │ │ Opponent   │   │
│ │            │ │ #55        │   │
│ │ 3 votes    │ │ 3 votes    │   │
│ └────────────┘ └────────────┘   │
│  Ended: Feb 13 • Draw           │
│  [Load More]                     │
└──────────────────────────────────┘
```

### Implementation

**Backend:** The `GET /api/game/battle-list` endpoint already accepts `?status=active|completed|draw`. Add a `?status=history` option that returns `completed` OR `draw` battles:

```ts
// In battle-list.ts, add:
if (status === 'history') {
  statusFilter = "status IN ('completed', 'draw')";
  orderBy = 'ORDER BY resolved_at DESC';
}
```

Also add `offset` parameter for pagination if not present.

**Frontend:**

1. In `src/pages/GameBattles.tsx` (or `BattleView`):
   - Add tab toggle: "Active" / "History"
   - "History" tab fetches `GET /api/game/battle-list?did=&status=history&limit=10`
   - Render each historical battle with outcome badge (Won/Lost/Draw), vote counts, end date
   - Reuse existing `BattleCard` component with a `completed` variant (no vote buttons, show result instead)

2. Create `HistoricalBattleCard` variant or add `mode="history"` prop to existing `BattleCard`:
   - Show winner badge (trophy icon) on winning side
   - Gray out losing side
   - Show "Draw" badge for draws
   - Show resolved date instead of countdown

**Estimated effort:** Small-Medium (tab logic, new card variant, endpoint filter)

---

## Feature 3: NFT Naming

**Priority:** Medium — personalization drives attachment

### What

Let players name their Phase 2 NFTs. Names appear in the voting feed, collection, battles, and leaderboard.

### Design

In the NftDetailModal (CollectionScroll):
```
┌──────────────────────────────┐
│ Your Wojak #42               │
│ ✏️ [Custom Name: ________]   │
│                              │
│ Likes: 10  Dislikes: 2      │
│ Net Score: 8                 │
│                              │
│ [Enter Battle]  [Burn]       │
└──────────────────────────────┘
```

### Implementation

**Backend:** Create `POST /api/game/nft-name`:

```ts
// Request: { did: string, editionNumber: number, name: string }
// Validation:
//   - Player must own the NFT (check did_holdings)
//   - Name: 1-30 characters, alphanumeric + spaces + basic punctuation
//   - No slurs (basic blocklist)
//   - Rate limit: 1 rename per NFT per 24 hours

// Write to nft_names table:
// UPDATE nft_names SET custom_name = ? WHERE edition_number = ?
// or INSERT OR REPLACE if row doesn't exist
```

The `nft_names` table already has a `custom_name` column. The `feed.ts` and `collection.ts` endpoints already query and return `custom_name`. The only missing piece is the write endpoint.

**Frontend:**

1. In `NftDetailModal` (inside `CollectionScroll.tsx`):
   - Show current name (custom or default)
   - Inline edit: click pencil icon → text input appears → Enter to save
   - Validation: max 30 chars, alphanumeric
   - `POST /api/game/nft-name` on submit
   - Optimistic update: show new name immediately

**Cost consideration:** Naming is free (no credits). Could optionally cost credits for renames after the first.

**Estimated effort:** Small (1 new endpoint, inline edit in existing modal)

---

## Feature 4: Vote Streaks

**Priority:** Medium — daily engagement incentive

### What

Track consecutive days a player uses all 10 votes. Award bonus credits at milestones.

### Design

Dashboard shows streak:
```
🔥 7-day vote streak!
Next bonus at 14 days: +10 credits
```

### Implementation

**Backend:**

1. Add columns to `game_players`:
```sql
ALTER TABLE game_players ADD COLUMN vote_streak INTEGER DEFAULT 0;
ALTER TABLE game_players ADD COLUMN vote_streak_last_date TEXT;
ALTER TABLE game_players ADD COLUMN vote_streak_longest INTEGER DEFAULT 0;
```

2. In `vote.ts`, when the 10th vote of the day is cast (`votesRemaining === 0`):
```ts
const today = getTodayString();
const yesterday = getYesterdayString(); // new helper

if (player.vote_streak_last_date === yesterday) {
  // Consecutive day — extend streak
  newStreak = (player.vote_streak || 0) + 1;
} else if (player.vote_streak_last_date === today) {
  // Already counted today
  newStreak = player.vote_streak;
} else {
  // Streak broken — start fresh
  newStreak = 1;
}

// Update streak
await env.DB.prepare(`
  UPDATE game_players
  SET vote_streak = ?,
      vote_streak_last_date = ?,
      vote_streak_longest = MAX(vote_streak_longest, ?)
  WHERE did_id = ?
`).bind(newStreak, today, newStreak, voterDid).run();

// Award milestone credits
const STREAK_MILESTONES = { 3: 300, 7: 500, 14: 1000, 30: 2000, 100: 5000 };
if (STREAK_MILESTONES[newStreak]) {
  await env.DB.prepare(`
    INSERT INTO credit_events (wallet_address, nft_id, edition_number, credits_earned, source)
    VALUES (?, ?, 0, ?, 'streak')
  `).bind(player.wallet_address, `streak_${newStreak}`, STREAK_MILESTONES[newStreak]).run();

  // Log activity
  await env.DB.prepare(`
    INSERT INTO game_activity (did_id, event_type, event_data)
    VALUES (?, 'streak_milestone', ?)
  `).bind(voterDid, JSON.stringify({ days: newStreak, credits: STREAK_MILESTONES[newStreak] })).run();
}
```

3. Return `voteStreak` in the power-level and register responses.

**Frontend:**

1. In `PostRoundSummary.tsx` (shown after 10th vote):
   - Show "🔥 X-day streak!" with next milestone info
   - If milestone just hit: celebratory animation + credit toast

2. In `PowerLevelDisplay` or dashboard:
   - Show current streak, longest streak, next milestone

**Estimated effort:** Medium (migration, vote.ts logic, UI in two places)

---

## Feature 5: Creator Stats

**Priority:** Medium — rewards quality content creation

### What

Show creators how their NFTs are performing across the game: total votes received, win/loss record in battles, average score.

### Design

Dashboard addition or separate section:
```
Creator Stats
─────────────────
Your Wojaks: 12 minted
Total votes received: 847
Average net score: +4.2
Battle record: 8W - 3L - 2D
Top performer: "Rare Pepe Chad" (#42) — net +23
```

### Implementation

**Backend:** Create `GET /api/game/creator-stats?wallet=`:

```ts
// Queries:
// 1. Count of minted NFTs
const minted = await env.DB.prepare(
  'SELECT COUNT(*) as count FROM phase2_mints WHERE wallet_address = ? AND status = ?'
).bind(wallet, 'minted').first();

// 2. Aggregate scores
const scores = await env.DB.prepare(`
  SELECT COUNT(*) as nftCount,
         SUM(likes) as totalLikes,
         SUM(dislikes) as totalDislikes,
         SUM(net_score) as totalNetScore,
         SUM(total_votes) as totalVotes,
         AVG(net_score) as avgNetScore
  FROM wojak_scores WHERE creator_wallet = ?
`).bind(wallet).first();

// 3. Battle record (from battles table)
const battleRecord = await env.DB.prepare(`
  SELECT
    COUNT(CASE WHEN winner_nft_id IN (SELECT nft_id FROM did_holdings WHERE creator_wallet = ?) THEN 1 END) as wins,
    COUNT(CASE WHEN status = 'completed' AND winner_nft_id NOT IN (SELECT nft_id FROM did_holdings WHERE creator_wallet = ?) THEN 1 END) as losses,
    COUNT(CASE WHEN status = 'draw' THEN 1 END) as draws
  FROM battles
  WHERE nft_a_id IN (SELECT mint_id FROM phase2_mints WHERE wallet_address = ?)
     OR nft_b_id IN (SELECT mint_id FROM phase2_mints WHERE wallet_address = ?)
`).bind(wallet, wallet, wallet, wallet).first();

// 4. Top performer
const topNft = await env.DB.prepare(`
  SELECT ws.nft_id, ws.edition_number, ws.net_score, ws.total_votes,
         COALESCE(nn.custom_name, nn.full_name, 'Your Wojak #' || ws.edition_number) as name
  FROM wojak_scores ws
  LEFT JOIN nft_names nn ON ws.edition_number = nn.edition_number
  WHERE ws.creator_wallet = ?
  ORDER BY ws.net_score DESC LIMIT 1
`).bind(wallet).first();
```

**Frontend:**

1. Add `CreatorStatsCard` component to `/swipe/dashboard`:
   - Only visible if player has minted at least 1 NFT
   - Shows summary stats in a compact card
   - "View all" link to a detailed creator stats view (future)

**Estimated effort:** Medium (1 new endpoint, 1 new component)

---

## Feature 6: Swipe Game → Profile Integration

**Priority:** Low-Medium — connects the Swipe game to the broader wojak.ink ecosystem

### What

Display Swipe game stats on the existing profile system. When someone views a player's profile at `/profile/:userId`, they see their Swipe game stats alongside their other game scores.

### Design

On the profile page, add a "Wojak Swipe" section:
```
Wojak Swipe
─────────────────
Power Level: 1,234 ⚡
Rank: #5
Votes Cast: 147
Battles: 8W - 3L - 2D
Vote Streak: 🔥 12 days
Credits: 85
```

### Implementation

**Backend:** The profile endpoint (`GET /api/profile/:userId`) already aggregates data from multiple sources. Add a Swipe game stats section:

```ts
// In the profile handler, if the user has a DID:
const gamePlayer = await env.DB.prepare(
  'SELECT power_level, total_votes_cast, vote_streak, vote_streak_longest FROM game_players WHERE wallet_address = ?'
).bind(walletAddress).first();

// Add to profile response:
if (gamePlayer) {
  profile.swipeStats = {
    powerLevel: gamePlayer.power_level,
    totalVotes: gamePlayer.total_votes_cast,
    voteStreak: gamePlayer.vote_streak,
    longestStreak: gamePlayer.vote_streak_longest,
  };
}
```

**Frontend:** In the profile page component, add a SwipeStatsSection that renders these stats with appropriate icons and layout.

**Estimated effort:** Small (add query to existing endpoint, add section to existing page)

---

## Feature 7: Credit Shop Items for Swipe

**Priority:** Low — engagement through spending

### What

Add Swipe-specific items to the existing shop that can be purchased with credits earned from burns and streaks. Items could include:

1. **Extra Daily Votes** — Buy 5 additional votes for 10 credits (1-day boost)
2. **Battle Shield** — Prevent one of your NFTs from being challenged for 24h (5 credits)
3. **Score Boost** — Next 5 votes you cast count as 2 each for the NFT's score (15 credits)
4. **Custom Battle Duration** — Set your next battle to 48h instead of 24h (8 credits)

### Implementation

This leverages the existing `shop_items` table and purchase flow. Add new rows to `shop_items` with `category = 'swipe'`:

```sql
INSERT INTO shop_items (name, description, category, price_oranges, price_gems, rarity, item_type)
VALUES
  ('Extra Votes', '5 additional votes today', 'swipe', 1000, 0, 'common', 'consumable'),
  ('Battle Shield', 'Protect an NFT from battles for 24h', 'swipe', 500, 0, 'uncommon', 'consumable'),
  ('Score Boost', 'Double your next 5 vote impacts', 'swipe', 1500, 0, 'rare', 'consumable');
```

Note: The credit-to-oranges conversion needs to be defined. Credits (x100 units) and oranges are separate currencies. Either:
- Credits can be spent directly (add credit spending to shop)
- Credits convert to oranges at a fixed rate (e.g., 100 credits = 1 orange)

**This feature requires design decisions about the economy. Recommend discussing with the user before implementing.**

**Estimated effort:** Medium-Large (shop integration, consumable item logic, economy design)

---

## Feature 8: Social Voting — Friend Activity

**Priority:** Low — nice-to-have social pressure

### What

Show when friends vote or battle. "Your friend @handle just voted on Wojak #42" in a subtle feed on the voting page.

### Implementation

This requires either:
- Polling: `GET /api/game/friend-activity?did=&since=<timestamp>` — queries `game_activity` joined with `friends` table
- Or: A simple "Friends Also Voted" section on the PostRoundSummary

**Recommended approach:** Start with the simpler PostRoundSummary integration — after completing a round of 10 votes, show "2 friends also voted today" with their names. This requires a single query:

```sql
SELECT gp.did_id, gp.votes_today
FROM game_players gp
JOIN friends f ON f.friend_id = (SELECT id FROM users WHERE wallet_address = gp.wallet_address)
WHERE f.user_id = ? AND gp.votes_today > 0 AND gp.votes_today_reset = ?
```

**Estimated effort:** Small (1 query, 1 UI addition to PostRoundSummary)

---

## Execution Priority

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|--------------|
| **P1** | Feature 1: Activity Feed Page | Small | Phase 4 event banner fix |
| **P1** | Feature 2: Battle History | Small-Med | Phase 4 battle fixes |
| **P2** | Feature 3: NFT Naming | Small | `nft_names` table exists |
| **P2** | Feature 4: Vote Streaks | Medium | Migration needed |
| **P2** | Feature 5: Creator Stats | Medium | `wojak_scores` exists |
| **P3** | Feature 6: Profile Integration | Small | Feature 4 (for streak data) |
| **P3** | Feature 7: Credit Shop Items | Med-Large | Economy design needed |
| **P3** | Feature 8: Social Friend Activity | Small | Friends system exists |

### Suggested Execution Order

1. **Activity Feed Page** — simplest, highest visibility, builds on existing endpoint
2. **Battle History** — small scope, completes the battle experience
3. **NFT Naming** — 1 new endpoint, uses existing table columns
4. **Vote Streaks** — requires migration but high engagement value
5. **Creator Stats** — aggregation queries, reward creators
6. **Profile Integration** — wires Swipe into the broader platform
7. **Friend Activity** — social pressure, simple addition
8. **Credit Shop** — complex, save for later

---

## Database Migrations Needed

```sql
-- Migration: NNN_phase5_streaks.sql

-- Vote streak tracking
ALTER TABLE game_players ADD COLUMN vote_streak INTEGER DEFAULT 0;
ALTER TABLE game_players ADD COLUMN vote_streak_last_date TEXT;
ALTER TABLE game_players ADD COLUMN vote_streak_longest INTEGER DEFAULT 0;
```

No other migrations needed — `nft_names.custom_name`, `game_activity`, `friends`, `shop_items`, and `credit_events` all exist.

---

## Non-Goals for Phase 5

- Real-time WebSocket features (battles, live leaderboard) — too complex, save for Phase 6
- Direct messaging between players — out of scope for Swipe game
- Guild integration — existing guild system not complete enough
- Push notifications — templates exist but wiring is a larger project
- Economy design (credit → orange conversion) — needs product decision
