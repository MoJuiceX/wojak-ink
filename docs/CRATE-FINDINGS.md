# Crate (Koba42Corp) — Findings for Wojak.ink

Summary of the **crate-main** project (downloaded repo) and what wojak.ink can use. Crate is a working product that mints NFTs via the MintGarden Dynamic Minting API.

---

## 1. MintGarden Dynamic API usage

### Endpoints (Crate uses)

- **Mainnet:** `https://api.mintgarden.io/mint/dynamic`
- **Testnet:** `https://api.testnet.mintgarden.io/mint/dynamic`

### Request payload (from `addHonkerFix.js`, `block_generator.js`, `queue_airdrop.js`)

```js
{
  profile_id: "<DID>",           // e.g. did:chia:1...
  metadata: {
    data_hash: "<sha256-hex>",
    data_uris: ["<image-uri>"],
    metadata_hash: "<sha256-hex>",
    metadata_uris: ["<metadata-uri>"],
    edition_number: 1,
    edition_total: 200           // or collection maxSupplyToMint
  },
  royalty_address: "xch1...",
  royalty_percentage: 5,
  target_address: "xch1...",
  // Paid mint only:
  requested_mojos: 200000000000,  // optional, in mojos (1 XCH = 10^12)
  requested_asset_id: "<cat-asset-id>"  // optional, for CAT payment
}
```

### Response handling (from Crate)

- **Direct mint (free):** Response includes NFT identifier. Crate uses:
  - `result.nft_id` or `result.coin_id` (queue_airdrop.js)
  - `response.data.nft_coin_id` (block_generator.js)
- **Paid (offer):** Response includes offer for the user. Crate checks:
  - `response.data.offer` (block_generator.js)

So the MintGarden API can return at least: `nft_coin_id`, `coin_id`, `nft_id`, `offer`. Wojak.ink’s `request.ts` should accept all of these for robustness.

### Auth

- `Authorization: Bearer <MINTGARDEN_API_KEY>`
- Credentials in Crate: per-collection `mintGardenProfileId` / `mintGardenApiKey` (and testnet variants).

---

## 2. Retry and errors (queue_airdrop.js)

- **callMintGardenAPI** retries up to **3 times** with **exponential backoff**: delay = `2^retryCount * 1000` ms.
- On success returns: `{ success: true, data, nft_id, transaction_id, status: 'minted' }`.
- On failure after retries: `{ success: false, error, retryCount }`.
- No throw; caller checks `result.success`.

Wojak.ink can adopt the same retry/backoff and treat non‑OK responses as retryable where appropriate.

---

## 3. Metadata and IPFS

### buildMintGardenMetadata (queue_airdrop.js)

- Builds the **metadata** object sent to MintGarden (not the CHIP-0007 JSON for IPFS).
- Contents: `data_hash`, `data_uris`, `metadata_hash`, `metadata_uris`, `edition_number`, `edition_total`.
- CHIP-0007 is built separately (metadataService.js), uploaded to IPFS, then hashes/URIs are used in this metadata.

### CHIP-0007 (metadataService.js)

- Format: `format: "CHIP-0007"`, `name`, `description`, `sensitive_content`, `attributes`, `collection` (id, name, attributes), optional `edition_number` / `edition_total`.
- Collection: `id`, `name`, optional `attributes` (description, icon, banner, twitter, website, discord).

Wojak.ink’s prepare already builds CHIP-0007 and uploads image + metadata to IPFS (Pinata); we only need to send the same hashes/URIs to MintGarden, which we do.

### MintGarden presigned upload (optional alternative to Pinata)

- **Client:** `mintgarden-upload.service.ts` — `getPresignedUrl(profileId, filename, apiKey)`.
- **Endpoint:** `POST https://api.mintgarden.io/studio/presign_upload` with `{ profile_id, filename }`, Bearer token.
- Response: presigned URL (e.g. in `request_token` or `url`); client uploads file to that URL.
- Use case: upload images to MintGarden IPFS instead of Pinata. Wojak.ink currently uses Pinata; we can add MintGarden upload later if desired.

---

## 4. Frontend / wallet

### Fetching user NFTs by collection (goby.service.ts)

- `GET https://api.mintgarden.io/address/{address}/nfts?type=owned&collection_id={collectionId}`
- Response: array or `data.items`; each item has `id`, `name`, `collection`, `metadata`, `thumbnail_uri`.

Useful for “My Your Wojak” or post-mint verification if we want to show NFTs from our collection.

### Taking an offer (wallet)

- Crate: `takeOffer(offerString)` (Goby) and `TakeOfferSage` (wallet-connect). User pastes offer file and wallet accepts.

Wojak.ink already has “Copy Offer” and the user accepts in Sage; no change needed.

---

## 5. What wojak.ink has adopted

- **request.ts:**  
  - Same payload shape: `profile_id`, `metadata` (data_hash, data_uris, metadata_hash, metadata_uris), `royalty_address`, `royalty_percentage`, `target_address`, optional `requested_mojos` (and optional `requested_asset_id`).
  - Response: accept `nft_coin_id`, `coin_id`, `nft_id`, `launcher_id` for launcher ID; `offer` or `offer_file` for paid offer.
  - Retry: 3 attempts with exponential backoff (aligned with Crate).
- **prepare.ts:**  
  - Free: call MintGarden with only `target_address`; store and return `launcherId` / `mintgardenUrl`.  
  - Paid: call MintGarden with `requested_mojos`; store and return `offerFile` and `expiresAt`.
- **Env:** `PHASE2_PROFILE_ID`, `PHASE2_ROYALTY_*`, `MINTGARDEN_API_KEY` (as in Crate’s collection config, but global for one collection).

---

## 6. What we could add later (from Crate)

- **MintGarden presigned upload:** Use `POST .../studio/presign_upload` and upload image to MintGarden IPFS instead of (or in addition to) Pinata.
- **Fetch user NFTs:** `GET .../address/{address}/nfts?type=owned&collection_id={id}` for a “My Wojaks” or post-mint list.
- **Testnet:** Use `https://api.testnet.mintgarden.io/mint/dynamic` when `isTestnet` or an env flag is set.
- **Edition in metadata:** Send `edition_number` and `edition_total` in the MintGarden metadata object (we can set edition_number = mint_number, edition_total = 4200).

---

## 7. Key Crate file references

| Path | Purpose |
|------|--------|
| `server/cloud/admin_functions/user_functions/queue_airdrop.js` | `buildMintGardenMetadata`, `callMintGardenAPI`, `dropMint`; retry and payload shape |
| `server/cloud/addHonkerFix.js` | MintGarden payload preview (profile_id, metadata, royalty, target_address) |
| `server/cloud/custom/degen/block_generator.js` | Full dynamic mint with `requested_mojos` / `requested_asset_id`; response `nft_coin_id`, `offer` |
| `server/cloud/admin_functions/user_functions/metadataService.js` | CHIP-0007 structure (name, description, attributes, collection) |
| `client/src/app/services/mintgarden-upload.service.ts` | Presigned upload (profile_id, filename → upload URL) |
| `client/src/app/services/goby.service.ts` | getWalletNFTsFromMintGarden(collectionId) |
| `Notes/HONKERS_MINT_FIX_SOLUTION.md` | Flow: buildMintGardenMetadata → MintGarden API; metadata + API usage |
| `Notes/MINTGARDEN_IMPLEMENTATION_NOTES.md` | Frontend upload to MintGarden; presign flow |
| `Notes/COLLECTION_UPLOAD_MIGRATION_PLAN.md` | MintGarden CAR/presign upload and collection config |

---

## 8. Summary

- Crate confirms the MintGarden Dynamic API contract we use and adds concrete response field names (`nft_coin_id`, `offer`) and retry behavior.
- Wojak.ink’s `request.ts` and prepare flow are aligned with Crate’s usage; we added retries and broader response parsing.
- Optional next steps: MintGarden presigned upload, “My NFTs” via address API, testnet switch, and edition_number/edition_total in metadata.
