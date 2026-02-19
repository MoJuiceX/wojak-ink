# Sage Wallet WalletConnect Capabilities

> **Source:** `src/sage-wallet/` codebase analysis + WalletConnect v2 protocol
> **Protocol:** WalletConnect v2 via `@walletconnect/sign-client`
> **Chain:** `chia:mainnet` (also supports `chia:testnet`)
> **Relay:** `wss://relay.walletconnect.com`
> **Project ID:** `500876ce87398e4721f71b6aa681a193` (Reown dashboard)

---

## Architecture Overview

```
src/sage-wallet/
├── index.ts                     # Re-exports everything
├── sage-wallet-types.ts         # All types, constants, ChiaMethod enum
├── SageWalletProvider.tsx        # Context provider + useSageWallet hook (main)
├── useSageWalletStandalone.ts   # Standalone hook (no provider needed)
└── SageWalletComponents.tsx     # UI components (SageConnectButton, NFTGate, etc.)
```

**Two usage patterns:**
1. **Provider pattern** (preferred): Wrap app in `<SageWalletProvider>`, use `useSageWallet()` hook
2. **Standalone pattern**: Use `useSageWalletStandalone()` hook directly (no context needed)

---

## WalletConnect Session Setup

### Required Namespaces (what we request from Sage)

```ts
const requiredNamespaces = {
  chia: {
    methods: [
      'chip0002_getPublicKeys',
      'chia_signMessageByAddress',
      'chia_getAddress',
      'chia_takeOffer',
      'chia_send',
      'chip0002_getAssetBalance',
      'chia_transferNFT',
    ],
    chains: ['chia:mainnet'],
    events: [],
  },
};
```

### Connection Flow

1. `SignClient.init()` with project ID + metadata
2. `WalletConnectModal` opens with QR code / deep link
3. User approves in Sage wallet
4. Session established → `chia_getAddress` called to get XCH address
5. Address validated with `isValidChiaAddress()` (bech32m regex)
6. Session persisted to `localStorage` key `"sage-wallet-session"`
7. Auto-reconnect on page reload via `checkExistingSessions()`

---

## RPC Methods Available

### Methods We Actually Use

| Method | Where Used | Purpose |
|--------|-----------|---------|
| `chia_getAddress` | Session init | Get user's XCH address |
| `chia_signMessageByAddress` | `signMessage()` | Sign arbitrary messages for auth |
| `chip0002_getAssetBalance` | `getAssetBalance()` | Check XCH or CAT balance |
| `chia_takeOffer` | `takeOffer()` | Accept an NFT/token offer |
| `chia_transferNFT` | `transferNFT()` | Transfer NFT to another address (burn) |
| `chia_getNFTInfo` | `getNFTCoinId()` | Resolve launcher ID → current coin ID |

### Methods Registered but NOT Used in Code

| Method | Registered As |
|--------|--------------|
| `chip0002_getPublicKeys` | Required in namespace but never called |
| `chia_send` | Required in namespace but never called |

### Full ChiaMethod Catalog (from sage-wallet-types.ts)

All methods defined in `ChiaMethod` const object. Many are defined but not used. Here are the ones available in Sage:

**CHIP-0002 Methods:**
- `chip0002_getPublicKeys` — Get wallet public keys
- `chip0002_getAssetBalance` — Get XCH or CAT balance
- `chip0002_signMessage` — Sign message (alternative to address-based)
- `chip0002_sendTransaction` — Send a transaction

**Standard Chia Methods:**
- `chia_logIn` — Log into wallet
- `chia_getWallets` — List wallets
- `chia_getTransaction` — Get transaction by ID
- `chia_getWalletBalance` — Get wallet balance
- `chia_getCurrentAddress` — Get current address
- `chia_getPublicKey` — Get public key
- `chia_send` — Send XCH
- `chia_signMessageById` / `chia_signMessageByAddress` — Sign messages
- `chia_getAddress` — Get address
- `chia_takeOffer` — Accept offer
- `chia_verifySignature` — Verify a signature
- `chia_getNextAddress` — Get next unused address
- `chia_getSyncStatus` — Check sync status

**Offer Methods:**
- `chia_getAllOffers` — List offers
- `chia_getOffersCount` — Count offers
- `chia_createOfferForIds` — Create offer
- `chia_cancelOffer` — Cancel offer
- `chia_checkOfferValidity` — Validate offer
- `chia_getOfferSummary` — Summarize offer
- `chia_getOfferData` — Get offer data
- `chia_getOfferRecord` — Get offer record

**CAT (Token) Methods:**
- `chia_createNewCATWallet` — Create CAT wallet
- `chia_getCATWalletInfo` — Get CAT info
- `chia_getCATAssetId` — Get asset ID
- `chia_spendCAT` — Spend CAT tokens
- `chia_addCATToken` — Add token to wallet

**NFT Methods:**
- `chia_getNfts` — List NFTs
- `chia_getNFTInfo` — Get NFT details (returns `nftCoinId`)
- `chia_mintNFT` — Mint new NFT
- `chia_transferNFT` — Transfer NFT
- `chia_getNFTsCount` — Count NFTs

**DID Methods:**
- `chia_createNewDIDWallet` — Create DID
- `chia_setDIDName` — Set DID name
- `chia_setNFTDID` — Assign NFT to DID
- `chia_getNFTWalletsWithDIDs` — Get NFT wallets with DIDs
- `chia_getWalletAddresses` — Get wallet addresses

---

## Hook API (`useSageWallet()`)

### State

```ts
interface SageWalletState {
  status: 'disconnected' | 'connecting' | 'connected';
  address: string;         // XCH address (xch1...)
  session: SageSession | null;
  error: string | null;
  isInitialized: boolean;
}
```

### Actions

```ts
interface SageWalletActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<SignMessageResult>;
  getAssetBalance: (assetId?: string | null) => Promise<AssetBalance>;
  takeOffer: (offer: string, fee?: number) => Promise<unknown>;
  transferNFT: (nftCoinId: string, targetAddress: string, fee?: number) => Promise<unknown>;
  hasRequiredNFTs: (collectionId: string) => Promise<boolean>;
  getNFTs: (collectionId?: string) => Promise<MintGardenNFT[]>;
  getDIDs: () => Promise<string[]>;
  getNFTCoinId: (launcherId: string) => Promise<string>;
}
```

### Key Type Definitions

```ts
interface SignMessageResult {
  signature: string;
  publicKey: string;
}

interface AssetBalance {
  confirmed: string;   // Total confirmed balance
  spendable: string;   // Spendable balance
  pending: string;     // Pending balance
}

// MintGarden NFT (from API responses — NOT from wallet RPC)
interface MintGardenNFT {
  encoded_id: string;
  name: string;
  collection_id: string;
  collection_name: string;
  preview_uri: string;
  thumbnail_uri: string;
  data_uri: string;
  owner_address: string;
  minter_address: string;
  mint_height: number;
}
```

---

## Detailed Method Behavior

### `connect()`
Opens WalletConnect modal → user scans QR or deep links to Sage → session established → calls `chia_getAddress` → validates address → stores in localStorage.

### `disconnect()`
Sends `USER_DISCONNECTED` reason via WalletConnect → clears session from localStorage and state.

### `signMessage(message: string)`
```ts
// RPC call:
{ method: 'chia_signMessageByAddress', params: { address, message } }
// Returns:
{ signature: string, publicKey: string }
```

### `getAssetBalance(assetId?)`
```ts
// XCH balance:
{ method: 'chip0002_getAssetBalance', params: { type: 'xch' } }
// CAT token balance:
{ method: 'chip0002_getAssetBalance', params: { type: 'cat', assetId: '...' } }
// Returns:
{ confirmed: '1000000000000', spendable: '1000000000000', pending: '0' }
```
Note: Values are in mojos (1 XCH = 1,000,000,000,000 mojos).

### `takeOffer(offer, fee?)`
```ts
// RPC call:
{ method: 'chia_takeOffer', params: { offer: '...offer_string...', fee: 0 } }
```
Used for accepting NFT purchase offers. The `offer` string is a Chia offer file.

### `transferNFT(nftCoinId, targetAddress, fee?)`
```ts
// RPC call:
{ method: 'chia_transferNFT', params: { nftCoinId, targetAddress, fee: 0 } }
```
**Used for burning:** Transfer NFT to a burn address. Requires the current coin ID (not launcher ID).

### `getNFTCoinId(launcherId)`
```ts
// RPC call:
{ method: 'chia_getNFTInfo', params: { coinId: launcherId } }
// Returns:
{ nftCoinId: '...' } // or { nft_coin_id: '...' }
```
Resolves an NFT launcher ID (permanent, starts with `nft1...`) to its current coin ID (changes with every spend). Required before `transferNFT`.

### `hasRequiredNFTs(collectionId)`
**NOT a wallet RPC call** — uses MintGarden API:
```
GET https://api.mintgarden.io/address/{xch_address}/nfts?type=owned&collection_id={col}
```
Returns `true` if `items.length > 0`.

### `getNFTs(collectionId?)`
**NOT a wallet RPC call** — uses MintGarden API:
```
GET https://api.mintgarden.io/address/{xch_address}/nfts?type=owned[&collection_id={col}]
```
Returns array of `MintGardenNFT`.

### `getDIDs()`
**Two-step:**
1. First tries to extract DIDs from WalletConnect session accounts
   - Session accounts format: `"chia:mainnet:did:chia:1abc..."` or `"chia:mainnet:xch1..."`
   - Filters for accounts where `parts[2] === 'did'`
2. Fallback: queries MintGarden API for `owner_encoded_id` from user's NFTs
   ```
   GET https://api.mintgarden.io/address/{xch}/nfts?type=owned&size=5
   ```
   Extracts unique `owner_encoded_id` values that start with `did:chia:`.

---

## Components

### `<SageConnectButton>`
Styled connect/disconnect button with variants (`primary`, `secondary`, `glass`), sizes (`sm`, `md`, `lg`), and auto-shortening of address.

### `<SageWalletStatus>`
Glassmorphism status card showing connection state, address, optional session info.

### `<NFTGate>`
Conditional render based on NFT ownership:
```tsx
<NFTGate collectionId="col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah">
  {/* Only renders if user holds NFT from collection */}
  <ProtectedContent />
</NFTGate>
```
Has customizable `fallback`, `loadingComponent`, `onAccessGranted`, `onAccessDenied` props.

### `<WalletFAB>`
Floating action button for mobile — shows 🔗 when disconnected, 🍊 when connected.

---

## Configuration

```ts
interface SageWalletConfig {
  projectId?: string;        // WalletConnect project ID (default: from constants)
  metadata?: {               // App metadata shown in wallet
    name: string;            // 'Wojak.ink'
    description: string;     // 'Tang Gang NFT Collection'
    url: string;             // window.location.origin
    icons: string[];         // ['https://wojak.ink/favicon.ico']
  };
  relayUrl?: string;         // 'wss://relay.walletconnect.com'
  storageKey?: string;       // 'sage-wallet-session'
  autoConnect?: boolean;     // true — reconnect on page load
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}
```

---

## WalletConnect Events

| Event | Handler | Behavior |
|-------|---------|----------|
| `session_delete` | `handleDisconnect()` | Clears state + localStorage |
| `session_update` | `updateAddressFromWallet()` | Re-fetches address |

---

## What Sage Wallet CAN Do (that we don't use yet)

Based on the registered methods, these capabilities exist but are not wired up:

1. **`chia_send`** — Send XCH to an address. Could be used for tipping or payments.
2. **`chia_createOfferForIds`** — Create offers programmatically. Could enable in-app marketplace.
3. **`chia_getNfts`** — Get NFTs directly from wallet (instead of MintGarden API).
4. **`chia_getSyncStatus`** — Check if wallet is synced before operations.
5. **`chia_setNFTDID`** — Assign an NFT to a DID. Could automate DID assignment.
6. **`chip0002_getPublicKeys`** — Already in required namespace but never called.
7. **`chia_mintNFT`** — Mint NFTs directly through wallet (we use server-side minting instead).

---

## Dependencies

```json
{
  "@walletconnect/sign-client": "^2.x",
  "@walletconnect/modal": "^2.x",
  "@walletconnect/utils": "^2.x",
  "@walletconnect/types": "^2.x"
}
```

These are the WalletConnect v2 SDK packages. The modal provides the QR code UI. The sign client handles the actual RPC communication.

---

## How Wojak.ink Uses Sage Wallet

| Feature | Method | Details |
|---------|--------|---------|
| Wallet connection | `connect()` / `disconnect()` | WalletConnect modal flow |
| Gate check (step 0) | `status === 'connected'` | GateChecklist step 0 |
| Address display | `address` state | Header, dashboard, etc. |
| NFT ownership check | `hasRequiredNFTs()` | Uses MintGarden `/address/` API |
| Phase 1 verification | Server-side `verify-phase1.ts` | Uses MintGarden API directly |
| NFT burning | `getNFTCoinId()` → `transferNFT()` | CollectionScroll burn button |
| DID discovery | `getDIDs()` | Session accounts or MintGarden fallback |
| Balance check | `getAssetBalance()` | MintFlowModal payment verification |
| Offer acceptance | `takeOffer()` | Shop/marketplace offers |
| Message signing | `signMessage()` | Auth verification |

---

## Known Issues / Gaps

1. **DID auto-detection unreliable:** `getDIDs()` relies on session accounts containing DID entries. If Sage doesn't include them, falls back to MintGarden API which may return DIDs from ANY owned NFT, not necessarily the user's own DID.

2. **No `chia_getNfts` usage:** We query MintGarden API for NFT data instead of asking the wallet directly. This means we see blockchain-confirmed state (which lags) rather than local wallet state.

3. **Error handling varies:** Some methods throw on failure, others return empty/false. No consistent error type.

4. **Standalone hook missing `getDIDs` and `getNFTCoinId`:** The standalone hook (`useSageWalletStandalone.ts`) doesn't implement these methods — only available via the provider.
