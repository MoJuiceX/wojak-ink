# Swipe UX Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Wojak Swipe into a cohesive game by adding NFT profile pages, removing DIDs from UI, adding sub-navigation, making NFTs clickable, adding battle history, improving empty states, and streamlining onboarding.

**Architecture:** Seven mostly-independent UI changes built on top of one new API endpoint (`/api/game/wojak/:edition`), one API modification (`top-wojaks.ts` adding `ownerWallet`), one new page component (`WojakProfile.tsx`), one new nav component (`SwipeNav.tsx`), and targeted edits to ~12 existing components. Each task is self-contained and can be verified independently.

**Tech Stack:** React 18, React Router 6, TypeScript, Cloudflare Pages Functions, D1 SQLite, Vite, Tailwind (layout only), theme.css (all visuals).

**Design doc:** `docs/plans/2026-02-18-swipe-ux-overhaul-design.md`

---

## Task 1: NFT Profile API Endpoint

Create `GET /api/game/wojak/:edition` — returns all data for a single NFT's profile page.

**Files:**
- Create: `functions/api/game/wojak/[edition].ts`

**Step 1: Create the API endpoint**

Create `functions/api/game/wojak/[edition].ts`:

```ts
// GET /api/game/wojak/:edition — NFT profile data.

interface Env {
  DB: D1Database;
}

function resolveImageUri(raw: string | null): string {
  if (!raw) return '';
  if (raw.startsWith('[')) {
    try {
      const urls = JSON.parse(raw) as string[];
      return urls.find(u => u.startsWith('https://')) || urls[0] || '';
    } catch { return raw; }
  }
  return raw;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const edition = parseInt(context.params.edition as string);
    if (isNaN(edition) || edition < 1) {
      return Response.json({ error: 'Invalid edition number' }, { status: 400 });
    }

    // NFT core data: phase2_mints + nft_names + wojak_scores + did_holdings + game_players
    const nft = await context.env.DB.prepare(`
      SELECT
        dh.nft_id,
        dh.edition_number,
        dh.did_id AS owner_did,
        dh.creator_wallet,
        nn.custom_name,
        nn.full_name,
        ws.likes,
        ws.dislikes,
        ws.net_score,
        ws.total_votes,
        pm.ipfs_image_uri,
        gp.wallet_address AS owner_wallet
      FROM did_holdings dh
      LEFT JOIN nft_names nn ON dh.edition_number = nn.edition_number
      LEFT JOIN wojak_scores ws ON dh.nft_id = ws.nft_id
      LEFT JOIN phase2_mints pm ON dh.edition_number = pm.mint_number
      LEFT JOIN game_players gp ON dh.did_id = gp.did_id
      WHERE dh.edition_number = ? AND dh.collection = 'phase2'
      LIMIT 1
    `).bind(edition).first();

    if (!nft) {
      // Fallback: try phase2_mints directly (NFT might not be in did_holdings yet)
      const mint = await context.env.DB.prepare(`
        SELECT pm.mint_number, pm.wallet_address, pm.ipfs_image_uri, pm.mintgarden_launcher_id,
               nn.custom_name, nn.full_name,
               ws.likes, ws.dislikes, ws.net_score, ws.total_votes
        FROM phase2_mints pm
        LEFT JOIN nft_names nn ON pm.mint_number = nn.edition_number
        LEFT JOIN wojak_scores ws ON pm.mintgarden_launcher_id = ws.nft_id
        WHERE pm.mint_number = ? AND pm.status = 'minted'
        LIMIT 1
      `).bind(edition).first();

      if (!mint) {
        return Response.json({ error: 'NFT not found' }, { status: 404 });
      }

      const customName = (mint.custom_name as string) || null;
      const baseName = `Your Wojak #${edition}`;
      return Response.json({
        success: true,
        nft: {
          nftId: mint.mintgarden_launcher_id || null,
          edition,
          name: customName || baseName,
          customName,
          fullName: (mint.full_name as string) || baseName,
          imageUri: resolveImageUri(mint.ipfs_image_uri as string | null),
          ownerWallet: (mint.wallet_address as string) || null,
          ownerDid: null,
          creatorWallet: (mint.wallet_address as string) || null,
        },
        scores: {
          likes: (mint.likes as number) || 0,
          dislikes: (mint.dislikes as number) || 0,
          netScore: (mint.net_score as number) || 0,
          totalVotes: (mint.total_votes as number) || 0,
        },
        battles: { total: 0, wins: 0, losses: 0, draws: 0, history: [] },
        sales: [],
      });
    }

    const nftId = nft.nft_id as string;
    const customName = (nft.custom_name as string) || null;
    const baseName = `Your Wojak #${edition}`;

    // Battle history for this NFT
    const battleResults = await context.env.DB.prepare(`
      SELECT b.id, b.nft_a_id, b.nft_a_edition, b.nft_b_id, b.nft_b_edition,
             b.status, b.winner_nft_id, b.resolved_at,
             b.nft_a_score_start, b.nft_b_score_start,
             b.nft_a_score_end, b.nft_b_score_end,
             na.full_name AS name_a, nb.full_name AS name_b
      FROM battles b
      LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
      LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
      WHERE (b.nft_a_id = ? OR b.nft_b_id = ?)
        AND b.status IN ('completed', 'draw')
      ORDER BY b.resolved_at DESC
      LIMIT 20
    `).bind(nftId, nftId).all();

    let wins = 0, losses = 0, draws = 0;
    const history = (battleResults.results || []).map((b) => {
      const isA = b.nft_a_id === nftId;
      const won = b.winner_nft_id === nftId;
      const isDraw = b.status === 'draw';

      if (isDraw) draws++;
      else if (won) wins++;
      else losses++;

      const startA = (b.nft_a_score_start as number) ?? 0;
      const startB = (b.nft_b_score_start as number) ?? 0;
      const endA = b.nft_a_score_end as number | null;
      const endB = b.nft_b_score_end as number | null;
      const myDelta = isA
        ? (endA != null ? endA - startA : 0)
        : (endB != null ? endB - startB : 0);

      return {
        id: b.id,
        opponentEdition: isA ? b.nft_b_edition : b.nft_a_edition,
        opponentName: (isA ? b.name_b : b.name_a) || `Your Wojak #${isA ? b.nft_b_edition : b.nft_a_edition}`,
        result: isDraw ? 'draw' : (won ? 'win' : 'loss'),
        scoreDelta: myDelta,
        resolvedAt: b.resolved_at,
      };
    });

    // Sales history
    const salesResults = await context.env.DB.prepare(`
      SELECT completed_at, original_amount, currency, xch_equivalent, usd_value, source, token_code
      FROM sales_history
      WHERE nft_edition = ?
      ORDER BY completed_at_unix DESC
      LIMIT 20
    `).bind(edition).all();

    const sales = (salesResults.results || []).map((s) => ({
      date: s.completed_at,
      price: String(s.original_amount),
      currency: s.currency,
      tokenCode: s.token_code || null,
      xchEquivalent: s.xch_equivalent,
      usdValue: s.usd_value,
      source: s.source,
    }));

    return Response.json({
      success: true,
      nft: {
        nftId,
        edition,
        name: customName || baseName,
        customName,
        fullName: (nft.full_name as string) || baseName,
        imageUri: resolveImageUri(nft.ipfs_image_uri as string | null),
        ownerWallet: (nft.owner_wallet as string) || null,
        ownerDid: (nft.owner_did as string) || null,
        creatorWallet: (nft.creator_wallet as string) || null,
      },
      scores: {
        likes: (nft.likes as number) || 0,
        dislikes: (nft.dislikes as number) || 0,
        netScore: (nft.net_score as number) || 0,
        totalVotes: (nft.total_votes as number) || 0,
      },
      battles: {
        total: wins + losses + draws,
        wins,
        losses,
        draws,
        history,
      },
      sales,
    });
  } catch (err) {
    console.error('Wojak profile error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 2: Type-check**

Run: `npx tsc -b`
Expected: No errors

**Step 3: Commit**

```bash
git add functions/api/game/wojak/[edition].ts
git commit -m "feat: add NFT profile API endpoint GET /api/game/wojak/:edition"
```

---

## Task 2: NFT Profile Page Component

Create the WojakProfile page and wire it into the router.

**Files:**
- Create: `src/pages/WojakProfile.tsx`
- Modify: `src/App.tsx` (add route + lazy import)

**Step 1: Create WojakProfile.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';

interface NftProfile {
  nft: {
    nftId: string | null;
    edition: number;
    name: string;
    customName: string | null;
    fullName: string;
    imageUri: string;
    ownerWallet: string | null;
    ownerDid: string | null;
    creatorWallet: string | null;
  };
  scores: {
    likes: number;
    dislikes: number;
    netScore: number;
    totalVotes: number;
  };
  battles: {
    total: number;
    wins: number;
    losses: number;
    draws: number;
    history: {
      id: number;
      opponentEdition: number;
      opponentName: string;
      result: 'win' | 'loss' | 'draw';
      scoreDelta: number;
      resolvedAt: string;
    }[];
  };
  sales: {
    date: string;
    price: string;
    currency: string;
    tokenCode: string | null;
    xchEquivalent: number;
    usdValue: number | null;
    source: string;
  }[];
}

function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}

function ProfileContent() {
  const { edition } = useParams<{ edition: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<NftProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!edition) return;
    setLoading(true);
    setError(false);
    fetch(`/api/game/wojak/${edition}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [edition]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
        <div className="skeleton" style={{ height: 24, width: 120 }} />
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 'var(--radius-lg)' }} />
          <div className="flex flex-col gap-3 flex-1" style={{ minWidth: 200 }}>
            <div className="skeleton" style={{ height: 28, width: '80%' }} />
            <div className="skeleton" style={{ height: 16, width: '60%' }} />
            <div className="skeleton" style={{ height: 40, width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 className="text-lg font-bold">NFT Not Found</h2>
        <p className="text-secondary text-sm">This Wojak doesn't exist or hasn't been minted yet.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const { nft, scores, battles, sales } = data;

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 720, margin: '0 auto', padding: 16, paddingBottom: 40 }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-secondary"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Hero: image + info */}
      <div className="flex gap-5" style={{ flexWrap: 'wrap' }}>
        {/* NFT Image */}
        {nft.imageUri ? (
          <img
            src={nft.imageUri}
            alt={nft.name}
            style={{
              width: 200,
              height: 200,
              borderRadius: 'var(--radius-lg)',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="text-muted">No image</span>
          </div>
        )}

        {/* Info card */}
        <div className="flex flex-col gap-3 flex-1" style={{ minWidth: 200 }}>
          <div>
            <h1 className="text-xl font-bold">{nft.name}</h1>
            <span className="text-secondary" style={{ fontSize: 13 }}>
              Your Wojak #{nft.edition}
            </span>
          </div>

          {nft.ownerWallet && (
            <span className="text-muted" style={{ fontSize: 12 }}>
              Owned by {truncateWallet(nft.ownerWallet)}
            </span>
          )}

          {/* Score summary */}
          <div className="card-static p-3 flex gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700, color: scores.netScore >= 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {scores.netScore >= 0 ? '+' : ''}{scores.netScore}
              </span>
              <span className="text-muted" style={{ fontSize: 11 }}>net</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{scores.likes}</span>
              <span className="text-muted" style={{ fontSize: 11 }}>likes</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{scores.dislikes}</span>
              <span className="text-muted" style={{ fontSize: 11 }}>dislikes</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{scores.totalVotes}</span>
              <span className="text-muted" style={{ fontSize: 11 }}>total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Record */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-secondary" style={{ fontSize: 14, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
            Battle Record
          </h2>
          {battles.total > 0 && (
            <span className="text-muted" style={{ fontSize: 13 }}>
              {battles.wins}W - {battles.losses}L - {battles.draws}D
            </span>
          )}
        </div>

        {battles.history.length === 0 ? (
          <div className="card-static p-4 flex flex-col items-center gap-2">
            <span className="text-muted" style={{ fontSize: 13 }}>No battles yet.</span>
          </div>
        ) : (
          <div className="card-static flex flex-col">
            {battles.history.map(b => (
              <Link
                key={b.id}
                to={`/swipe/wojak/${b.opponentEdition}`}
                className="flex items-center gap-3"
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span
                  className={`badge ${b.result === 'win' ? 'badge-success' : b.result === 'loss' ? '' : 'badge-cyan'}`}
                  style={b.result === 'loss' ? { background: 'rgba(239,68,68,0.15)', color: 'var(--color-error)' } : undefined}
                >
                  {b.result === 'win' ? 'Won' : b.result === 'loss' ? 'Lost' : 'Draw'}
                </span>
                <span className="text-secondary" style={{ fontSize: 13 }}>
                  vs {b.opponentName}
                </span>
                <span className="flex-1" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: b.scoreDelta > 0 ? 'var(--color-primary)' : b.scoreDelta < 0 ? 'var(--color-error)' : 'var(--color-text-muted)',
                  }}
                >
                  {b.scoreDelta > 0 ? '+' : ''}{b.scoreDelta}
                </span>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {new Date(b.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sales History */}
      <div className="flex flex-col gap-3">
        <h2 className="text-secondary" style={{ fontSize: 14, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
          Sales History
        </h2>

        {sales.length === 0 ? (
          <div className="card-static p-4 flex flex-col items-center gap-2">
            <span className="text-muted" style={{ fontSize: 13 }}>No sales recorded.</span>
          </div>
        ) : (
          <div className="card-static flex flex-col">
            {sales.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex-1" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {s.price} {s.tokenCode || s.currency}
                </span>
                {s.usdValue != null && (
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    ${s.usdValue.toFixed(2)}
                  </span>
                )}
                <span className="badge" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                  {s.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WojakProfile() {
  const { edition } = useParams<{ edition: string }>();
  return (
    <>
      <PageSEO
        title={`Your Wojak #${edition || ''} — Wojak Swipe`}
        description={`Profile for Your Wojak #${edition || ''} — stats, battles, and sales history`}
        path={`/swipe/wojak/${edition || ''}`}
      />
      <PageTransition>
        <ProfileContent />
      </PageTransition>
    </>
  );
}
```

**Step 2: Add route and lazy import in App.tsx**

In `src/App.tsx`, add the lazy import near the other game page imports (after line 79):
```ts
const WojakProfile = lazy(() => import('./pages/WojakProfile'));
```

Add the route inside the `<Route path="swipe" element={<GameLayout />}>` block, after the "activity" route:
```tsx
<Route
  path="wojak/:edition"
  element={
    <Suspense fallback={<PageSkeleton type="settings" />}>
      <WojakProfile />
    </Suspense>
  }
/>
```

**Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: No errors, successful build

**Step 4: Commit**

```bash
git add src/pages/WojakProfile.tsx src/App.tsx
git commit -m "feat: add NFT profile page at /swipe/wojak/:edition"
```

---

## Task 3: Add `ownerWallet` to Top Wojaks API + Shared `truncateWallet` Utility

**Files:**
- Modify: `functions/api/game/top-wojaks.ts` (add `ownerWallet` to response)

**Step 1: Add ownerWallet to top-wojaks.ts**

In `functions/api/game/top-wojaks.ts`, modify the SQL query to join `game_players`:

Change the SQL (lines 23-36) from:
```sql
SELECT ws.nft_id, ws.edition_number, ws.likes, ws.dislikes,
       ws.net_score, ws.total_votes,
       nn.custom_name, nn.full_name,
       dh.did_id AS owner_did, dh.creator_wallet,
       pm.ipfs_image_uri
FROM wojak_scores ws
LEFT JOIN nft_names nn ON ws.edition_number = nn.edition_number
LEFT JOIN did_holdings dh ON ws.nft_id = dh.nft_id
LEFT JOIN phase2_mints pm ON ws.edition_number = pm.mint_number
WHERE ws.total_votes > 0
ORDER BY ws.net_score DESC
LIMIT ? OFFSET ?
```

To:
```sql
SELECT ws.nft_id, ws.edition_number, ws.likes, ws.dislikes,
       ws.net_score, ws.total_votes,
       nn.custom_name, nn.full_name,
       dh.did_id AS owner_did, dh.creator_wallet,
       pm.ipfs_image_uri,
       gp.wallet_address AS owner_wallet
FROM wojak_scores ws
LEFT JOIN nft_names nn ON ws.edition_number = nn.edition_number
LEFT JOIN did_holdings dh ON ws.nft_id = dh.nft_id
LEFT JOIN phase2_mints pm ON ws.edition_number = pm.mint_number
LEFT JOIN game_players gp ON dh.did_id = gp.did_id
WHERE ws.total_votes > 0
ORDER BY ws.net_score DESC
LIMIT ? OFFSET ?
```

And add `ownerWallet` to the response mapping (line 51, after `ownerDid`):
```ts
ownerWallet: (row.owner_wallet as string) || null,
```

**Step 2: Type-check**

Run: `npx tsc -b`
Expected: No errors

**Step 3: Commit**

```bash
git add functions/api/game/top-wojaks.ts
git commit -m "feat: add ownerWallet to top-wojaks API response"
```

---

## Task 4: Remove DIDs from UI — Replace with Wallet Addresses

Replace all `truncateDid()` calls with `truncateWallet()` across four components.

**Files:**
- Modify: `src/components/game/GamePodium.tsx`
- Modify: `src/components/game/GameLeaderboardList.tsx`
- Modify: `src/components/game/MiniLeaderboard.tsx`
- Modify: `src/pages/GameLeaderboard.tsx` (update interfaces)

**Step 1: Update GamePodium.tsx**

Replace `truncateDid` function (lines 32-35) with:
```ts
function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}
```

In the `PodiumEntry` interface, add:
```ts
walletAddress?: string;
```

In the `PodiumCard` component for `mode === 'players'` (line 101), change:
```tsx
{entry.did ? truncateDid(entry.did) : 'Unknown'}
```
to:
```tsx
{entry.walletAddress ? truncateWallet(entry.walletAddress) : 'Unknown'}
```

In the `mode === 'wojaks'` section (line 121-123), change:
```tsx
{entry.did && (
  <span className="text-muted" style={{ fontSize: 11, ... }}>
    by {truncateDid(entry.did)}
  </span>
)}
```
to:
```tsx
{entry.walletAddress && (
  <span className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
    by {truncateWallet(entry.walletAddress)}
  </span>
)}
```

**Step 2: Update GameLeaderboardList.tsx**

Replace `truncateDid` function (lines 34-37) with:
```ts
function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}
```

Add `walletAddress?: string` to `PlayerEntry` interface.

In `PlayerRow`, change the display (line 69):
```tsx
{truncateDid(entry.did)}
```
to:
```tsx
{entry.walletAddress ? truncateWallet(entry.walletAddress) : truncateWallet(entry.did)}
```

Add `ownerWallet?: string | null` to `WojakEntry` interface.

**Step 3: Update MiniLeaderboard.tsx**

Add `walletAddress?: string` to the `LeaderboardEntry` interface.

Replace `truncateDid` function (lines 21-26) with:
```ts
function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}
```

Change line 93 from:
```tsx
{isYou ? 'You' : truncateDid(entry.did)}
```
to:
```tsx
{isYou ? 'You' : (entry.walletAddress ? truncateWallet(entry.walletAddress) : truncateWallet(entry.did))}
```

**Step 4: Update GameLeaderboard.tsx**

Add `walletAddress?: string` to the `PlayerEntry` interface (line 14-19).
Add `ownerWallet?: string | null` to the `WojakEntry` interface (line 21-32).

In the `podiumEntries` mapping (lines 136-151), add `walletAddress` to the mapped object:
```ts
walletAddress: tab === 'players'
  ? (e as PlayerEntry).walletAddress
  : (e as WojakEntry).ownerWallet || undefined,
```

**Step 5: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/game/GamePodium.tsx src/components/game/GameLeaderboardList.tsx src/components/game/MiniLeaderboard.tsx src/pages/GameLeaderboard.tsx
git commit -m "feat: replace DID displays with truncated wallet addresses"
```

---

## Task 5: Swipe Sub-Navigation Bar

**Files:**
- Create: `src/components/game/SwipeNav.tsx`
- Modify: `src/App.tsx` (add SwipeNav to GameLayout)

**Step 1: Create SwipeNav.tsx**

```tsx
import { NavLink } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';

const NAV_ITEMS = [
  { to: '/swipe', label: 'Vote', end: true },
  { to: '/swipe/dashboard', label: 'Dashboard', end: false },
  { to: '/swipe/battles', label: 'Battles', end: false },
  { to: '/swipe/leaderboard', label: 'Leaderboard', end: false },
  { to: '/swipe/activity', label: 'Activity', end: false },
];

export function SwipeNav() {
  const { isRegistered } = useGame();

  if (!isRegistered) return null;

  return (
    <nav
      className="hide-scrollbar"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--color-bg)',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'color 150ms, border-color 150ms',
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

**Step 2: Add SwipeNav to GameLayout in App.tsx**

Import SwipeNav at the top of `src/App.tsx`:
```ts
import { SwipeNav } from '@/components/game/SwipeNav';
```

Update the `GameLayout` function (lines 40-47) to include SwipeNav:
```tsx
function GameLayout() {
  return (
    <GameProvider>
      <SwipeAutoRegister />
      <SwipeNav />
      <Outlet />
    </GameProvider>
  );
}
```

**Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/game/SwipeNav.tsx src/App.tsx
git commit -m "feat: add Swipe sub-navigation bar"
```

---

## Task 6: Clickable NFTs Everywhere

Wrap NFT images/names in `<Link to="/swipe/wojak/:edition">` in six components.

**Files:**
- Modify: `src/components/game/GamePodium.tsx`
- Modify: `src/components/game/GameLeaderboardList.tsx`
- Modify: `src/components/game/BattleCard.tsx`
- Modify: `src/components/game/ActiveBattleCard.tsx`
- Modify: `src/components/game/CollectionScroll.tsx`

**Step 1: GamePodium.tsx — make NFT images and names clickable**

Add import at top:
```ts
import { Link } from 'react-router-dom';
```

In `PodiumCard`, wrap the image container and name in a Link. The `editionNumber` on the entry is needed. Replace the `<div style={{ position: 'relative' }}>` block (around lines 50-96) and the name span below it with Link wrappers:

Wrap the image block (lines 50-96) in a Link:
```tsx
{entry.editionNumber ? (
  <Link to={`/swipe/wojak/${entry.editionNumber}`} style={{ position: 'relative', cursor: 'pointer' }}>
    {/* existing image/placeholder JSX */}
    {/* existing rank badge JSX */}
  </Link>
) : (
  <div style={{ position: 'relative' }}>
    {/* existing image/placeholder JSX */}
    {/* existing rank badge JSX */}
  </div>
)}
```

For the name text in wojaks mode (line 114), wrap in Link:
```tsx
<Link to={`/swipe/wojak/${entry.editionNumber}`} style={{ textDecoration: 'none', color: 'inherit', maxWidth: '100%' }}>
  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', display: 'block' }}>
    {entry.name || `Your Wojak #${entry.editionNumber}`}
  </span>
</Link>
```

**Step 2: GameLeaderboardList.tsx — make WojakRow clickable, PlayerRow thumbnail clickable**

Add import at top:
```ts
import { Link } from 'react-router-dom';
```

**WojakRow**: Wrap the entire row in a Link. Replace the outer `<div>` (line 91) with:
```tsx
<Link
  to={`/swipe/wojak/${entry.editionNumber}`}
  className="flex items-center gap-3"
  style={{
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    borderLeft: isOwned ? '2px solid var(--color-primary)' : '2px solid transparent',
    background: isOwned ? 'rgba(255,107,0,0.05)' : 'transparent',
    textDecoration: 'none',
    color: 'inherit',
  }}
>
  {/* existing WojakRow content */}
</Link>
```

**PlayerRow**: Wrap the thumbnail image in a Link. If `entry.topNft?.editionNumber` exists, wrap the `<img>` (lines 57-61) in:
```tsx
{entry.topNft?.editionNumber ? (
  <Link to={`/swipe/wojak/${entry.topNft.editionNumber}`}>
    <img ... />
  </Link>
) : (
  <img ... />  // or placeholder div
)}
```

**Step 3: BattleCard.tsx — make both NFT images clickable**

Add import:
```ts
import { Link } from 'react-router-dom';
```

Add `imageUri?: string` to the `BattleNft` interface.

Wrap both `<img>` tags for nftA (line 89) and nftB (line 120) in Link:
```tsx
<Link to={`/swipe/wojak/${nftA.edition}`}>
  <img
    src={nftA.imageUri || `https://assets.mintgarden.io/thumbnails/medium/${nftA.id}.png`}
    ...
  />
</Link>
```

Same pattern for nftB.

Wrap both name `<p>` tags in Link:
```tsx
<Link to={`/swipe/wojak/${nftA.edition}`} style={{ textDecoration: 'none', color: 'inherit' }}>
  <p className="text-sm font-semibold text-center">{nftA.name}</p>
</Link>
```

**Step 4: ActiveBattleCard.tsx — make both NFT images clickable**

Both images (line 92 and 110) should be wrapped:
```tsx
<Link to={`/swipe/wojak/${yourNft.edition}`}>
  <img ... />
</Link>
```

And for the opponent:
```tsx
<Link to={`/swipe/wojak/${opponentNft.edition}`}>
  <img ... />
</Link>
```

Note: `Link` is already imported in this file.

**Step 5: CollectionScroll.tsx — make scroll items link to profile**

In the scroll items (lines 305-328), change the `<button>` wrapper to navigate to profile instead of opening the modal. Replace:
```tsx
<button
  key={nft.nftId}
  onClick={() => setSelectedNft(nft)}
  ...
>
```
with:
```tsx
<Link
  key={nft.nftId}
  to={`/swipe/wojak/${nft.editionNumber}`}
  className="flex flex-col items-center gap-1"
  style={{ flexShrink: 0, scrollSnapAlign: 'start', textDecoration: 'none', color: 'inherit' }}
>
```

And change closing `</button>` to `</Link>`.

Keep the NftDetailModal — it's still accessible from other places. But the scroll cards now navigate to the profile page.

**Step 6: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: No errors

**Step 7: Commit**

```bash
git add src/components/game/GamePodium.tsx src/components/game/GameLeaderboardList.tsx src/components/game/BattleCard.tsx src/components/game/ActiveBattleCard.tsx src/components/game/CollectionScroll.tsx
git commit -m "feat: make NFT images and names clickable everywhere"
```

---

## Task 7: Better Empty States

Improve empty state messages and add CTA buttons across the app.

**Files:**
- Modify: `src/components/game/VotingFeed.tsx`
- Modify: `src/components/game/BattleView.tsx`
- Modify: `src/pages/GameLeaderboard.tsx`

**Step 1: Fix VotingFeed.tsx empty state**

In `src/components/game/VotingFeed.tsx`, replace the "Feed empty" section (lines 265-279).

Change the `<a href="/generator">` to `<Link to="/generator">`:

Add `Link` to the existing import from 'react-router-dom' (it may not be imported yet — check and add if needed):
```ts
import { Link } from 'react-router-dom';
```

Replace the empty state block:
```tsx
if (feed.length === 0) {
  return (
    <div className="card-static flex flex-col items-center justify-center gap-4 p-8" style={{ minHeight: 300 }}>
      <span className="text-2xl">&#10024;</span>
      <h2 className="text-lg font-semibold">You've Seen Them All</h2>
      <p className="text-secondary text-sm text-center">
        You've voted on every Wojak! Check back when more are minted.
      </p>
      <div className="flex gap-3">
        <Link to="/swipe/leaderboard" className="btn btn-primary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
          View Leaderboard
        </Link>
        <Link to="/generator" className="btn btn-secondary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
          Mint a Wojak
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: Improve BattleView.tsx empty states**

In the active tab empty state (around line 201), change:
```tsx
<div className="card-static p-8 flex flex-col items-center gap-4">
  <h2 className="text-xl font-bold">No Active Battles</h2>
  <p className="text-secondary text-center">
    No active battles right now. Queue a Wojak to start one!
  </p>
</div>
```

In the history tab empty state (around line 230), change:
```tsx
<div className="card-static p-8 flex flex-col items-center gap-4">
  <h2 className="text-xl font-bold">No Battle History</h2>
  <p className="text-secondary text-center">
    No battles resolved yet. Queue a Wojak to start one.
  </p>
</div>
```

**Step 3: Improve GameLeaderboard.tsx empty state**

In `src/pages/GameLeaderboard.tsx`, the empty state (around line 246) already has good CTA. Update the text:
```tsx
<span className="text-muted" style={{ fontSize: 14 }}>
  {tab === 'players'
    ? 'No players yet. Start swiping to climb the ranks.'
    : 'No votes cast yet. Be the first to vote!'}
</span>
<Link to="/swipe" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
  Start Swiping
</Link>
```

**Step 4: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/game/VotingFeed.tsx src/components/game/BattleView.tsx src/pages/GameLeaderboard.tsx
git commit -m "feat: improve empty states with descriptive text and CTA buttons"
```

---

## Task 8: Onboarding Auto-Detect Improvements

Make GateChecklist show a detecting state for step 2 instead of immediately showing manual DID input.

**Files:**
- Modify: `src/components/game/GateChecklist.tsx`

**Step 1: Update GateChecklist.tsx**

Change the step 2 label from `'Link your DID'` to `'Detect your identity'` (line 163):
```ts
{ label: 'Detect your identity', done: walletConnected && hasDid },
```

Add a `detecting` state and `detectFailed` state at the top of the component:
```ts
const [detecting, setDetecting] = useState(false);
const [detectFailed, setDetectFailed] = useState(false);
const [showManualDid, setShowManualDid] = useState(false);
```

Add an effect that tracks when wallet connects but DID is not yet found — shows detecting state:
```ts
useEffect(() => {
  if (walletConnected && !hasDid) {
    setDetecting(true);
    setDetectFailed(false);
    setShowManualDid(false);
    // Give SwipeAutoRegister time to detect DID (3 retries x 3s = ~9s)
    const timer = setTimeout(() => {
      setDetecting(false);
      setDetectFailed(true);
    }, 12000);
    return () => clearTimeout(timer);
  }
  if (hasDid) {
    setDetecting(false);
    setDetectFailed(false);
    setShowManualDid(false);
  }
}, [walletConnected, hasDid]);
```

Replace the step 2 `isCurrent && i === 1` block (lines 197-228) with:
```tsx
{isCurrent && i === 1 && (
  <div className="flex flex-col gap-2 mt-2">
    {detecting && !detectFailed && (
      <span className="text-secondary text-sm">
        Detecting your identity...
      </span>
    )}
    {detectFailed && !showManualDid && (
      <>
        <span className="text-muted text-sm">
          Could not detect DID automatically.
        </span>
        <button
          className="btn btn-ghost text-sm"
          style={{ padding: '4px 12px', alignSelf: 'flex-start' }}
          onClick={() => setShowManualDid(true)}
        >
          Enter DID manually
        </button>
      </>
    )}
    {(showManualDid || (!detecting && !detectFailed)) && (
      <>
        <span className="text-muted text-sm">
          Paste your DID from Sage wallet.
        </span>
        <input
          className="input text-sm"
          type="text"
          placeholder="did:chia:1..."
          value={didInput}
          onChange={e => { setDidInput(e.target.value); setDidError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleLinkDid(); }}
          style={{ fontSize: 13 }}
        />
        {didError && <span className="text-sm" style={{ color: 'var(--color-error)' }}>{didError}</span>}
        <button
          className="btn btn-primary text-sm"
          style={{ padding: '6px 16px' }}
          onClick={handleLinkDid}
          disabled={linking || !didInput.trim()}
        >
          {linking ? 'Linking...' : 'Link DID'}
        </button>
        <a
          href="https://docs.sagewalletapp.com/getting-started/did"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent text-sm"
        >
          Don't have a DID? Learn how to create one &rarr;
        </a>
      </>
    )}
  </div>
)}
```

**Step 2: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/game/GateChecklist.tsx
git commit -m "feat: show auto-detect state during onboarding DID detection"
```

---

## Task 9: Fix Broken Images in BattleCard and ActiveBattleCard

Both `BattleCard.tsx` and `ActiveBattleCard.tsx` construct MintGarden thumbnail URLs from hex launcher IDs. These don't work for dynamically minted NFTs. The battle-list API needs to return image URIs.

**Files:**
- Modify: `functions/api/game/battle-list.ts` (add imageUri to response)
- Modify: `src/components/game/BattleCard.tsx` (use imageUri)
- Modify: `src/components/game/ActiveBattleCard.tsx` (use imageUri)

**Step 1: Add image URIs to battle-list API**

In `functions/api/game/battle-list.ts`, add `phase2_mints` joins to all three queries.

For the nftId-specific query (lines 20-31), change to:
```sql
SELECT
  b.*,
  na.full_name as name_a,
  nb.full_name as name_b,
  pma.ipfs_image_uri as image_a,
  pmb.ipfs_image_uri as image_b
FROM battles b
LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
LEFT JOIN phase2_mints pma ON pma.mint_number = b.nft_a_edition
LEFT JOIN phase2_mints pmb ON pmb.mint_number = b.nft_b_edition
WHERE b.nft_a_id = ? OR b.nft_b_id = ?
ORDER BY b.started_at DESC
LIMIT ? OFFSET ?
```

For the history and active queries (lines 41-54), add the same joins:
```sql
LEFT JOIN phase2_mints pma ON pma.mint_number = b.nft_a_edition
LEFT JOIN phase2_mints pmb ON pmb.mint_number = b.nft_b_edition
```

And select `pma.ipfs_image_uri as image_a, pmb.ipfs_image_uri as image_b`.

Add the `resolveImageUri` function at the top of the file (copy from top-wojaks.ts).

In the battle response mapping (lines 75-100), add `imageUri` to both nftA and nftB:
```ts
nftA: {
  ...
  imageUri: resolveImageUri(b.image_a as string | null),
},
nftB: {
  ...
  imageUri: resolveImageUri(b.image_b as string | null),
},
```

In the `formatBattle` function (lines 139-173), add image fields:
```ts
myNft: {
  ...
  imageUri: resolveImageUri(isA ? b.image_a as string | null : b.image_b as string | null),
},
opponent: {
  ...
  imageUri: resolveImageUri(isA ? b.image_b as string | null : b.image_a as string | null),
},
```

**Step 2: Update BattleCard.tsx to use imageUri**

Add `imageUri?: string` to the `BattleNft` interface (if not already done in Task 6).

Change both `<img>` src attributes from:
```tsx
src={`https://assets.mintgarden.io/thumbnails/medium/${nftA.id}.png`}
```
to:
```tsx
src={nftA.imageUri || `https://assets.mintgarden.io/thumbnails/medium/${nftA.id}.png`}
```

Same for nftB.

Add `onError` fallback to both images:
```tsx
onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,...fallback..."; }}
```

**Step 3: Update ActiveBattleCard.tsx to use imageUri**

Add `imageUri?: string` to the `BattleNft` interface.

Change both `<img>` src from:
```tsx
src={`https://assets.mintgarden.io/thumbnails/medium/${yourNft.id}.png`}
```
to:
```tsx
src={yourNft.imageUri || `https://assets.mintgarden.io/thumbnails/medium/${yourNft.id}.png`}
```

Same for opponentNft.

**Step 4: Update CollectionScroll.tsx images**

The `CollectionScroll.tsx` fetches from `/api/game/collection` which already returns `imageUri`. But the component constructs MintGarden URLs instead. Add `imageUri?: string` to the `CollectionNft` interface and change all `<img>` src attributes from:
```tsx
src={`https://assets.mintgarden.io/thumbnails/medium/${nft.nftId}.png`}
```
to:
```tsx
src={nft.imageUri || `https://assets.mintgarden.io/thumbnails/medium/${nft.nftId}.png`}
```

This applies to the scroll items (line 313) and the NftDetailModal image (line 139).

**Step 5: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: No errors

**Step 6: Commit**

```bash
git add functions/api/game/battle-list.ts src/components/game/BattleCard.tsx src/components/game/ActiveBattleCard.tsx src/components/game/CollectionScroll.tsx
git commit -m "fix: use IPFS image URIs for battle cards and collection scroll"
```

---

## Task 10: Final Build Verification and Deploy

**Step 1: Full type-check**

Run: `npx tsc -b`
Expected: No errors

**Step 2: Production build**

Run: `npm run build`
Expected: Successful build

**Step 3: Deploy**

Use `/deploy` skill to build and deploy to Cloudflare Pages.

**Step 4: Commit any remaining changes**

```bash
git status
```

If any uncommitted changes, commit them.

---

## Verification Checklist

After deploy, verify in browser:

1. **NFT Profile Page**: Navigate to `/swipe/wojak/1` — see image, name, stats, battles, sales
2. **No DIDs**: Check leaderboard — wallet addresses shown instead of DIDs
3. **Sub-Nav**: When registered, see Vote | Dashboard | Battles | Leaderboard | Activity bar
4. **Clickable NFTs**: Click any NFT on leaderboard → navigates to profile page
5. **Battle History**: Go to `/swipe/battles` → Active and History tabs both work
6. **Empty States**: If no battles, see descriptive text with CTA button
7. **Onboarding**: Connect fresh wallet → see "Detecting your identity..." state
8. **Images**: Battle cards show IPFS images, not broken MintGarden thumbnails
