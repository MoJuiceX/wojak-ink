# Free Voting for Everyone — Open the Vote Tab

---

## Overview

Currently voting requires Phase 1 verification (owning a Farmers Plot NFT). This locks out new users entirely. We want everyone to be able to vote — it's free engagement, real data collection, and hooks people before they buy.

**New tiers:**
- **Guest (no wallet):** 5 votes/day, no Power earned, no credits
- **Connected (wallet, no Farmers Plot):** 5 votes/day, no Power earned, no credits
- **Holder (has Farmers Plot):** 20 votes/day, earns Power, earns credits + streaks

---

## Task 1: Update Vote API — Allow Unverified Voters

**File:** `functions/api/game/vote.ts`

Currently the vote endpoint checks `phase1_verified = 1` and returns 403 if not. Change this:

### New Logic:

```
IF voter has no player record AND no voterDid:
  → Allow vote with "guest" mode (track by IP or session)
  → Daily limit: 5
  → No power/score update to combat_fighters
  → Still update wojak_scores (likes/dislikes count)
  → Still insert into wojak_votes (use a guest DID like "guest_<ip_hash>")

IF voter has player record BUT phase1_verified = 0:
  → Allow vote
  → Daily limit: 5
  → No power/score update to combat_fighters
  → Still update wojak_scores
  → No credits, no streak tracking

IF voter has player record AND phase1_verified = 1:
  → Existing behavior (20 votes/day, power updates, credits, streaks)
```

### Concrete Changes:

1. Remove the 403 for unverified players. Instead, set a flag `isHolder = player?.phase1_verified === 1`.

2. Change daily vote limit:
```typescript
const DAILY_LIMIT_HOLDER = 20;
const DAILY_LIMIT_FREE = 5;
const dailyLimit = isHolder ? DAILY_LIMIT_HOLDER : DAILY_LIMIT_FREE;
```

3. Conditionally skip power updates:
```typescript
// Only update combat_fighters power if holder
if (isHolder) {
  // existing power update logic
  await env.DB.prepare(`UPDATE combat_fighters SET vote_power = vote_power + ?, power_score = power_score + ? ...`).bind(...).run();
}
```

4. Conditionally skip credit tracking:
```typescript
// Only award credits and track streaks for holders
if (isHolder) {
  // existing streak + credit logic
}
```

5. Always update `wojak_scores` (vote counts) regardless of tier.

6. For guests without a DID, accept an optional `guestId` field. The frontend will generate a stable guest ID stored in localStorage. Validate format: `guest_[a-z0-9]{16}`.

7. Rate limit guests by IP (existing behavior for registration endpoint), holders by DID.

---

## Task 2: Update Feed API — Allow Unauthenticated Access

**File:** `functions/api/game/feed.ts`

Currently the feed requires a `did` parameter and checks `phase1_verified`. Change:

1. Make `did` parameter optional.
2. If no DID provided, skip the self-voting exclusions (no holdings to check).
3. If no DID provided, skip the 24h cooldown exclusion (use guestId from query param instead, or return all).
4. Still apply the weighted random selection algorithm.
5. Return the same feed format.

```typescript
// GET /api/game/feed?did=<optional>&guestId=<optional>&limit=10
const did = url.searchParams.get('did');
const guestId = url.searchParams.get('guestId');
const voterId = did || guestId || null;

// If voterId exists, exclude recently voted NFTs (24h)
// If no voterId, return unfiltered feed
```

---

## Task 3: Update Frontend — Remove Gate for Voting

**File:** `src/components/game/VotingFeed.tsx`

The VotingFeed currently shows a `GateChecklist` that blocks everything until Phase 1 is verified. Change:

1. If user has no wallet connected, show the voting feed directly with a guest experience.
2. Generate a `guestId` in localStorage if none exists:
```typescript
function getGuestId(): string {
  let id = localStorage.getItem('wojak_guest_id');
  if (!id) {
    id = 'guest_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    localStorage.setItem('wojak_guest_id', id);
  }
  return id;
}
```

3. Pass `guestId` to feed and vote APIs when no DID is available.

4. Show a subtle banner above the voting cards for non-holders:
```tsx
{!isHolder && (
  <div className="card-static p-3 flex items-center gap-3 mb-4"
    style={{ borderLeft: '3px solid var(--color-primary)' }}>
    <span className="text-sm text-secondary">
      <strong className="text-primary">{votesRemaining}</strong> free votes remaining today.
      {' '}
      <Link to="/fight-club" className="text-primary underline">
        Get a Farmers Plot
      </Link>
      {' '}for 20 votes/day + Power rewards.
    </span>
  </div>
)}
```

5. Remove or bypass the GateChecklist for the voting flow. The gate should only block Battle and Burn tabs, not Vote.

---

## Task 4: Update Fight Club Page — Open Vote Tab

**File:** `src/pages/FightClub.tsx`

Currently the entire Fight Club is behind the access gate. Change so that the Vote tab is accessible without a Farmers Plot:

```tsx
// Instead of blocking the entire page, only gate Battle and Burn tabs
if (!accessData?.hasAccess) {
  // If on vote or rankings tab, still show content
  if (activeTab === 'vote' || activeTab === 'rankings') {
    // Render the tab bar + content normally
    // But show upgrade banner instead of gate
  } else {
    return <FightClubGate />;
  }
}
```

Better approach — restructure the gating logic:

```tsx
const needsGate = !accessData?.hasAccess && (activeTab === 'battle' || activeTab === 'burn');

if (needsGate) {
  return <FightClubGate />;
}

// Otherwise render normally — vote and rankings are open
```

Also: when wallet is not connected, still show the tab bar and allow Vote + Rankings. Only show ConnectWalletPrompt when trying to access Battle or Burn.

```tsx
// Remove the blanket wallet check at the top
// Instead, check per-tab:
const needsWallet = !isWalletConnected && (activeTab === 'battle' || activeTab === 'burn');
if (needsWallet) {
  return <ConnectWalletPrompt />;
}
```

---

## Task 5: Update GameContext — Support Guest Voting

**File:** `src/contexts/GameContext.tsx`

The GameContext manages voting state. Update it:

1. Add `guestId` state alongside `player`:
```typescript
const [guestId] = useState(() => getGuestId());
```

2. Update `castVote` to use guestId when no player DID:
```typescript
const castVote = useCallback(async (nftId: string, editionNumber: number, voteType: 1 | -1) => {
  const voterId = player?.did || guestId;
  const res = await fetch('/api/game/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voterDid: player?.did || null,
      guestId: player?.did ? null : guestId,
      nftId,
      editionNumber,
      voteType,
    }),
  });
  // ...
}, [player, guestId]);
```

3. Update `loadFeed` to pass guestId:
```typescript
const feedUrl = player?.did
  ? `/api/game/feed?did=${encodeURIComponent(player.did)}&limit=10`
  : `/api/game/feed?guestId=${encodeURIComponent(guestId)}&limit=10`;
```

---

## Task 6: Guest Vote Storage

**File:** `functions/api/game/vote.ts`

For guest votes (no DID), store with guestId as the voter identifier:

```sql
INSERT INTO wojak_votes (voter_did, nft_id, edition_number, vote_type, created_at)
VALUES (?, ?, ?, ?, datetime('now'))
ON CONFLICT (voter_did, nft_id) DO UPDATE SET
  vote_type = excluded.vote_type,
  created_at = excluded.created_at
```

Use guestId as `voter_did` for guests. The format `guest_[a-z0-9]{16}` won't collide with real DIDs which start with `did:chia:1`.

Track daily votes for guests in the same `game_players` table by creating a lightweight guest record:
```sql
INSERT OR IGNORE INTO game_players (did, wallet_address, votes_today, votes_today_reset, phase1_verified)
VALUES (?, 'guest', 0, date('now'), 0)
```

Or simpler: track guest daily votes via the `rate_limits` table with a daily window.

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| `vote.ts` | Accept guestId, remove phase1 gate, tier-based limits (5 free / 20 holder) |
| `feed.ts` | Make DID optional, accept guestId for cooldown tracking |
| `VotingFeed.tsx` | Remove GateChecklist for voting, show free tier banner |
| `FightClub.tsx` | Only gate Battle + Burn tabs, Vote + Rankings open to all |
| `GameContext.tsx` | Support guest voting with localStorage guestId |

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Do NOT change the daily limit for holders (keep it at existing value, which might be 10 — check the code. If it's 10, bump to 20 as per this spec)
- Guest votes still count toward wojak_scores (real engagement data)
- Guest votes do NOT affect combat_fighters power or credits
