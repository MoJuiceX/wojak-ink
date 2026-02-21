# MintGarden Dynamic Minting API

Reference for the [MintGarden Dynamic Minting API](https://mintgarden.io/minting-api) used by the Generator paid/free mint flow.

## Endpoint

- **URL:** `POST https://api.mintgarden.io/mint/dynamic`
- **Auth:** `Authorization: Bearer YOUR_API_KEY`

## Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `profile_id` | string | Yes | Creator DID (e.g. `did:chia:1...`). Set via `PHASE2_PROFILE_ID`. |
| `metadata` | object | Yes | NFT data and metadata hashes/URIs. |
| `metadata.data_hash` | string | Yes | Hash of image/data file. |
| `metadata.data_uris` | string[] | Yes | Array of IPFS (or other) URIs for the image. |
| `metadata.metadata_hash` | string | Yes | Hash of metadata JSON. |
| `metadata.metadata_uris` | string[] | Yes | Array of URIs for the metadata JSON. |
| `metadata.license_hash` | string | No | Optional license file hash. |
| `metadata.license_uris` | string[] | No | Optional license URIs. |
| `metadata.edition_number` | number | No | For editions (e.g. 1). |
| `metadata.edition_total` | number | No | For editions (e.g. 100). |
| `royalty_address` | string | Yes | Minter’s wallet (creator royalty). We set this to the minting user’s address. |
| `royalty_percentage` | number | Yes | Royalty % (default 10). Set via `PHASE2_ROYALTY_PCT`. |
| `target_address` | string | Yes | **Free:** address that receives the NFT. **Paid:** address that receives the XCH payment (creator). We send `CREATOR_PAYOUT_ADDRESS` for paid, minter for free. |
| `requested_mojos` | number | No | Price in mojos (1 XCH = 10^12). Omit for free mint. |
| `requested_asset_id` | string | No | CAT asset ID when charging in a CAT (e.g. SBX). |

## Behaviour

- **Free mint:** Send only `target_address` (no `requested_mojos`). The NFT is minted directly to that address. Response includes the NFT coin/launcher ID.
- **Paid mint (XCH):** Send `target_address` and `requested_mojos`. The API returns an **offer file** that the user accepts in their wallet (e.g. Sage/Goby).
- **Paid mint (CAT):** Send `target_address`, `requested_mojos`, and `requested_asset_id` for the CAT.

## Response

- **Direct mint (free):** JSON with NFT identifier; we use `launcher_id`, `coin_id`, or `nft_id` as the launcher ID for the “View on MintGarden” link.
- **Offer (paid):** JSON with `offer_file` — the offer string to copy and accept in the wallet.

## Env (wrangler / Cloudflare Pages)

| Variable | Purpose |
|----------|---------|
| `MINTGARDEN_API_KEY` | Bearer token for the API (secret). |
| `PHASE2_PROFILE_ID` | Creator DID for “Your Wojak” mints. |
| `PHASE2_COLLECTION_UUID` | Collection UUID (used in metadata; not sent in dynamic mint body). |
| `PHASE2_ROYALTY_PCT` | Royalty percentage for the creator (default `"10"`). Royalties go to the minter’s wallet; `PHASE2_ROYALTY_ADDRESS` is not used. |
| `CREATOR_PAYOUT_ADDRESS` | **Required for paid mints.** XCH address that receives primary-sale payments. Sent as `target_address` when creating paid offers (MintGarden: “The wallet that receives the payment is specified in the dynamic mint request”). |

## Code

- **Request builder / HTTP call:** `functions/api/mint/request.ts` — `callMintGardenMint()`
- **Callers:** `functions/api/mint/prepare.ts` (free and paid paths)

## External links

- [Dynamic Minting API](https://mintgarden.io/minting-api) — official page
- [MintGarden docs](https://docs.mintgarden.io/) — overview, web minting, Studio
- [Secure the Mint](https://github.com/mintgarden-io/secure-the-mint) — provenance
