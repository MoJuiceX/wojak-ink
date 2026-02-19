# MintGarden API Reference

> **Verified live:** 2026-02-18 against `api.mintgarden.io`
> **Auth:** None required (public API)
> **Rate limits:** Undocumented. Our DID indexer uses 500ms between calls.
> **CORS proxy:** `functions/api/mintgarden/[[path]].ts` proxies to avoid browser CORS. Caches 60s.

---

## Working Endpoints (200 OK — verified)

### 1. Get Collection

```
GET /collections/{collection_id}
```

**Example:**
```
GET /collections/col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
```

**Response (top-level fields):**
| Field | Type | Example |
|-------|------|---------|
| `id` | string | `"col10hfq4hml..."` |
| `name` | string | `"Wojak Farmers Plot"` |
| `description` | string | Full description text |
| `thumbnail_uri` | string | `"https://assets.mainnet.mintgarden.io/thumbnails/col10hfq...webp"` |
| `banner_uri` | string | Same pattern with `_banner.webp` |
| `creator` | object | Nested creator profile (see Profile object below) |
| `sensitive_content` | boolean | `false` |
| `blocked_content` | boolean | `false` |
| `volume` | number\|null | `771.68` (in XCH) |
| `trade_count` | number | `850` |
| `nft_count` | number | `4208` |
| `unminted_nft_count` | number | `0` |
| `active_mints_count` | number | `0` |
| `attached_to_did_count` | number | `2631` |
| `collector_count` | number | `99` |
| `floor_price` | number\|null | `2.0` (in XCH) |
| `attributes_frequency_counts` | object | Nested trait → value → count maps |

**`attributes_frequency_counts` structure:**
```json
{
  "base": { "waifu": 251, "wojak": 2002, "soyjak": 755, ... },
  "face": { "classic": 2087, "rekt": 658, ... },
  "head": { "crown": 140, "wizard hat": 248, ... },
  "mouth": { "cig": 415, "gold teeth": 278, ... },
  "clothes": { "suit": 236, "chia farmer": 216, ... },
  "face wear": { "shades": 268, "no face wear": 1499, ... },
  "background": { "chia green": 232, "matrix": 107, ... }
}
```

---

### 2. List Collection NFTs

```
GET /collections/{collection_id}/nfts?size={n}
GET /collections/{collection_id}/nfts?size={n}&page={cursor}
```

**Query params:**
| Param | Required | Description |
|-------|----------|-------------|
| `size` | No (default varies) | Results per page (tested up to 100) |
| `page` | No | Cursor string from `next`/`previous` field |

**Response:**
```json
{
  "items": [ ...NFT list items... ],
  "page": null,
  "size": 2,
  "next": ">dt:2025-12-13 19:52:13+00:00~s:c0af42bf...",
  "previous": "<dt:2025-12-13 19:50:17+00:00~s:61fe0134..."
}
```

**Pagination:** Cursor-based. Pass the `next` value as the `page` param (URL-encoded) to get the next page. When `items` is empty or `items.length < size`, you've reached the end.

**NFT list item fields** (flat structure — different from individual NFT endpoint):
| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Hex hash (internal ID) |
| `encoded_id` | string | `"nft1v8lqzd..."` (bech32m launcher ID) |
| `openrarity_rank` | string\|null | Rarity rank as string |
| `is_blocked` | boolean | Content moderation |
| `royalty_address` | string\|null | |
| `data_type` | number | `1` = image |
| `thumbnail_uri` | string | `"https://assets.mainnet.mintgarden.io/thumbnails/{hash}_512.webp"` |
| `name` | string | `"Wojak #0050"` |
| `description` | string | |
| `sensitive_content` | boolean | |
| `edition_number` | number | `50` |
| `edition_total` | number | `4200` |
| `metadata` | null | Not included in list view |
| `data_uris` | null | Not included in list view |
| `metadata_uris` | null | Not included in list view |
| `collection_id` | string | `"col10hfq4hml..."` |
| `collection_name` | string | `"Wojak Farmers Plot"` |
| `token_id` | null | |
| `token_code` | null | |
| `price` | number\|null | Active listing price in XCH |
| `creator_address_encoded_id` | string | `"xch1skd2k6..."` |
| `owner_address_encoded_id` | string\|null | `"xch1s5lv5s..."` (null if no owner) |
| `timestamp` | string | ISO 8601 |
| `minted_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |
| `creator_id` | string | Hex DID hash |
| `creator_encoded_id` | string | `"did:chia:15j5d0fm..."` |
| `creator_avatar_uri` | string | |
| `creator_name` | string | `"MoJuiceNFTs"` |
| `creator_verification_state` | number | `1` = verified |
| `owner_id` | string\|null | Hex DID hash |
| `owner_encoded_id` | string\|null | `"did:chia:1slyssrg..."` |
| `owner_avatar_uri` | string\|null | |
| `owner_name` | string\|null | |
| `owner_verification_state` | string\|null | `"0"` or `"1"` (NOTE: string, not number!) |

---

### 3. Get Individual NFT

```
GET /nfts/{encoded_id}
```

**Example:**
```
GET /nfts/nft1v8lqzdxvaz0mcufals2vg7xlaq6kfa40lvdxhlqvptrrq8kfsz3sjqd9e6
```

**⚠️ CRITICAL: This endpoint returns NESTED objects, unlike list endpoints which use flat fields.**

**Response structure:**
| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Hex hash |
| `encoded_id` | string | `"nft1..."` launcher ID |
| `data` | object | **Nested** — contains URIs, metadata, hash |
| `is_blocked` | boolean | |
| `xch_price` | number\|null | |
| `royalty_percentage` | number | `1000` = 10% |
| `royalty_address` | string | Hex address |
| `creator` | object | **Nested** profile object |
| `creator_address` | object | `{ id, encoded_id }` |
| `owner` | object\|null | **Nested** profile object |
| `owner_address` | object | `{ id, encoded_id }` |
| `collection` | object | **Nested** full collection object |
| `openrarity_rank` | string\|null | |
| `events` | array | Transaction history |
| `launcher_coin` | object | |
| `auctions` | array | |

**`data` object:**
```json
{
  "data_uris": ["https://crate2.mypinata.cloud/ipfs/...", "https://gateway.pinata.cloud/ipfs/...", "https://ipfs.io/ipfs/..."],
  "data_hash": "b82e9710...",
  "data_type": 1,
  "thumbnail_uri": "https://assets.mainnet.mintgarden.io/thumbnails/{hash}_512.webp",
  "preview_uri": "https://assets.mainnet.mintgarden.io/thumbnails/{hash}.webp",
  "integrity_state": 1,
  "metadata_hash": "f0d06850...",
  "metadata_json": {
    "name": "Wojak #0050",
    "format": "CHIP-0007",
    "attributes": [
      { "value": "Wojak", "trait_type": "Base" },
      { "value": "Terminator", "trait_type": "Face" },
      ...
    ],
    "collection": { "id": "Xnc9Y5d1Qw", "name": "Wojak Farmers Plot", "attributes": [...] },
    "description": "...",
    "minting_tool": "crate-minting-system",
    "edition_number": 50,
    "sensitive_content": false
  },
  "edition_number": 50,
  "edition_total": 4200
}
```

**Ownership check pattern** (used in `verify-phase1.ts`):
```ts
const nftData = await response.json();
const isOwner = nftData.collection?.id === COLLECTION_ID
             && nftData.owner?.encoded_id === did;
```

**⚠️ Note:** `collection.id` here is the MintGarden collection ID (e.g. `col10hfq4hml...`), and `owner.encoded_id` is the DID (e.g. `did:chia:15j5d0fm...`).

---

### 4. Get Profile (by DID)

```
GET /profile/{did}
```

**Example:**
```
GET /profile/did:chia:15j5d0fm0x65nz7w6jr4c5any8mzrkru2x6l9uy2f0vcrc6jfedcqp20n4q
```

**Response (Profile object):**
| Field | Type | Example |
|-------|------|---------|
| `id` | string | Hex hash of DID |
| `encoded_id` | string | `"did:chia:15j5d0fm..."` |
| `verification_state` | number | `0` = unverified, `1` = verified |
| `username` | string\|null | |
| `name` | string\|null | `"MoJuiceNFTs"` |
| `bio` | string\|null | |
| `website` | string\|null | |
| `twitter_handle` | string\|null | `"MoJuiceX"` |
| `avatar_uri` | string\|null | |
| `header_uri` | string\|null | |
| `discord_user` | object\|null | `{ id, username, discriminator }` |
| `volume` | number\|null | |
| `minting_blocked` | boolean | |
| `featured_nfts_count` | number\|null | |
| `owned_nfts_count` | number\|null | |
| `created_nfts_count` | number\|null | |
| `collections_count` | number\|null | |
| `active_mints_count` | number\|null | |
| `active_subscription` | object | `{ plan: 0 }` |

---

### 5. List Profile NFTs (by DID)

```
GET /profile/{did}/nfts?type={type}&size={n}
```

**⚠️ REQUIRED param: `type`** — omitting it returns `422 Validation Error`.

**Query params:**
| Param | Required | Values |
|-------|----------|--------|
| `type` | **YES** | `"owned"` or `"created"` |
| `size` | No | Results per page |
| `page` | No | Cursor string |

**Response:** Same paginated format as collection NFTs (flat NFT list items).

**Used in `verify-phase1.ts` (slow path):**
```ts
const mgUrl = `https://api.mintgarden.io/profile/${did}/nfts?type=owned&size=100`;
// Then check: items.some(item => item.collection_id === PHASE1_COLLECTION_ID)
```

**⚠️ No `collection_id` filter param available** — you get ALL owned NFTs and must filter client-side.

---

### 6. List Address NFTs (by XCH address)

```
GET /address/{xch_address}/nfts?type={type}&size={n}
GET /address/{xch_address}/nfts?type={type}&collection_id={col}&size={n}
```

**Query params:**
| Param | Required | Values |
|-------|----------|--------|
| `type` | **YES** | `"owned"` |
| `collection_id` | No | Filter to specific collection |
| `size` | No | Results per page |
| `page` | No | Cursor string |

**Response:** Same paginated format (flat NFT list items).

**Key advantage:** This endpoint DOES support `collection_id` filtering, unlike the profile endpoint.

**Used in `SageWalletProvider.tsx`:**
```ts
// hasRequiredNFTs
`https://api.mintgarden.io/address/${address}/nfts?type=owned&collection_id=${collectionId}`
// getNFTs
`https://api.mintgarden.io/address/${address}/nfts?type=owned`
// getDIDs (fallback)
`https://api.mintgarden.io/address/${address}/nfts?type=owned&size=5`
```

---

## BROKEN Endpoints (404 — verified)

### ❌ `GET /nfts?collection_id={col}&size={n}`
### ❌ `GET /nfts?collection_id={col}&owner_did={did}&size={n}&page={n}`

These do NOT exist. The root `/nfts` path only works with an individual NFT ID (`/nfts/{encoded_id}`).

---

## 🚨 CRITICAL BUG: DID Indexer Uses Broken Endpoint

**File:** `workers/did-indexer/worker.ts`, function `fetchDIDNfts()` (line 220)

**Current code:**
```ts
const url = `https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${encodeURIComponent(did)}&size=${pageSize}&page=${page}`;
```

**Problem:** The `/nfts?collection_id=X&owner_did=Y` endpoint returns 404. It does not exist.

**Impact:** The DID indexer silently fails for every player on every run. The `fetchDIDNfts` function catches the error and returns `{ success: false, nfts: [] }`, which causes `syncDIDHoldings` to return `'skipped'`. This means **holdings are never updated** and the circuit breaker trips after 5 consecutive failures.

**Fix options (in priority order):**

1. **Use `/profile/{did}/nfts?type=owned&size=100`** (matches verify-phase1.ts)
   - Pros: Uses DID directly, consistent with other code
   - Cons: No `collection_id` filter — must filter client-side
   - Code change:
     ```ts
     const url = `https://api.mintgarden.io/profile/${encodeURIComponent(did)}/nfts?type=owned&size=${pageSize}`;
     // Then filter: items.filter(item => item.collection_id === collectionId)
     ```

2. **Use `/address/{xch}/nfts?type=owned&collection_id={col}&size=100`**
   - Pros: Has collection_id filter (more efficient)
   - Cons: Requires XCH address instead of DID — need to pass wallet address to fetchDIDNfts or look it up

**Recommendation:** Option 1 is simplest since `fetchDIDNfts` already receives `did`. The indexer already handles small result sets efficiently.

---

## CDN / Image URLs

**Thumbnail (512px):**
```
https://assets.mainnet.mintgarden.io/thumbnails/{data_hash}_512.webp
```

**Preview (full):**
```
https://assets.mainnet.mintgarden.io/thumbnails/{data_hash}.webp
```

**Collection thumbnail:**
```
https://assets.mainnet.mintgarden.io/thumbnails/{collection_id}.webp
```

**Collection banner:**
```
https://assets.mainnet.mintgarden.io/thumbnails/{collection_id}_banner.webp
```

**Profile avatar:**
```
https://assets.mainnet.mintgarden.io/profiles/{profile_hex_id}_{hash}.webp
```

**Used in codebase:**
- `CollectionScroll.tsx`: `https://assets.mainnet.mintgarden.io/thumbnails/${nft.data_hash}_200.webp` (200px variant)
- `SwipeCard.tsx`: `https://assets.mainnet.mintgarden.io/thumbnails/${nft.data_hash}_512.webp`
- Individual NFT endpoint: `data.thumbnail_uri` and `data.preview_uri` are pre-built URLs

---

## Pagination Summary

All list endpoints use **cursor-based pagination**:

```json
{
  "items": [...],
  "size": 100,
  "next": ">dt:2025-12-13 19:52:13+00:00~s:c0af42bf...",
  "previous": "<dt:2025-12-13 19:50:17+00:00~s:61fe0134..."
}
```

- `next` / `previous` are cursor strings, URL-encode them as the `page` param
- When `items` is empty or `items.length < size`, you've reached the end
- `/collections/{id}/nfts` cursors use `dt:` (datetime) + `s:` (sort key)
- `/profile/{did}/nfts` and `/address/{xch}/nfts` cursors use `i:` (index) + `s:` (sort key)
- **⚠️ The `page` param is NOT a page number** — it's an opaque cursor string

---

## How Wojak.ink Uses MintGarden API

| Feature | Endpoint | File |
|---------|----------|------|
| NFT ownership verification (fast path) | `GET /nfts/{nft_id}` | `verify-phase1.ts` |
| NFT ownership verification (slow path) | `GET /profile/{did}/nfts?type=owned&size=100` | `verify-phase1.ts` |
| DID indexer holdings sync | ❌ `GET /nfts?collection_id=X&owner_did=Y` (BROKEN) | `did-indexer/worker.ts` |
| Wallet NFT check | `GET /address/{xch}/nfts?type=owned&collection_id=X` | `SageWalletProvider.tsx` |
| Get user's NFTs | `GET /address/{xch}/nfts?type=owned` | `SageWalletProvider.tsx` |
| DID discovery fallback | `GET /address/{xch}/nfts?type=owned&size=5` | `SageWalletProvider.tsx` |
| CORS proxy (frontend) | `GET /api/mintgarden/{path}` → proxies to API | `functions/api/mintgarden/[[path]].ts` |
| Game feed NFT images | CDN thumbnails (200px, 512px) | `CollectionScroll.tsx`, `SwipeCard.tsx` |

---

## Our Collection IDs (Canonical)

| Collection | ID | Items |
|------------|----|-------|
| Wojak Farmers Plot (Phase 1) | `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah` | 4,208 |
| Your Wojak (Phase 2) | `col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx` | 4+ |

**⚠️ `_shared.ts` has the correct IDs. The DID indexer now also has the correct IDs (lines 12-13).**
