# Wojak Swipe Phase 4 — CLI Execution Prompt

> Full spec with research, code samples, and rationale: `docs/specs/wojak-swipe-phase4.md`
> Read the full spec BEFORE starting. This handoff is the execution order.

---

## CRITICAL CONTEXT

### Canonical Collection IDs (verified from MintGarden URLs)

```
Wojak Farmers Plot (Phase 1):  col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
Your Wojak (Phase 2):          col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx
```

These are the ONLY correct IDs. Any other value is wrong.

### Anti-patterns (from CLAUDE.md)
- Never self-fetch own API endpoints
- Never `!important` in CSS
- Use `var(--color-*)` for colors, Tailwind for layout only
- Use theme classes: `.card`, `.card-static`, `.btn`, `.btn-primary`, `.badge`, etc.

---

## EXECUTION ORDER

Do these in exact order. Each blocker must be committed before moving to the next. Run `npx tsc -b` after each commit to catch type errors early.

---

### BLOCKER A: Fix collection IDs (3 files)

**The DID indexer and game shared constants have wrong/bogus collection IDs. Nothing in the game system works until this is fixed.**

1. Edit `workers/did-indexer/worker.ts` lines 11-12:
```ts
const PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';
```

2. Edit `functions/api/game/_shared.ts` line 4:
```ts
export const PHASE1_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'; // Wojak Farmers Plot
```

3. Also add the Phase 2 ID to `_shared.ts` so other game endpoints can use it:
```ts
export const PHASE2_COLLECTION_ID = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx'; // Your Wojak
```

4. After committing, wipe the corrupted `did_holdings` data (all existing rows have wrong collection labels):
```bash
npx wrangler d1 execute wojak-users --remote --command "DELETE FROM did_holdings;"
```

**Commit:** `fix(critical): correct collection IDs in game system — DID indexer and verify-phase1 were querying wrong/nonexistent collections`

---

### BLOCKER B: Fix nftCoinId in burn flow

**`CollectionScroll.tsx` line 85 passes `nftCoinId={nft.nftId}` which is the MintGarden launcher_id, NOT the on-chain coin ID. Burns will fail.**

1. First, test the MintGarden API to find the correct field name:
```bash
curl -s https://api.mintgarden.io/nfts/$(curl -s 'https://api.mintgarden.io/nfts?collection_id=col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx&size=1' | jq -r '.items[0].id') | jq 'keys'
```
Look for: `nft_coin_id`, `coin_id`, `encoded_id`, or similar.

2. In `src/components/game/CollectionScroll.tsx`, update `NftDetailModal` to fetch the coin ID on-demand when the user clicks Burn. Do NOT pass `nft.nftId` as `nftCoinId`. Instead:

- Add state: `const [coinId, setCoinId] = useState<string | null>(null);` and `const [loadingCoinId, setLoadingCoinId] = useState(false);`
- Add a `handleBurnClick` that fetches `https://api.mintgarden.io/nfts/${nft.nftId}` and extracts the coin ID field
- Show the real `<BurnButton>` only after `coinId` is loaded. Before that, show a "Burn" button that triggers the fetch.
- See `docs/specs/wojak-swipe-phase3.md` section 1 for the full code pattern.

**Commit:** `fix(critical): fetch real nftCoinId from MintGarden before burn — was passing launcher_id which breaks transferNFT`

---

### BLOCKER C: Deduplicate battle resolution

**`workers/did-indexer/worker.ts` has an inline `resolveBattles()` function (lines 186-267) that duplicates `functions/api/game/battle-resolve.ts`. Remove it from the indexer.**

1. In `workers/did-indexer/worker.ts`:
   - Remove the `resolveBattles()` function entirely (lines ~186-267)
   - Remove the `MIN_BATTLE_VOTES` constant (line ~186)
   - Remove the `await resolveBattles(env);` call in `run()` (line ~60)

2. If `workers/battle-cron/` exists from Phase 3, verify it POSTs to `https://wojak.ink/api/game/battle-resolve` (the Pages Function) rather than containing its own resolution logic.

**Commit:** `fix: remove duplicate battle resolution from DID indexer — use battle-resolve.ts as single source`

---

### Task 1: Power level recalc + collection refresh after burn

In `src/components/game/CollectionScroll.tsx`:

1. Destructure `refreshPowerLevel` from `useGame()` in `NftDetailModal`
2. Update the `onBurned` callback to call `refreshPowerLevel()` AND trigger a collection re-fetch
3. Add a `refreshKey` state to `CollectionScroll` and pass a refresh callback to the modal:

```tsx
// In CollectionScroll:
const [refreshKey, setRefreshKey] = useState(0);

// In useEffect deps:
useEffect(() => { /* existing fetch */ }, [did, refreshKey]);

// Pass to modal:
<NftDetailModal nft={selectedNft} onClose={() => setSelectedNft(null)} onBurned={() => setRefreshKey(k => k + 1)} />
```

And in `NftDetailModal`, update `onBurned` to also call `refreshPowerLevel()`:
```tsx
const { player, refreshPowerLevel } = useGame();
// ...
onBurned={() => { onClose(); refreshPowerLevel(); onBurnedProp?.(); }}
```

**Commit:** `fix: recalculate power level and refresh collection after burn`

---

### Task 2: Fix LatestEventBanner event types

In `src/components/game/LatestEventBanner.tsx`:

The backend logs `battle_won`, `battle_lost`, `battle_draw` — but the banner only handles `battle_result` (which never gets logged). Update:

1. Replace `EVENT_ICONS` — add `battle_won`, `battle_lost`, `battle_draw` (all use Swords), remove `battle_result`
2. Replace `EVENT_LINKS` — same additions, all link to `/swipe/battles`
3. Rewrite `formatEvent()`:
   - `battle_won`: `Won battle! (${data.votes}-${data.opponentVotes} votes)`
   - `battle_lost`: `Lost battle (${data.votes}-${data.opponentVotes} votes)`
   - `battle_draw`: `Battle ended in a draw`
   - `vote_milestone`: check `data.milestone === 'first_vote'` → `Cast your first vote!`, else `Reached ${data.count} total votes`
   - `burn`: `Burned Wojak #${data.editionNumber} (+${Math.floor((data.creditsEarned as number) / 100)} credits)`

See full code sample in `docs/specs/wojak-swipe-phase4.md` section 3.

**Commit:** `fix: align LatestEventBanner with actual game_activity event types`

---

### Task 3: Image fallback for MintGarden thumbnails

Add `onError` handlers to all MintGarden thumbnail images. Use an inline SVG data URI as fallback (no need for a separate file):

```tsx
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%2312121a'%3E%3Crect width='200' height='200' rx='14'/%3E%3Ctext x='100' y='108' text-anchor='middle' fill='%23606070' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";

// Usage on every MintGarden img:
onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
```

Files to update (add `onError` to every `<img>` with `assets.mintgarden.io`):
- `src/components/game/SwipeCard.tsx` — the main card image
- `src/components/game/CollectionScroll.tsx` — thumbnail images AND modal image
- `src/components/game/ActiveBattleCard.tsx` — both battle NFT images

**Commit:** `fix: add image fallback for MintGarden thumbnail failures`

---

### Task 4: Vote failure feedback

In `src/components/game/VotingFeed.tsx`, the `castVote()` call on line 162 is fire-and-forget with no error handling. Add a `.then()/.catch()` chain:

```tsx
// Replace line 162:
castVote(currentItem.nftId, currentItem.editionNumber, voteType)
  .then(ok => { if (!ok) toast.error('Vote failed to save'); })
  .catch(() => toast.error('Vote failed to save'));
```

`toast` is already available via `useToast()` (imported on line 8).

**Commit:** `fix: show toast when vote fails to save`

---

### Task 5: Burn error feedback

In `src/components/game/BurnButton.tsx`:

1. Add error state: `const [error, setError] = useState<string | null>(null);`
2. In `handleBurn` catch block (line 51), add: `setError('Burn failed. Your NFT was not destroyed.');`
3. Pass `error` to `BurnConfirmDialog` or render it inside the BurnButton component after the dialog
4. Clear error when dialog opens: `onClick={() => { setShowConfirm(true); setError(null); }}`

**Commit:** `fix: show error message when burn fails`

---

### Task 6: CollectionScroll error state

In `src/components/game/CollectionScroll.tsx`:

1. Add: `const [error, setError] = useState(false);`
2. In the fetch `.catch()` (line 112), change from `() => { /* silent */ }` to `() => { setError(true); }`
3. Add error render between the loading and empty checks:
```tsx
if (error) {
  return (
    <div id="collection-section" className="flex flex-col gap-2">
      <span className="text-secondary" style={{ fontSize: 14, fontWeight: 500 }}>Your Collection</span>
      <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
        <span style={{ color: 'var(--color-error)' }}>Couldn't load collection.</span>
        <button className="text-accent" style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => { setError(false); setLoading(true); }}>
          Retry
        </button>
      </div>
    </div>
  );
}
```
Note: the retry button sets `loading` true but doesn't re-trigger the fetch. You need to also depend on `refreshKey` or add a retry counter to the useEffect deps to re-trigger.

**Commit:** `fix: show error state with retry when collection fails to load`

---

### Task 7: Add rank + credits to power-level response

In `functions/api/game/power-level.ts`, after the powerLevel calculation (around line 116), before the response:

```ts
// Calculate rank
const rankResult = await context.env.DB.prepare(
  'SELECT COUNT(*) as above FROM game_players WHERE power_level > ?'
).bind(powerLevel).first();
const rank = ((rankResult?.above as number) || 0) + 1;

// Get total credits
const creditsResult = await context.env.DB.prepare(
  'SELECT COALESCE(SUM(credits_earned), 0) as total FROM credit_events WHERE wallet_address = ?'
).bind(player.wallet_address).first();
const credits = (creditsResult?.total as number) || 0;
```

Add `rank` and `credits` to the response JSON (line 125).

**Commit:** `feat: include rank and credits in power-level API response`

---

### Task 8 (optional): Feed append instead of replace

In `src/contexts/GameContext.tsx`, change `loadFeed` (line 98) from `setFeed(data.feed)` to:

```tsx
setFeed(prev => {
  const existingIds = new Set(prev.map(item => item.nftId));
  const newItems = data.feed.filter((item: FeedItem) => !existingIds.has(item.nftId));
  return [...prev, ...newItems];
});
```

**Commit:** `fix: append new feed items instead of replacing to prevent flicker`

---

### Task 9 (optional): Remove misleading vote undo

The undo feature in `VotingFeed.tsx` only changes local counters — the backend vote is already recorded. It's misleading. Remove it:

1. `VotingFeed.tsx`: Remove `undoUsed` state, `lastVote` state, `handleUndo` callback, and the undo-related tracking in `handleVote`
2. `VoteButtons.tsx`: Remove the undo button and `onUndo`/`undoAvailable` props
3. Keep the `VoteButtons` interface simple: just `onLike`, `onDislike`, `disabled`

**Commit:** `chore: remove UI-only vote undo to avoid misleading users`

---

## FINAL VERIFICATION

After all tasks:
```bash
npx tsc -b && npm run build
```

Both must pass clean. If there are type errors, fix them before considering the phase complete.

---

## DEPLOY CHECKLIST

After all code changes are committed:

1. **Redeploy DID indexer** (collection IDs changed):
```bash
cd workers/did-indexer && npx wrangler deploy
```

2. **Verify database tables exist** (if not already done in Phase 3):
```bash
npx wrangler d1 execute wojak-users --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'game_%' OR name LIKE 'battle%' OR name LIKE 'wojak%' OR name = 'did_holdings' OR name = 'nft_names') ORDER BY name;"
```

3. **Deploy battle-cron worker** (if it exists from Phase 3):
```bash
cd workers/battle-cron && npx wrangler deploy
```

4. **Deploy Pages** (frontend + API):
```bash
npm run build && npx wrangler pages deploy dist
```
