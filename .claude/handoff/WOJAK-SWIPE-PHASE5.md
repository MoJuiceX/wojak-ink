# Wojak Swipe Phase 5 — CLI Execution Prompt

> Full spec with rationale and design: `docs/specs/wojak-swipe-phase5.md`
> Read the full spec BEFORE starting. This handoff is the execution order.

---

## CRITICAL CONTEXT

### Dependencies
- Phase 4 must be complete and passing smoke tests
- DID Indexer Hardening should be deployed (separate handoff)

### Anti-patterns (from CLAUDE.md)
- Never `!important` in CSS
- Use `var(--color-*)` for colors, Tailwind for layout only
- Use theme classes: `.card`, `.card-static`, `.btn`, `.btn-primary`, `.badge`
- Never self-fetch own API endpoints
- Never change schema without a migration file

### Canonical Collection IDs
```
Wojak Farmers Plot (Phase 1): col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
Your Wojak (Phase 2):         col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx
```

---

## EXECUTION ORDER

Do these in order. Run `npx tsc -b` after each commit.

---

### Task 1: Extract shared event formatting utility

**Why:** `LatestEventBanner.tsx` has event formatting logic that the new Activity Feed page also needs. Extract it before building the page.

1. Create `src/lib/gameEvents.ts`:
   - Move `formatEvent()` from `LatestEventBanner.tsx`
   - Move `EVENT_ICONS` and `EVENT_LINKS` maps
   - Export all three

2. Update `LatestEventBanner.tsx` to import from `src/lib/gameEvents.ts`

3. Verify the banner still works.

**Commit:** `refactor: extract game event formatting to shared utility`

---

### Task 2: Activity Feed Page

1. Add `offset` parameter support to `functions/api/game/activity.ts` (if not already present):
   ```ts
   const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
   // In query: LIMIT ? OFFSET ?
   ```

2. Create `src/pages/GameActivity.tsx`:
   - Wrap in `<GameProvider>` + `<SwipeAutoRegister>` (same as other swipe pages)
   - Gate check: if no player, show GateChecklist
   - Fetch `GET /api/game/activity?did=&limit=20&offset=0`
   - Render each event using `formatEvent()` from `src/lib/gameEvents.ts`
   - Each event shows: icon, formatted text, relative timestamp (e.g. "2 hours ago")
   - "Load More" button increments offset
   - Loading state: skeleton cards
   - Empty state: "No activity yet. Start voting!" with link to `/swipe`
   - Error state: "Couldn't load activity" with Retry button

3. Add route in `App.tsx`: `/swipe/activity` → lazy import `GameActivity`

4. Update `LatestEventBanner.tsx`: add "View all →" link to `/swipe/activity`

5. Add navigation link in the swipe nav (wherever `/swipe/dashboard`, `/swipe/battles`, `/swipe/leaderboard` links are)

**Commit:** `feat: add activity feed page at /swipe/activity`

---

### Task 3: Battle History Tab

1. In `functions/api/game/battle-list.ts`:
   - Add support for `?status=history` that queries `WHERE status IN ('completed', 'draw')`
   - Order by `resolved_at DESC`
   - Add `offset` parameter for pagination

2. In the battles page (`src/pages/GameBattles.tsx` or wherever `BattleView` lives):
   - Add tab toggle: "Active" / "History" (using `.btn` classes, highlight active tab)
   - Active tab: existing battle list
   - History tab: fetch `GET /api/game/battle-list?did=&status=history&limit=10`
   - Render historical battles showing:
     - Both NFT thumbnails (with `onError` fallback)
     - Winner badge (trophy icon on winning side)
     - "Won" / "Lost" / "Draw" badge on player's side
     - Vote counts (e.g. "12-5")
     - Resolved date
   - "Load More" button for pagination
   - Empty state: "No battle history yet"

3. Consider reusing `ActiveBattleCard` component with a `mode` prop, or create a simpler `BattleHistoryCard`.

**Commit:** `feat: add battle history tab to /swipe/battles`

---

### Task 4: NFT Naming

1. Create `functions/api/game/nft-name.ts`:

   ```ts
   // POST /api/game/nft-name
   // Body: { did: string, editionNumber: number, name: string }

   // Validation:
   // - DID is valid (isValidDid)
   // - Player is registered
   // - Player owns this NFT (check did_holdings WHERE did_id = ? AND edition_number = ? AND collection = 'phase2')
   // - Name: 1-30 chars, /^[a-zA-Z0-9 .,!?'-]+$/
   // - Basic blocklist check (optional, can skip for v1)

   // Write:
   // INSERT INTO nft_names (edition_number, custom_name) VALUES (?, ?)
   // ON CONFLICT(edition_number) DO UPDATE SET custom_name = ?
   ```

2. In `CollectionScroll.tsx` → `NftDetailModal`:
   - Show current name (custom_name or default "Your Wojak #N")
   - Add pencil icon button next to name
   - On click: inline text input appears (replace name text with input)
   - Enter key or blur: `POST /api/game/nft-name`
   - Escape key: cancel edit
   - On success: update local state with new name
   - On error: show error text, revert to old name

**Commit:** `feat: allow players to name their Phase 2 NFTs`

---

### Task 5: Vote Streaks

1. Create migration `functions/migrations/NNN_vote_streaks.sql`:
   ```sql
   ALTER TABLE game_players ADD COLUMN vote_streak INTEGER DEFAULT 0;
   ALTER TABLE game_players ADD COLUMN vote_streak_last_date TEXT;
   ALTER TABLE game_players ADD COLUMN vote_streak_longest INTEGER DEFAULT 0;
   ```

2. Run migration:
   ```bash
   npx wrangler d1 execute wojak-users --remote --file functions/migrations/NNN_vote_streaks.sql
   ```

3. In `functions/api/game/vote.ts`, after the 10th vote (`votesRemaining === 0`):
   - Read current streak from player
   - Calculate new streak (see spec §4 for exact logic)
   - Update `vote_streak`, `vote_streak_last_date`, `vote_streak_longest`
   - Award milestone credits at days 3, 7, 14, 30, 100
   - Log `streak_milestone` to `game_activity`

4. Add helper to `_shared.ts`:
   ```ts
   export function getYesterdayString(): string {
     const d = new Date();
     d.setDate(d.getDate() - 1);
     return d.toISOString().split('T')[0];
   }
   ```

5. Include `voteStreak` in the `POST /api/game/register` and `GET /api/game/power-level` responses.

6. In `PostRoundSummary.tsx`: show streak info after the 10th vote.

7. In `PowerLevelDisplay.tsx` or dashboard: show current streak.

8. Update `formatEvent()` in `src/lib/gameEvents.ts` to handle `streak_milestone` event type.

**Commit:** `feat: add vote streak tracking with milestone credits`

---

### Task 6: Creator Stats

1. Create `functions/api/game/creator-stats.ts`:

   ```ts
   // GET /api/game/creator-stats?wallet=xch1...
   // Returns: minted count, total votes, avg score, battle record, top NFT
   ```

   See spec Feature 5 for the exact queries.

2. Create `src/components/game/CreatorStatsCard.tsx`:
   - Compact card showing creator metrics
   - Only rendered if player has minted ≥ 1 NFT
   - Use `.card` class, theme colors

3. Add `CreatorStatsCard` to `GameDashboard.tsx` (after CollectionScroll, before OnboardingChecklist).

**Commit:** `feat: add creator stats card to swipe dashboard`

---

## FINAL VERIFICATION

```bash
npx tsc -b && npm run build
```

Both must pass clean.

---

## DEPLOY

```bash
npm run build && npx wrangler pages deploy dist
```

Test each new route:
- `https://wojak.ink/swipe/activity`
- `https://wojak.ink/swipe/battles` (History tab)
- NFT naming in collection modal
- Vote streak display after 10th vote
- Creator stats on dashboard
