# API Calls Complete Guide

**Wojak Ink - All External API Integrations**

This document provides a comprehensive reference for all API calls made to external services: MintGarden, Dexie, SpaceScan, and CoinGecko.

---

## Table of Contents

1. [MintGarden API](#mintgarden-api)
2. [Dexie API](#dexie-api)
3. [SpaceScan API](#spacescan-api)
4. [CoinGecko API](#coingecko-api)
5. [API Configuration](#api-configuration)
6. [Proxy Setup](#proxy-setup)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## MintGarden API

### Base URL
```
https://api.mintgarden.io
```

### Collection ID
```
col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
```

### Service Files
- **Primary Service**: `src/services/mintgardenApi.js`
- **Offers Service**: `src/services/mintgardenOffersApi.js`

---

### 1. Fetch NFT Details by Launcher ID

**Endpoint**: `GET /nfts/{launcherBech32}`

**File**: `src/services/mintgardenApi.js`

**Function**: `fetchNFTDetails(launcherBech32)`

**Request**:
```javascript
GET https://api.mintgarden.io/nfts/{launcherBech32}
```

**Parameters**:
- `launcherBech32` (string, required) - NFT launcher ID in bech32 format (e.g., `nft1...`)

**Response**: Returns `NftWithAuctions` object

**Retry Logic**:
- Max retries: 3
- Timeout: 10000ms
- Base delay: 1000ms
- Retry on: 429, 502, 503, 504

**Usage Example**:
```javascript
import { fetchNFTDetails } from './services/mintgardenApi'

const nftData = await fetchNFTDetails('nft1abc123...')
```

---

### 2. Get NFT Thumbnail URL

**Endpoint**: `GET /nfts/{launcherBech32}/thumbnail`

**File**: `src/services/mintgardenApi.js`

**Function**: `getNFTThumbnailUrl(launcherBech32)`

**Request**:
```javascript
GET https://api.mintgarden.io/nfts/{launcherBech32}/thumbnail
```

**Returns**: Direct URL string (no API call, just URL construction)

**Usage Example**:
```javascript
import { getNFTThumbnailUrl } from './services/mintgardenApi'

const thumbnailUrl = getNFTThumbnailUrl('nft1abc123...')
// Returns: "https://api.mintgarden.io/nfts/nft1abc123.../thumbnail"
```

---

### 3. Search NFTs

**Endpoint**: `GET /search/nfts`

**File**: `src/services/mintgardenApi.js`

**Function**: `searchNFTs(query)`

**Request**:
```javascript
GET https://api.mintgarden.io/search/nfts?query={encodedQuery}
```

**Parameters**:
- `query` (string, required) - Search query (name, collection, etc.)

**Response**: 
```json
{
  "items": [...]
}
```

**Usage Example**:
```javascript
import { searchNFTs } from './services/mintgardenApi'

const results = await searchNFTs('Wojak #123')
```

---

### 4. Get Collection NFTs

**Endpoint**: `GET /collections/{collectionId}/nfts`

**File**: `src/services/mintgardenApi.js`

**Function**: `getCollectionNFTs(collectionId, options)`

**Request**:
```javascript
GET https://api.mintgarden.io/collections/{collectionId}/nfts?size={size}&search={search}&require_price={require_price}
```

**Parameters**:
- `collectionId` (string, required) - Collection ID
- `options.size` (number, optional) - Number of NFTs per page (default: 50)
- `options.search` (string, optional) - Search filter
- `options.require_price` (boolean, optional) - Only NFTs with prices

**Response**:
```json
{
  "items": [...]
}
```

**Usage Example**:
```javascript
import { getCollectionNFTs } from './services/mintgardenApi'

const nfts = await getCollectionNFTs(COLLECTION_ID, {
  size: 100,
  require_price: true
})
```

---

### 5. Fetch NFTs with Offers (Paginated)

**Endpoint**: `GET /collections/{collectionId}/nfts/by_offers`

**File**: `src/services/mintgardenOffersApi.js`

**Function**: `fetchMintGardenOffersPage(page, size)`

**Request**:
```javascript
GET https://api.mintgarden.io/collections/{collectionId}/nfts/by_offers?page={page}&size={size}&sort_by=xch_price&require_price=true
```

**Parameters**:
- `page` (string|null, optional) - Cursor for pagination (from previous response)
- `size` (number, optional) - Items per page (max 100, default: 100)

**Query Parameters**:
- `sort_by=xch_price` - Sort by price (lowest first)
- `require_price=true` - Only NFTs with active offers

**Response**:
```json
{
  "items": [...],
  "page": "cursor_string",
  "size": 100,
  "next": "next_cursor_string" | null,
  "previous": "previous_cursor_string" | null
}
```

**Pagination**: Cursor-based (use `next` field from response)

**Usage Example**:
```javascript
import { fetchMintGardenOffersPage } from './services/mintgardenOffersApi'

const response = await fetchMintGardenOffersPage(null, 100)
const nextPage = await fetchMintGardenOffersPage(response.next, 100)
```

---

### 6. Fetch All Active Offers

**File**: `src/services/mintgardenOffersApi.js`

**Function**: `fetchAllMintGardenActiveOffers()`

**Description**: Fetches all NFTs with active offers using pagination

**Pagination**:
- Max pages: 50 (safety limit)
- Delay between pages: 300ms
- Stops on error or when `next` is null

**Returns**: Array of NFT objects with active offers

**Usage Example**:
```javascript
import { fetchAllMintGardenActiveOffers } from './services/mintgardenOffersApi'

const allNfts = await fetchAllMintGardenActiveOffers()
```

---

### 7. Build Offers Map

**File**: `src/services/mintgardenOffersApi.js`

**Function**: `buildMintGardenOffersMap(nfts)`

**Description**: Converts array of NFTs into a Map for quick lookup

**Returns**: `Map<string, Object>` where key is NFT ID and value is offer object

**Fields Added**:
- `_nftId` - Extracted NFT ID (token_id)
- `_priceXch` - Price in XCH
- `_source: 'mintgarden'` - Source identifier

**Usage Example**:
```javascript
import { buildMintGardenOffersMap } from './services/mintgardenOffersApi'

const offersMap = buildMintGardenOffersMap(nfts)
const nftOffer = offersMap.get('123')
```

---

### MintGarden Helper Functions

#### Extract NFT ID from MintGarden NFT

**File**: `src/services/mintgardenOffersApi.js`

**Function**: `extractNftIdFromMintGardenNft(nft)`

**Priority Order**:
1. `nft.token_id` (most reliable)
2. `nft.edition_number`
3. Extract from `nft.name` pattern `#123`

**Returns**: `string|null` - NFT ID (1-4200) or null

---

#### Extract Price from MintGarden NFT

**File**: `src/services/mintgardenOffersApi.js`

**Function**: `extractPriceFromMintGardenNft(nft)`

**Priority Order**:
1. `nft.price` (direct price field)
2. `nft.xch_price`

**Mojos Conversion**: If value >= 1e9, converts to XCH (divides by 1e12)

**Returns**: `number|null` - Price in XCH or null

---

#### Extract Token ID from MintGarden Response

**File**: `src/services/mintgardenApi.js`

**Function**: `extractTokenIdFromMintGarden(mintGardenData)`

**Priority Order**:
1. `metadata_json.token_id`
2. `data.token_id`
3. Extract from `metadata_json.image` pattern `/####.png`
4. Extract from `metadata_json.name` pattern `#123` or `NFT #123`
5. `metadata_json.edition_number`

**Returns**: `string|null` - Token ID or null

---

#### Get IPFS Thumbnail URL

**File**: `src/services/mintgardenApi.js`

**Function**: `getIPFSThumbnailUrl(mintGardenData)`

**IPFS Base**: `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link`

**Format**: `{IPFS_BASE}/{tokenId4}.png` (token ID padded to 4 digits)

**Returns**: `string|null` - IPFS URL or null

---

## Dexie API

### Base URL
```
https://api.dexie.space/v1
```

### Collection ID
```
col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
```

### Service Files
- **Offers Service**: `src/services/dexieOffersApi.js`
- **Trades Service**: `src/services/dexieTradesApi.js`
- **Offer Parser**: `src/services/mintgardenApi.js` (contains Dexie offer parsing)

---

### 1. Fetch Offers (Paginated)

**Endpoint**: `GET /v1/offers`

**File**: `src/services/dexieOffersApi.js`

**Function**: `fetchDexieOffersPage(page, pageSize)`

**Request**:
```javascript
GET https://api.dexie.space/v1/offers?type=nft&collection={collectionId}&status=0&page_size={pageSize}&page={page}
```

**Parameters**:
- `page` (number, optional) - Page number (1-indexed, default: 1)
- `pageSize` (number, optional) - Items per page (max 100, default: 100)

**Query Parameters**:
- `type=nft` - Filter for NFT offers
- `collection={collectionId}` - Collection ID
- `status=0` - Active offers only (0 = Open/Active)
- `page_size` - Items per page (max 100)
- `page` - Page number (1-indexed)

**Response**:
```json
{
  "success": true,
  "count": 100,
  "page": 1,
  "page_size": 100,
  "offers": [...]
}
```

**Status Codes**:
- `0` = Open/Active
- Other statuses = Cancelled/Completed

**Usage Example**:
```javascript
import { fetchDexieOffersPage } from './services/dexieOffersApi'

const response = await fetchDexieOffersPage(1, 100)
```

---

### 2. Fetch All Active Offers

**File**: `src/services/dexieOffersApi.js`

**Function**: `fetchAllDexieActiveOffers()`

**Description**: Fetches all active offers using pagination

**Pagination**:
- Stops when page returns 0 offers
- Delay between pages: 500ms
- Stops on error

**Filtering**: Only includes offers with `status === 0`

**Returns**: Array of active offer objects

**Usage Example**:
```javascript
import { fetchAllDexieActiveOffers } from './services/dexieOffersApi'

const allOffers = await fetchAllDexieActiveOffers()
```

---

### 3. Build Offers Map

**File**: `src/services/dexieOffersApi.js`

**Function**: `buildDexieOffersMap(offers)`

**Description**: Converts array of offers into a Map for quick lookup

**Returns**: `Map<string, Object>` where key is NFT ID and value is offer object

**Fields Added**:
- `_nftId` - Extracted NFT ID
- `_priceXch` - Price in XCH
- `_source: 'dexie'` - Source identifier

**Deduplication**: If multiple offers for same NFT, keeps lowest price

**Usage Example**:
```javascript
import { buildDexieOffersMap } from './services/dexieOffersApi'

const offersMap = buildDexieOffersMap(offers)
```

---

### 4. Fetch Completed Trades (Paginated)

**Endpoint**: `GET /v1/offers`

**File**: `src/services/dexieTradesApi.js`

**Function**: `fetchDexieTradesPage(page, pageSize)`

**Request**:
```javascript
GET https://api.dexie.space/v1/offers?type=nft&collection={collectionId}&status=4&page_size={pageSize}&page={page}
```

**Parameters**:
- `page` (number, optional) - Page number (1-indexed, default: 1)
- `pageSize` (number, optional) - Items per page (max 100, default: 100)

**Query Parameters**:
- `type=nft` - Filter for NFT trades
- `collection={collectionId}` - Collection ID
- `status=4` - Completed trades only (4 = Completed)
- `page_size` - Items per page (max 100)
- `page` - Page number (1-indexed)

**Response**:
```json
{
  "success": true,
  "count": 100,
  "page": 1,
  "page_size": 100,
  "offers": [...]
}
```

**Known Limitation**: The Dexie API's `collection` parameter doesn't filter correctly - it returns trades from all collections. Client-side filtering would require querying MintGarden for each NFT launcher, which is not feasible due to API rate limits.

**Usage Example**:
```javascript
import { fetchDexieTradesPage } from './services/dexieTradesApi'

const response = await fetchDexieTradesPage(1, 100)
```

---

### 5. Fetch All Completed Trades

**File**: `src/services/dexieTradesApi.js`

**Function**: `fetchAllDexieCompletedTrades(maxPages)`

**Description**: Fetches all completed trades using pagination

**Parameters**:
- `maxPages` (number, optional) - Maximum pages to fetch (default: 50)

**Pagination**:
- Max pages: 50 (default, configurable)
- Delay between pages: 500ms
- Stops on error or when page returns 0 trades

**Filtering**: Only includes trades with `status === 4`

**Returns**: Array of completed trade objects

**Usage Example**:
```javascript
import { fetchAllDexieCompletedTrades } from './services/dexieTradesApi'

const allTrades = await fetchAllDexieCompletedTrades(50)
```

---

### 6. Build Trades List

**File**: `src/services/dexieTradesApi.js`

**Function**: `buildDexieTradesList(trades)`

**Description**: Converts array of trades into structured list

**Returns**: Array of trade objects with extracted data:
```javascript
{
  nftId: string,
  priceXch: number | null,
  timestamp: number, // milliseconds
  timestampISO: string,
  tradeId: string,
  source: 'dexie',
  raw: Object // Original trade object
}
```

**Usage Example**:
```javascript
import { buildDexieTradesList } from './services/dexieTradesApi'

const tradesList = buildDexieTradesList(trades)
```

---

### 7. Query Offer from Dexie (POST)

**Endpoint**: `POST /v1/offers`

**File**: `src/services/mintgardenApi.js`

**Function**: `getOfferFromDexie(offerFileString)`

**Request**:
```javascript
POST https://api.dexie.space/v1/offers
Content-Type: application/json

{
  "offer": "{offerFileString}"
}
```

**Parameters**:
- `offerFileString` (string, required) - The offer file string to parse

**Response**:
```json
{
  "success": true,
  "offer": {...}
}
```

**Error Handling**:
- `429` - Rate limit error
- Other errors return `null`

**Usage Example**:
```javascript
import { getOfferFromDexie } from './services/mintgardenApi'

const offerData = await getOfferFromDexie(offerFileString)
```

---

### 8. Extract NFT IDs from Dexie Offer

**File**: `src/services/mintgardenApi.js`

**Function**: `extractNFTIdsFromDexieOffer(offerData)`

**Description**: Extracts NFT launcher IDs from Dexie offer response

**Priority**:
1. `offerData.requested` array - Check for `nft1...` (bech32) or 64-char hex
2. `offerData.offered` array - Check for `nft1...` (bech32) or 64-char hex
3. Skips `involved_coins` (contains coin IDs, not NFT launcher IDs)

**Returns**: Array of NFT launcher IDs (bech32 format prioritized)

**Usage Example**:
```javascript
import { extractNFTIdsFromDexieOffer } from './services/mintgardenApi'

const nftIds = extractNFTIdsFromDexieOffer(offerData)
```

---

### Dexie Helper Functions

#### Extract NFT ID from Dexie Offer

**File**: `src/services/dexieOffersApi.js`

**Function**: `extractNftIdFromDexieOffer(offer)`

**Priority Order**:
1. `offer.offered[].edition` (if `type === 'nft'` and `asset_id === collectionId`)
2. `offer.offered[].name` pattern `#123`
3. `offer.requested[].edition` (if `type === 'nft'` and `asset_id === collectionId`)
4. `offer.requested[].name` pattern `#123`

**Returns**: `string|null` - NFT ID (1-4200) or null

---

#### Extract Price from Dexie Offer

**File**: `src/services/dexieOffersApi.js`

**Function**: `extractPriceFromDexieOffer(offer)`

**Priority Order**:
1. `offer.price` (direct price field)
2. `offer.requested[].amount` (if `type === 'xch'` or `asset_id === null`)
3. `offer.offered[].amount` (if `type === 'xch'` or `asset_id === null`)

**Mojos Conversion**: If value >= 1e9, converts to XCH (divides by 1e12)

**Returns**: `number|null` - Price in XCH or null

---

#### Extract NFT ID from Dexie Trade

**File**: `src/services/dexieTradesApi.js`

**Function**: `extractNftIdFromDexieTrade(trade)`

**Same logic as `extractNftIdFromDexieOffer`** (trades have same structure as offers)

---

#### Extract Price from Dexie Trade

**File**: `src/services/dexieTradesApi.js`

**Function**: `extractPriceFromDexieTrade(trade)`

**Logic**:
- If NFT is in `trade.offered`, get XCH from `trade.requested`
- If NFT is in `trade.requested`, get XCH from `trade.offered`
- Look for XCH in assets where `asset_id === 'xch'` or `asset_id === null`

**Mojos Conversion**: If value >= 1e9, converts to XCH (divides by 1e12)

**Returns**: `number|null` - Price in XCH or null

---

#### Extract Timestamp from Dexie Trade

**File**: `src/services/dexieTradesApi.js`

**Function**: `extractTimestampFromDexieTrade(trade)`

**Priority Order**:
1. `trade.date_completed` (preferred for completed trades)
2. `trade.date_created` (fallback)

**Timestamp Handling**:
- String: Parse with `Date.parse()`
- Number: If > 10_000_000_000, assume milliseconds; otherwise, assume seconds (multiply by 1000)

**Returns**: `number|null` - Timestamp in milliseconds or null

---

## SpaceScan API

### Base URL
```
https://api.spacescan.io
```

### API Version
```
api2.spacescan.io (for proxy)
```

### Collection ID
```
col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
```

### Service Files
- **Offers Service**: `src/services/spacescanOffersApi.js`
- **Treasury Service**: `src/services/treasuryApi.js` (wallet balances)
- **Proxy Function**: `functions/api/spacescan-proxy.js`

---

### 1. Fetch Offers (Paginated) - Via Proxy

**Endpoint**: `GET /api/spacescan-proxy`

**File**: `src/services/spacescanOffersApi.js`

**Function**: `fetchOffersPage(page, count)`

**Request** (Client-side):
```javascript
GET /api/spacescan-proxy?count={count}&page={page}
```

**Proxy Function**: `functions/api/spacescan-proxy.js`

**Actual API Endpoint**:
```
https://api.spacescan.io/offers/asset
```

**Parameters**:
- `page` (number, optional) - Page number (1-indexed, default: 1)
- `count` (number, optional) - Items per page (max 100, default: 100)

**Why Proxy?**: Avoids CORS issues in development

**Response**: Array of offer objects (format varies)

**Usage Example**:
```javascript
import { fetchOffersPage } from './services/spacescanOffersApi'

const response = await fetchOffersPage(1, 100)
```

---

### 2. Fetch All Active Offers

**File**: `src/services/spacescanOffersApi.js`

**Function**: `fetchAllActiveOffers()`

**Description**: Fetches all active offers using pagination

**Pagination**:
- Max pages: 5 (reduced to avoid rate limits)
- Delay between pages: 5000ms (5 seconds - very conservative)
- Stops immediately on rate limit (429)
- Stops on first error (no retries)

**Filtering**: Only includes offers with active status:
- Excludes: `cancelled`, `settled`, `completed`, `closed`, `expired`
- Excludes offers with `settled` timestamp

**Rate Limiting**:
- Circuit breaker: Stops immediately on first 429 error
- No retries to avoid further rate limits

**Returns**: Array of active offer objects

**Usage Example**:
```javascript
import { fetchAllActiveOffers } from './services/spacescanOffersApi'

const allOffers = await fetchAllActiveOffers()
```

---

### 3. Build Offers Map

**File**: `src/services/spacescanOffersApi.js`

**Function**: `buildOffersMap(offers)`

**Description**: Converts array of offers into a Map for quick lookup

**Returns**: `Map<string, Object>` where key is NFT ID and value is offer object

**Fields Added**:
- `_nftId` - Extracted NFT ID
- `_priceXch` - Price in XCH

**Deduplication**: If multiple offers for same NFT, keeps lowest price

**Usage Example**:
```javascript
import { buildOffersMap } from './services/spacescanOffersApi'

const offersMap = buildOffersMap(offers)
```

---

### 4. Fetch Wallet Balances

**Endpoint**: Multiple (with fallbacks)

**File**: `src/services/treasuryApi.js`

**Function**: `fetchWalletBalances(address, bypassCache)`

**Endpoints (in order of priority)**:

**Development**:
1. `/xchscan-api/address/{address}` (XCHScan via Vite proxy)
2. `/spacescan-api/1/xch/address/balance/{address}` (Spacescan api2 via Vite proxy)
3. `/api/wallet-balances?address={address}` (Cloudflare function)

**Production**:
1. `/api/wallet-balances?address={address}` (Cloudflare function with its own fallbacks)

**Cloudflare Function**: `functions/api/wallet-balances.js`

**Actual API Endpoints** (from Cloudflare function):
- `https://api.xchscan.com/address/{address}` (primary)
- `https://api2.spacescan.io/1/xch/address/balance/{address}` (fallback)

**Parameters**:
- `address` (string, required) - Chia wallet address
- `bypassCache` (boolean, optional) - Bypass cache and fetch fresh data (default: false)

**Response**: Normalized balance data:
```javascript
{
  xch: {
    amount_mojos: number,
    amount_xch: number
  },
  cats: [
    {
      asset_id: string,
      symbol: string,
      amount_mojos: number,
      amount_tokens: number,
      decimals: number
    }
  ],
  raw: Object // Original API response
}
```

**Caching**: Uses `treasuryCache` with duration `CACHE_DURATION.WALLET_BALANCES`

**Error Handling**: Tries each endpoint in order until one succeeds

**Usage Example**:
```javascript
import { fetchWalletBalances } from './services/treasuryApi'

const balances = await fetchWalletBalances('xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk')
```

---

### SpaceScan Helper Functions

#### Extract NFT ID from Offer

**File**: `src/services/spacescanOffersApi.js`

**Function**: `extractNftIdFromOffer(offer)`

**Priority Order** (checks these fields):
1. `offer.nft_id`
2. `offer.token_id`
3. `offer.asset_id`
4. `offer.launcher_id`
5. `offer.launcher`
6. `offer.internal_id`
7. `offer.id`

**Nested Objects**: Also checks `offer.nft` and `offer.asset` recursively

**Validation**: Must be numeric and between 1-4200

**Returns**: `string|null` - NFT ID or null

---

#### Extract Price from Offer

**File**: `src/services/spacescanOffersApi.js`

**Function**: `extractPriceFromOffer(offer)`

**Priority Order** (checks these fields):
1. `offer.price`
2. `offer.price_xch`
3. `offer.xch_price`
4. `offer.amount`
5. `offer.amount_xch`
6. `offer.offer_price`
7. `offer.offer_amount`

**Mojos Conversion**: If value >= 1e9, converts to XCH (divides by 1e12)

**Returns**: `number|null` - Price in XCH or null

---

## CoinGecko API

### Base URL
```
https://api.coingecko.com/api/v3
```

### Service Files
- **Treasury Service**: `src/services/treasuryApi.js`

---

### 1. Fetch XCH/USD Price

**Endpoint**: `GET /api/v3/simple/price`

**File**: `src/services/treasuryApi.js`

**Function**: `fetchXCHPrice(bypassCache)`

**Request**:

**Development** (via proxy):
```javascript
GET /coingecko-api/api/v3/simple/price?ids=chia&vs_currencies=usd
```

**Production**:
```javascript
GET https://api.coingecko.com/api/v3/simple/price?ids=chia&vs_currencies=usd
```

**Parameters**:
- `bypassCache` (boolean, optional) - Bypass cache and fetch fresh data (default: false)

**Query Parameters**:
- `ids=chia` - Chia token ID
- `vs_currencies=usd` - Currency to convert to

**Response**:
```json
{
  "chia": {
    "usd": 123.45
  }
}
```

**Returns**: `number` - XCH price in USD (or 0 if unavailable)

**Caching**: Uses `treasuryCache` with duration `CACHE_DURATION.XCH_PRICE`

**Error Handling**:
- On rate limit (429): Returns cached value or 0
- On 404: Returns cached value or 0
- On timeout: Returns cached value or 0
- On offline: Returns cached value or 0
- Other errors: Returns cached value or 0

**Retry Logic**:
- Max retries: 1
- Timeout: 10000ms
- Base delay: 2000ms
- Retry on: 502, 503, 504 (not 429)

**Usage Example**:
```javascript
import { fetchXCHPrice } from './services/treasuryApi'

const xchPrice = await fetchXCHPrice()
// Returns: 123.45 (USD price)
```

---

## API Configuration

### Constants File

**File**: `src/utils/treasuryConstants.js`

**Exports**:
```javascript
export const WALLET_ADDRESS = 'xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk'

export const TIBETSWAP_API_BASE = 'https://api.v2.tibetswap.io'
export const SPACESCAN_API_BASE = 'https://api.spacescan.io'
export const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

export const XCH_DECIMALS = 12

export const CAT_TOKENS = [
  // 12 CAT token definitions
]
```

---

### Collection ID

**Used Across All Services**:
```
col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
```

**Definition Locations**:
- `src/services/mintgardenOffersApi.js`
- `src/services/dexieOffersApi.js`
- `src/services/dexieTradesApi.js`
- `src/services/spacescanOffersApi.js`

---

## Proxy Setup

### Vite Development Proxy

**File**: `vite.config.js`

**Proxy Configuration**:

```javascript
proxy: {
  // Cloudflare Pages functions
  '/api': {
    target: 'http://localhost:8788',
    changeOrigin: true,
    rewrite: (path) => path
  },
  
  // Treasury APIs
  '/treasury-api': {
    target: 'https://api.v2.tibetswap.io',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/treasury-api/, '')
  },
  
  // XCHScan API (primary)
  '/xchscan-api': {
    target: 'https://api.xchscan.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/xchscan-api/, '')
  },
  
  // Spacescan API (fallback)
  '/spacescan-api': {
    target: 'https://api2.spacescan.io',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/spacescan-api/, '')
  },
  
  // CoinGecko API
  '/coingecko-api': {
    target: 'https://api.coingecko.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/coingecko-api/, '')
  }
}
```

**Purpose**: Avoids CORS issues in development

**Usage**: Only active in development mode (`import.meta.env.DEV`)

---

### Cloudflare Functions (Production)

**Location**: `functions/api/`

**Functions**:
- `spacescan-proxy.js` - Proxies SpaceScan API requests
- `wallet-balances.js` - Fetches wallet balances with fallbacks

**Purpose**: Handles API calls server-side to avoid CORS and rate limits

---

## Error Handling

### Retry Logic

**Utility**: `src/utils/apiRetry.js`

**Function**: `fetchWithRetry(url, options, retryConfig)`

**Retry Configuration**:
```javascript
{
  maxRetries: number,        // Maximum retry attempts
  timeout: number,           // Request timeout in ms
  baseDelay: number,         // Base delay between retries in ms
  retryStatuses: number[]    // HTTP status codes to retry on
}
```

**Common Retry Statuses**:
- `429` - Rate limit (some APIs)
- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout

---

### Error Messages

**User-Friendly Messages**:
- Timeout: "Request timed out. Please try again."
- Offline: "You are offline. Please check your internet connection."
- Rate Limit: "Rate limit exceeded. Please wait a moment and try again."

**Location**: `src/services/mintgardenApi.js` (example)

---

## Rate Limiting

### MintGarden

**Strategy**:
- Retry on 429 (up to 3 times)
- Delay between pagination: 300ms
- Max pages: 50 (safety limit)

---

### Dexie

**Strategy**:
- Delay between pagination: 500ms
- No explicit retry logic (stops on error)
- Max pages: 50 (for trades)

---

### SpaceScan

**Strategy**:
- **Very Conservative**: 5000ms (5 seconds) delay between pages
- **Circuit Breaker**: Stops immediately on first 429 error
- **No Retries**: Prevents further rate limit errors
- **Max Pages**: 5 (reduced to avoid rate limits)

**Why So Conservative?**: SpaceScan API is very sensitive to rate limits

---

### CoinGecko

**Strategy**:
- Max retries: 1
- Base delay: 2000ms
- **No Retry on 429**: Uses cache instead
- Returns 0 if unavailable (graceful degradation)

---

## Caching

### Treasury Cache

**File**: `src/utils/treasuryCache.js`

**Cache Durations**:
```javascript
CACHE_DURATION = {
  WALLET_BALANCES: 5 * 60 * 1000,      // 5 minutes
  XCH_PRICE: 5 * 60 * 1000,            // 5 minutes
  TIBETSWAP_PAIRS: 30 * 60 * 1000      // 30 minutes
}
```

**Storage**: `localStorage`

**Keys**:
- `wojak_ink_wallet_balances_{address}`
- `wojak_ink_xch_price`
- `wojak_ink_tibetswap_pairs`

---

## Summary

### API Endpoints Summary

| Service | Base URL | Primary Use | Rate Limit Strategy |
|---------|----------|-------------|---------------------|
| **MintGarden** | `https://api.mintgarden.io` | NFT details, offers, search | Retry on 429, 300ms delay |
| **Dexie** | `https://api.dexie.space/v1` | Offers, trades | 500ms delay, no retries |
| **SpaceScan** | `https://api.spacescan.io` | Offers, wallet balances | 5s delay, circuit breaker |
| **CoinGecko** | `https://api.coingecko.com/api/v3` | XCH/USD price | Cache on 429, 1 retry |

---

### Service Files Summary

| Service | Files | Functions |
|---------|-------|-----------|
| **MintGarden** | `mintgardenApi.js`, `mintgardenOffersApi.js` | 10+ functions |
| **Dexie** | `dexieOffersApi.js`, `dexieTradesApi.js` | 10+ functions |
| **SpaceScan** | `spacescanOffersApi.js`, `treasuryApi.js` | 6+ functions |
| **CoinGecko** | `treasuryApi.js` | 1 function |

---

### Key Patterns

1. **Pagination**: All offer/trade APIs use pagination (cursor-based for MintGarden, page-based for Dexie/SpaceScan)
2. **Price Extraction**: All services have helper functions to extract prices (with mojos conversion)
3. **NFT ID Extraction**: All services have helper functions to extract NFT IDs from various response formats
4. **Error Handling**: Graceful degradation with caching and fallbacks
5. **Rate Limiting**: Conservative delays, circuit breakers, and cache usage

---

## File Locations

### Service Files
- `src/services/mintgardenApi.js`
- `src/services/mintgardenOffersApi.js`
- `src/services/dexieOffersApi.js`
- `src/services/dexieTradesApi.js`
- `src/services/spacescanOffersApi.js`
- `src/services/treasuryApi.js`

### Utility Files
- `src/utils/apiRetry.js` - Retry logic
- `src/utils/treasuryConstants.js` - API base URLs and constants
- `src/utils/treasuryCache.js` - Caching utilities
- `src/utils/treasuryNormalize.js` - Response normalization

### Configuration Files
- `vite.config.js` - Development proxy configuration

### Cloudflare Functions
- `functions/api/spacescan-proxy.js` - SpaceScan proxy
- `functions/api/wallet-balances.js` - Wallet balances with fallbacks

---

**Last Updated**: 2024
**Project**: Wojak Ink
**Maintainer**: Bullish0xCrypto / Tang Gang

