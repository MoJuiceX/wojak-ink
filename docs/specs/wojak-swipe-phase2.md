# Wojak Swipe — Phase 2 Spec

> Research document for the terminal CLI session.
> Written by macOS app session (advisor role). Do NOT commit this directly — the CLI session should commit it alongside implementation.
> Date: 2026-02-17

---

## 1. DID Auto-Detection Flow

### The Problem

When a user connects their Sage wallet, we get their `address` (XCH address) but NOT their DID. The game requires a DID to register (`GameContext.register(did, walletAddress)`). Currently there's a dead gap between "wallet connected" and "player registered" — nothing bridges it.

### Option A: WalletConnect RPC — `chia_getNFTWalletsWithDIDs`

**Method:** Already defined in `sage-wallet-types.ts` line 65:
```ts
GetNftWalletsWithDids: 'chia_getNFTWalletsWithDIDs',
```

**But NOT in required namespaces.** The `connect()` method in `SageWalletProvider.tsx` lines 270-278 lists required methods, and `chia_getNFTWalletsWithDIDs` is NOT included. This means Sage wallet hasn't granted permission for this RPC call.

**Response shape** (from Chia RPC docs):
```ts
interface GetNftWalletsWithDidsResponse {
  nft_wallets: Array<{
    did_id: string;        // e.g. "did:chia:1kzxqrt8f2h8psr8zuzen9..."
    did_wallet_id: number; // DID wallet ID in Sage
    wallet_id: number;     // NFT wallet ID
  }>;
  success: boolean;
}
```

**Changes required to use this approach:**

**File: `src/sage-wallet/SageWalletProvider.tsx`**

1. Add `chia_getNFTWalletsWithDIDs` to `requiredNamespaces` (line 270-278):
```ts
// Line 270-278 — add to the methods array:
methods: [
  'chip0002_getPublicKeys',
  'chia_signMessageByAddress',
  'chia_getAddress',
  'chia_takeOffer',
  'chia_send',
  'chip0002_getAssetBalance',
  'chia_transferNFT',
  'chia_getNFTWalletsWithDIDs',  // ADD THIS
],
```

**WARNING:** Adding a new required method means ALL existing WalletConnect sessions become invalid. Users will need to re-connect their wallet. This is a breaking change for existing sessions.

2. Add the `getDIDs` method (after `getNFTs`, around line 482):
```ts
const getDIDs = useCallback(async (): Promise<string[]> => {
  const client = signClientRef.current;
  const session = currentSessionRef.current;

  if (!client || !session) {
    throw new Error('No active Sage wallet session');
  }

  const result = await client.request({
    topic: session.topic,
    chainId: CHIA_CHAIN,
    request: {
      method: ChiaMethod.GetNftWalletsWithDids,
      params: {},
    },
  });

  const typed = result as {
    nft_wallets: Array<{ did_id: string; did_wallet_id: number; wallet_id: number }>;
    success: boolean;
  };

  if (!typed.success || !typed.nft_wallets) {
    return [];
  }

  return typed.nft_wallets.map(w => w.did_id);
}, []);
```

3. Add to context value (line 496-506):
```ts
const contextValue: SageWalletContextType = {
  ...state,
  connect,
  disconnect,
  signMessage,
  getAssetBalance,
  takeOffer,
  transferNFT,
  hasRequiredNFTs,
  getNFTs,
  getDIDs,  // ADD THIS
};
```

4. Update types in `sage-wallet-types.ts` — add to `SageWalletActions` (line 155-164):
```ts
export interface SageWalletActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<SignMessageResult>;
  getAssetBalance: (assetId?: string | null) => Promise<AssetBalance>;
  takeOffer: (offer: string, fee?: number) => Promise<unknown>;
  transferNFT: (nftCoinId: string, targetAddress: string, fee?: number) => Promise<unknown>;
  hasRequiredNFTs: (collectionId: string) => Promise<boolean>;
  getNFTs: (collectionId?: string) => Promise<MintGardenNFT[]>;
  getDIDs: () => Promise<string[]>;  // ADD THIS
}
```

### Option B: MintGarden API Lookup (RECOMMENDED)

**Why this is better:**
- No WalletConnect namespace changes (no session invalidation)
- No RPC call latency to Sage wallet
- Same pattern already used by `hasRequiredNFTs()` and `getNFTs()` (lines 434-482 of SageWalletProvider.tsx)
- Works even if Sage wallet doesn't support the RPC method

**MintGarden endpoint:**
```
GET https://api.mintgarden.io/address/{xch_address}/dids
```

**Expected response shape** (based on MintGarden API patterns):
```ts
interface MintGardenDIDResponse {
  dids: Array<{
    did_id: string;      // "did:chia:1abc..."
    name: string | null;
    nft_count: number;
  }>;
}
```

**NOTE:** This endpoint needs to be verified. If it doesn't exist, the alternative is:
```
GET https://api.mintgarden.io/address/{xch_address}/nfts?type=owned
```
Then extract unique `owner_did` values from the response items. The `MintGardenNFT` type doesn't have `owner_did`, but the raw API may return it. Test first.

**Implementation — add to `SageWalletProvider.tsx` after `getNFTs` (line 482):**

```ts
const getDIDs = useCallback(async (): Promise<string[]> => {
  if (!state.address || !isValidChiaAddress(state.address)) {
    return [];
  }

  try {
    // Try the /dids endpoint first
    const response = await fetch(
      `https://api.mintgarden.io/address/${state.address}/dids`
    );

    if (response.ok) {
      const data = await response.json() as {
        dids?: Array<{ did_id: string }>;
      };
      if (data.dids && data.dids.length > 0) {
        return data.dids.map(d => d.did_id);
      }
    }

    // Fallback: get NFTs and extract unique owner DIDs
    const nftResponse = await fetch(
      `https://api.mintgarden.io/address/${state.address}/nfts?type=owned&size=1`
    );

    if (!nftResponse.ok) return [];

    const nftData = await nftResponse.json() as {
      items: Array<{ owner_did?: string }>;
    };

    const dids = new Set<string>();
    for (const item of nftData.items) {
      if (item.owner_did) dids.add(item.owner_did);
    }

    return Array.from(dids);
  } catch (error) {
    console.error('[SageWallet] DID lookup error:', error);
    return [];
  }
}, [state.address]);
```

**Same type changes as Option A** — add `getDIDs: () => Promise<string[]>` to `SageWalletActions` and context value.

### Recommendation

**Use Option B (MintGarden API).** It doesn't break existing WalletConnect sessions, follows the existing pattern in the codebase (see `hasRequiredNFTs` at line 434), and is simpler. If the `/dids` endpoint doesn't exist, the NFT fallback still works.

---

## 2. Auto-Registration Wiring

### The Problem

Once we have `getDIDs()`, we need to auto-fire `register(did, walletAddress)` when:
1. Wallet is connected (address available)
2. DID is detected
3. Player is NOT already registered

Currently `GameContext` and `SageWalletProvider` are separate — GameProvider doesn't have access to the wallet. The wallet lives higher in the component tree.

### Architecture Decision

**Don't merge the contexts.** Instead, create a bridge component that sits inside both providers and wires them together.

### Implementation

**New file: `src/components/game/SwipeAutoRegister.tsx`**

```tsx
// Auto-registration bridge between SageWallet and GameContext.
// Detects DID from connected wallet, registers if not already registered.

import { useEffect, useRef, useState } from 'react';
import { useSageWallet } from '@/sage-wallet';
import { useGame } from '@/contexts/GameContext';

export function SwipeAutoRegister() {
  const { address, status, getDIDs } = useSageWallet();
  const { isRegistered, register } = useGame();
  const [detectedDid, setDetectedDid] = useState<string | null>(null);
  const [didLoading, setDidLoading] = useState(false);
  const attemptedRef = useRef(false);

  // Step 1: When wallet connects, fetch DIDs
  useEffect(() => {
    if (status !== 'connected' || !address || didLoading || detectedDid) return;

    setDidLoading(true);
    getDIDs()
      .then(dids => {
        if (dids.length > 0) {
          setDetectedDid(dids[0]); // Use first DID
        }
      })
      .catch(err => {
        console.error('[SwipeAutoRegister] DID detection failed:', err);
      })
      .finally(() => setDidLoading(false));
  }, [status, address, getDIDs, didLoading, detectedDid]);

  // Step 2: When DID detected + not registered, auto-register
  useEffect(() => {
    if (!detectedDid || !address || isRegistered || attemptedRef.current) return;

    attemptedRef.current = true;
    register(detectedDid, address).catch(err => {
      console.error('[SwipeAutoRegister] Registration failed:', err);
      attemptedRef.current = false; // Allow retry
    });
  }, [detectedDid, address, isRegistered, register]);

  // This component renders nothing — it's a side-effect bridge
  return null;
}
```

### Where to Mount

Add `<SwipeAutoRegister />` inside every page that uses `<GameProvider>`. It must be a child of both `GameProvider` AND `SageWalletProvider` (which wraps the whole app).

**File: `src/pages/GameVoting.tsx` — add inside GameProvider:**

```tsx
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';

export default function GameVoting() {
  const { isDesktop } = useLayout();

  return (
    <GameProvider>
      <SwipeAutoRegister />
      <PageSEO ... />
      {isDesktop ? <VotingPageDesktop /> : <VotingPageMobile />}
    </GameProvider>
  );
}
```

**Same change in:** `GameDashboard.tsx`, `GameBattles.tsx`, `GameLeaderboard.tsx`.

### GateChecklist Updates

**File: `src/components/game/GateChecklist.tsx`**

The current GateChecklist has 3 props: `walletConnected`, `hasDid`, `hasPhase1`. With auto-registration, `hasDid` will auto-flip to true when a DID is found. But the checklist needs to show:
- Step 1: Connect wallet (already works)
- Step 2: DID detected / "Create a DID" (needs loading state + auto-detection feedback)
- Step 3: Wojak Farmers Plot required (already works)

**Updated GateChecklist:**

```tsx
import { useSageWallet } from '@/sage-wallet';

interface GateChecklistProps {
  walletConnected: boolean;
  hasDid: boolean;
  hasPhase1: boolean;
  didLoading?: boolean; // NEW: show spinner while detecting DID
}

export function GateChecklist({ walletConnected, hasDid, hasPhase1, didLoading }: GateChecklistProps) {
  const { connect } = useSageWallet();

  const steps = [
    { label: 'Connect wallet', done: walletConnected },
    { label: didLoading ? 'Detecting your DID...' : 'Link a DID', done: hasDid },
    { label: 'Get a Wojak Farmers Plot', done: hasPhase1 },
    { label: 'Start swiping', done: walletConnected && hasDid && hasPhase1 },
  ];

  return (
    <div className="card-static p-8 flex flex-col items-center gap-4" style={{ maxWidth: 380, width: '100%' }}>
      <h2 className="text-xl font-bold">Wojak Swipe</h2>
      <p className="text-secondary text-sm text-center">
        Complete these steps to start swiping.
      </p>
      <ol className="flex flex-col gap-3 w-full" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {steps.map((step, i) => {
          const isCurrent = !step.done && steps.slice(0, i).every(s => s.done);
          return (
            <li key={i} className="gate-step" aria-current={isCurrent ? 'step' : undefined}>
              <span className="gate-step-icon">
                {step.done ? '\u2705' : isCurrent ? (didLoading && i === 1 ? '\u23F3' : '\u2610') : ''}
                {!step.done && !isCurrent && <div className="gate-step-icon-future" />}
              </span>
              <div className="gate-step-content">
                <span className={step.done ? 'text-secondary text-sm' : isCurrent ? 'text-sm font-medium' : 'text-muted text-sm'}>
                  {step.label}
                </span>
                {isCurrent && i === 0 && (
                  <button className="btn btn-primary mt-2 text-sm" style={{ padding: '6px 16px' }} onClick={connect}>
                    Connect Wallet
                  </button>
                )}
                {isCurrent && i === 1 && !didLoading && (
                  <a
                    href="https://docs.sagewalletapp.com/getting-started/did"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost mt-2 text-sm"
                    style={{ padding: '6px 16px' }}
                  >
                    Learn How &rarr;
                  </a>
                )}
                {isCurrent && i === 2 && (
                  <a
                    href="https://mintgarden.io/collections/wojak-farmers-plot-col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost mt-2 text-sm"
                    style={{ padding: '6px 16px' }}
                  >
                    View Collection &rarr;
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

### VotingFeed Update

**File: `src/components/game/VotingFeed.tsx` lines 198-211**

The VotingFeed currently determines `hasDid = isRegistered`. With auto-registration, the SwipeAutoRegister component handles this. But we should pass `didLoading` through:

The simplest approach: add `didLoading` state to GameContext, set it from SwipeAutoRegister via a new `setDidLoading` context method. OR, keep it simpler and just let the GateChecklist show "Link a DID" (no loading state) — when SwipeAutoRegister detects the DID, the gate auto-closes because `isRegistered` flips to true.

**Recommended: Keep it simple.** Don't add didLoading to GateChecklist for now. When the wallet connects and SwipeAutoRegister fires, it happens in <1 second and the gate flips automatically. Users won't see a loading state.

---

## 3. Battle Queue UX

### The Problem

`BattleView.tsx` shows active battles but has no "Queue My NFT" button. Users can't initiate battles from the battles page.

### API Shape (from `functions/api/game/battle-queue.ts`)

**POST `/api/game/battle-queue`**
```ts
// Request body:
{ did: string, nftId: string, editionNumber: number }

// Response (queued, waiting):
{ success: true, matched: false, message: "Added to queue..." }

// Response (instant match):
{ success: true, matched: true, message: "Battle started!..." }

// Errors: 400, 403 (not owner/not verified), 409 (already in queue/battle)
```

### NFT Source

User's Your Wojak NFTs come from `did_holdings` table (populated by DID indexer). On the frontend, we can fetch them via:
- `/api/game/collection?did={did}` (if this API exists — check)
- OR use MintGarden API directly: `getNFTs(PHASE2_COLLECTION_ID)` from wallet provider

**The collection API exists** (from Phase 1 spec: `functions/api/game/collection.ts` was built in D2). It returns NFTs with vote scores. Use that.

### Component Design

**New file: `src/components/game/BattleQueuePanel.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';

interface OwnedNft {
  nftId: string;
  editionNumber: number;
  name: string;
  netScore: number;
}

const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';

interface BattleQueuePanelProps {
  onQueued?: () => void; // Callback to refresh battle list
}

export function BattleQueuePanel({ onQueued }: BattleQueuePanelProps) {
  const { player } = useGame();
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNft, setSelectedNft] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [result, setResult] = useState<{ matched: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's Your Wojak collection
  useEffect(() => {
    if (!player?.did) return;
    setLoading(true);
    fetch(`/api/game/collection?did=${player.did}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.nfts) {
          setNfts(data.nfts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [player?.did]);

  const handleQueue = useCallback(async () => {
    if (!player || !selectedNft) return;
    const nft = nfts.find(n => n.nftId === selectedNft);
    if (!nft) return;

    setQueueing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/game/battle-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: player.did,
          nftId: nft.nftId,
          editionNumber: nft.editionNumber,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ matched: data.matched, message: data.message });
        setSelectedNft(null);
        onQueued?.();
      } else {
        setError(data.error || 'Failed to queue');
      }
    } catch {
      setError('Network error');
    } finally {
      setQueueing(false);
    }
  }, [player, selectedNft, nfts, onQueued]);

  if (loading) {
    return <div className="text-secondary text-sm p-4">Loading your NFTs...</div>;
  }

  if (nfts.length === 0) {
    return (
      <div className="card-static p-4 text-center">
        <p className="text-secondary text-sm">
          No Your Wojak NFTs found. Mint one in the{' '}
          <a href="/generator" style={{ color: 'var(--color-primary)' }}>Generator</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="font-semibold">Queue for Battle</h3>

      {/* NFT selector */}
      <select
        className="input"
        value={selectedNft || ''}
        onChange={(e) => setSelectedNft(e.target.value || null)}
      >
        <option value="">Select a Wojak...</option>
        {nfts.map(nft => (
          <option key={nft.nftId} value={nft.nftId}>
            {nft.name} #{nft.editionNumber} (score: {nft.netScore})
          </option>
        ))}
      </select>

      {/* Queue button */}
      <button
        className="btn btn-primary"
        disabled={!selectedNft || queueing}
        onClick={handleQueue}
      >
        {queueing ? 'Queueing...' : 'Enter Battle Queue'}
      </button>

      {/* Result feedback */}
      {result && (
        <div className={`text-sm ${result.matched ? 'text-accent' : 'text-secondary'}`}>
          {result.message}
        </div>
      )}
      {error && (
        <div className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</div>
      )}
    </div>
  );
}
```

### Integration into BattleView

**File: `src/components/game/BattleView.tsx`**

Add the panel above the battle list, inside the "Battle Queue" card-static section. Replace lines 104-115:

```tsx
// Before (lines 103-116):
return (
  <div className="flex flex-col gap-4">
    {/* Queue info */}
    <div className="card-static p-4 flex items-center justify-between">
      <div>
        <h3 className="font-semibold">Battle Queue</h3>
        <p className="text-xs text-secondary">
          {queueSize === 0
            ? 'No NFTs waiting. Queue yours to start a battle!'
            : `${queueSize} NFT${queueSize > 1 ? 's' : ''} waiting for a match`}
        </p>
      </div>
    </div>

// After:
import { BattleQueuePanel } from './BattleQueuePanel';

return (
  <div className="flex flex-col gap-4">
    {/* Queue your NFT */}
    <BattleQueuePanel onQueued={loadBattles} />

    {/* Queue status */}
    {queueSize > 0 && (
      <div className="text-xs text-secondary px-1">
        {queueSize} NFT{queueSize > 1 ? 's' : ''} waiting for a match
      </div>
    )}
```

---

## 4. Mobile Bottom Nav

### Current State

`MOBILE_NAV_ITEMS` in `src/config/routes.ts` (lines 184-190):
```ts
export const MOBILE_NAV_ITEMS: NavItem[] = [
  PRIMARY_NAV_ITEMS[0], // Gallery
  PRIMARY_NAV_ITEMS[2], // Generator
  PRIMARY_NAV_ITEMS[1], // BigPulp (center FAB)
  PRIMARY_NAV_ITEMS[3], // Games
  MORE_NAV_ITEM,
];
```

This references PRIMARY_NAV_ITEMS by index. Now that Wojak Swipe was inserted at index 4 (between Games and Leaderboard), the indices are:
- [0] Gallery
- [1] BigPulp
- [2] Generator
- [3] Games
- [4] **Wojak Swipe** (new)
- [5] Leaderboard

The current MOBILE_NAV_ITEMS still works correctly because it references indices 0, 2, 1, 3 — all unchanged.

### Question: Should Swipe Be in Mobile Bottom Nav?

**Option A: Keep 5 items, add Swipe to More menu**

This is the lightest touch. Swipe appears in the MoreMenu slide-up sheet. No changes to MOBILE_NAV_ITEMS.

**Changes needed — `src/components/navigation/MoreMenu.tsx`:**

Add at the TOP of `menuItems` array (line 32), before Account:

```ts
{
  icon: Heart,
  label: 'Wojak Swipe',
  description: 'Vote, battle, and climb the leaderboard',
  route: '/swipe',
  badge: 'New',
  iconColor: '#ef4444',
  iconBg: 'rgba(239, 68, 68, 0.15)',
},
```

Add `Heart` to the import from `lucide-react` (line 12).

**Option B: Replace Games with Swipe in bottom nav**

Games becomes a secondary item (moved to More menu). Swipe takes the prime real estate.

```ts
export const MOBILE_NAV_ITEMS: NavItem[] = [
  PRIMARY_NAV_ITEMS[0], // Gallery
  PRIMARY_NAV_ITEMS[2], // Generator
  PRIMARY_NAV_ITEMS[1], // BigPulp (center FAB)
  PRIMARY_NAV_ITEMS[4], // Wojak Swipe (WAS: Games)
  MORE_NAV_ITEM,
];
```

And add Games to MoreMenu.

**Option C: Replace Leaderboard or Generator**

Less impactful — Generator is important for minting, Leaderboard is secondary.

### Recommendation: Option A (More menu)

**Safest for launch.** Don't shuffle the mobile nav — users are used to the current layout. Swipe in the More menu with a "New" badge is still discoverable. After launch, if Swipe becomes the primary activity, promote it to the bottom nav (Option B).

---

## Summary: Task List for CLI Session

### Task 1: Add `getDIDs()` to SageWalletProvider (Option B — MintGarden API)
**Files to modify:**
- `src/sage-wallet/sage-wallet-types.ts` — add `getDIDs` to `SageWalletActions` interface (line 164)
- `src/sage-wallet/SageWalletProvider.tsx` — add `getDIDs` method (after line 482), add to context value (line 506)
**Commit message:** `feat: add getDIDs() method to Sage wallet provider via MintGarden API`

### Task 2: Create SwipeAutoRegister bridge component
**Files to create:**
- `src/components/game/SwipeAutoRegister.tsx` — side-effect component that detects DID and auto-registers
**Files to modify:**
- `src/pages/GameVoting.tsx` — add `<SwipeAutoRegister />` inside GameProvider
- `src/pages/GameDashboard.tsx` — same
- `src/pages/GameBattles.tsx` — same
- `src/pages/GameLeaderboard.tsx` — same
**Commit message:** `feat: auto-detect DID and register for Wojak Swipe on wallet connect`

### Task 3: Update GateChecklist branding
**Files to modify:**
- `src/components/game/GateChecklist.tsx` — change heading to "Wojak Swipe", step 4 to "Start swiping", step 2 to "Link a DID"
**Commit message:** `feat: update GateChecklist with Wojak Swipe branding`

### Task 4: Add BattleQueuePanel
**Files to create:**
- `src/components/game/BattleQueuePanel.tsx` — NFT dropdown + queue button
**Files to modify:**
- `src/components/game/BattleView.tsx` — import and render BattleQueuePanel above battle list
**Commit message:** `feat: add battle queue UI to BattleView`

### Task 5: Add Wojak Swipe to MoreMenu (mobile)
**Files to modify:**
- `src/components/navigation/MoreMenu.tsx` — add Swipe entry at top of menuItems array, add Heart import
**Commit message:** `feat: add Wojak Swipe to mobile More menu`

### Verification
```bash
npx tsc -b          # TypeScript clean
npm run build       # Build succeeds
```
