# Wojak Generator & Your Wojak Mint — Full Handoff for Another LLM

**Entry point for handoff:** Use this doc plus **docs/CREDIT-LEADERBOARD-SYSTEM.md** (credits derivation, workers, leaderboard) so another LLM or developer has the full picture.

This document hands off the **entire user journey and implementation** of the Wojak Generator: how users get there, create layers, mint Your Wojak NFTs (paid or free with credits), how we upload metadata to IPFS, how we use MintGarden dynamic minting, and how NFTs are minted on the Chia blockchain. Use it so another LLM or developer can fully understand and continue working on the system.

---

## 1. Purpose of this handoff

- **Scope:** User journey from navigation → Generator → layer selection → mint (paid or free) → IPFS → MintGarden → Chia; plus how free-mint credits are derived and used.
- **Audience:** Another LLM or developer taking over. They should be able to understand the flow, find every relevant file, and extend or fix the system.
- **Existing docs:** This handoff **references** (and does not duplicate) the credit system doc. For credits derivation, workers, formula, and runbooks, see **docs/CREDIT-LEADERBOARD-SYSTEM.md**.

---

## 2. User journey (end-to-end)

### 2.1 Getting to the Wojak Generator

- **Route:** `/generator`. Defined in `src/config/routes.ts` as a primary nav item (id: `generator`, path: `/generator`, label: "Generator", icon: Palette). Appears in bottom nav (mobile) and sidebar (desktop).
- **App wiring:** `src/App.tsx` lazy-loads the Generator page and wraps it in `GeneratorProvider` and `MintProvider`. Route is under the same layout as other main pages.
- **Page:** `src/pages/Generator.tsx` — wraps content in `GeneratorProvider`; renders `PreviewWithControls`, `LayerTabs`, `TraitSelector`, `ActionBar`, etc. SEO via `PageSEO` for path `/generator`.

### 2.2 Creating the layers (selection and preview)

- **State:** `GeneratorContext` (`src/contexts/GeneratorContext.tsx`) holds `selectedLayers` (layer name → asset path), `selectedColors`, `g2Selections` (for G2/“Generator 2” traits). Reducer in `src/contexts/generatorReducer.ts`.
- **Layer rules:** `src/lib/wojakRules.ts` — compatibility (e.g. which heads work with which clothes). Trait IDs and special cases in `src/lib/generatorTraitIds.ts`.
- **UI:** User picks traits via `TraitSelector` and `GeneratorRightPanel` (desktop). Active layer is selected via `LayerTabs`. Preview is drawn by the canvas renderer.
- **Rendering:** `src/services/canvasRenderer.ts` — builds render list from `selectedLayers` and `g2Selections`, loads layer images, draws to canvas. Export: `exportImage(selectedLayers, options, g2Selections)` returns a **WebP Blob** (used for mint).
- **Export options for mint:** In ActionBar, mint uses `exportImage(..., { format: 'webp', quality: 0.92, includeBackground: true, size: { preset: '1024' } }, g2Selections)` → 1024px WebP.

### 2.3 Choosing mint type and starting the mint

- **Wallet:** User must connect a Chia wallet (e.g. Sage). `useSageWallet()` provides `address` (xch1...). Mint APIs and MintContext use this address.
- **Credits (free mints):** `MintContext` fetches `/api/credits/balance?wallet=...` and exposes `credits.free_mints_available` (balance ÷ 100). **100 credits = 1 free mint.** If `free_mints_available > 0`, the user can choose **Free** in the ActionBar; otherwise only **Paid** is valid.
- **ActionBar:** Mint button opens `MintFlowModal` and calls `startMint(webpBlob, layersForApi, colorsForApi, mintType)`. `layersForApi` / `colorsForApi` are the same selections sent to the server (layer names → paths, layer names → hex colors).
- **startMint (MintContext):** Converts `webpBlob` to base64, POSTs to `/api/mint/prepare` with `{ walletAddress, selectedLayers, selectedColors, imageBase64, mintType }`. Then:
  - If response has `pending: true` and `mintId` → paid flow: user must accept the offer in the wallet; modal shows “Accept in Sage”, countdown, and “Copy Offer File”.
  - If response has `success: true` → free flow: mint is already done; modal shows success, mint number, and link to MintGarden.

### 2.4 Paid mint: accepting the offer on Chia

- **Offer file:** For paid mints, MintGarden returns an **offer file** (hex string). The frontend shows it in the modal and lets the user **Copy Offer File**. The user pastes/imports this in their Chia wallet (e.g. Sage) and **accepts** the offer, which spends their XCH and creates the NFT on-chain.
- **Confirmation on our side:** After the user accepts, the NFT exists on Chia (MintGarden/Chia have a **launcher_id** / coin id). Our backend can mark the mint “minted” when we know that launcher_id. **Confirm API:** `POST /api/mint/confirm` with `{ mintId, launcherId }` updates the pending row to `status = 'minted'`, assigns `mint_number`, and increments `trait_usage`. **Note:** The current frontend may not yet call `/api/mint/confirm` automatically (e.g. after detecting the NFT in the wallet); see LAUNCH-PLAN.md for “Frontend gets launcher_id and calls confirm”. The API is implemented and ready.

### 2.5 Free mint: credits deducted immediately

- **Prepare does everything:** For `mintType === 'free'`, `/api/mint/prepare` checks balance ≥ 100 credits (10,000 units), uploads to IPFS, calls MintGarden **dynamic mint** (no `requested_mojos`), then in one flow: inserts `credit_spends` (10,000 units), inserts `phase2_mints` with `status = 'minted'` and `mint_type = 'free'`, increments `trait_usage`. Response returns `success`, `mintNumber`, `launcherId`, `mintgardenUrl`. No separate “accept offer” step; MintGarden mints directly to the user’s address for free mints.

---

## 3. How we derive free-mint credits (summary)

- **Source of truth for credits:** **docs/CREDIT-LEADERBOARD-SYSTEM.md** (full architecture, workers, formula, APIs, runbooks).
- **Short version:** Credits come from **XCH spent on Wojak Farmers Plot** NFTs (not Your Wojak). Trades are ingested from **MintGarden Events API** (type=2, XCH). A **credit-tracker worker** (cron every 30 min) fetches new events, gets **floor price at time of purchase** from `floor_price_snapshots`, computes credits with a **formula** (50 × (price/floor) × (1 + 0.2×ln(price/floor))), and inserts into **credit_events**. **credit_spends** are written when the user does a **free mint** (100 credits = 10,000 units per mint). Balance = earned − spent; free mints available = floor(balance / 10,000).
- **Where it’s used in Generator:** `MintContext` → `/api/credits/balance` → `credits.free_mints_available`. `prepare.ts` checks balance before free mint and inserts into `credit_spends` after a successful free mint.

---

## 4. Uploading metadata and image to IPFS

### 4.1 Who calls IPFS

- **Prepare** (`functions/api/mint/prepare.ts`) does **not** call Pinata directly. It calls our **internal** endpoint `POST /api/mint/upload` (same origin), which uses **Pinata** to pin the image and the metadata JSON.

### 4.2 Upload API (`functions/api/mint/upload.ts`)

- **Input (JSON):** `{ imageBase64: string, metadata: object }`. The image is the **WebP** from the canvas (base64). Max size enforced: 2MB.
- **Steps:**
  1. Decode base64 → binary, compute **SHA-256** of image → `dataHash`.
  2. **Pinata:** `POST https://api.pinata.cloud/pinning/pinFileToIPFS` with `Authorization: Bearer <PINATA_JWT>`, body = FormData with the image file as `image.webp`. Response gives `IpfsHash` → we use `dataUris = ["ipfs://<hash>"]`.
  3. **Metadata:** Build a single JSON object (see below). Compute **SHA-256** of the JSON string → `metadataHash`.
  4. **Pinata:** `POST https://api.pinata.cloud/pinning/pinJSONToIPFS` with the same JWT, body = metadata JSON. Response gives `IpfsHash` → `metadataUris = ["ipfs://<hash>"]`.
- **Output:** `{ dataHash, dataUris, metadataHash, metadataUris }`. Prepare uses these for MintGarden and for DB columns `image_hash`, `metadata_hash`, `ipfs_image_uri`, `ipfs_metadata_uri`.

### 4.3 Metadata shape (CHIP-0007 style)

- **Prepare** builds the metadata object before calling upload:
  - `format: 'CHIP-0007'`
  - `name`: `"Your Wojak #<mintNumber>"` (mintNumber from next mint number at prepare time)
  - `description`: `"A custom Wojak created on wojak.ink"`
  - `sensitive_content: false`
  - `collection`: `{ name: 'Your Wojak', id: collectionUuid }` (env `PHASE2_COLLECTION_UUID`)
  - `attributes`: array of `{ trait_type, value }` — one per selected layer (value = filename without path/ext) and one per selected color (trait_type `"<Layer> Color"`, value = hex).

- This object is what we pin to IPFS and pass to MintGarden as `metadata_uris` / `metadata_hash`.

### 4.4 Image format

- **Canvas export:** WebP, quality 0.92, 1024px (preset `'1024'`). Upload sends it as `image/webp` to Pinata.

### 4.5 Env / secrets for IPFS

- **PINATA_JWT** (secret): Set in Cloudflare Pages/Workers for the project. Required for `/api/mint/upload`; if missing, upload returns 503.

---

## 5. MintGarden dynamic minting and Chia

### 5.1 API used

- **Endpoint:** `POST https://api.mintgarden.io/mint/dynamic`. Docs: https://mintgarden.io/minting-api.
- **Our wrapper:** `functions/api/mint/request.ts` — `callMintGardenMint(params, env)`. Used only from **prepare** (not from the browser).

### 5.2 Request body (built in request.ts)

- **Common:** `profile_id` (env `PHASE2_PROFILE_ID`), `metadata` (data_hash, data_uris, metadata_hash, metadata_uris, edition_number: 1, edition_total: 4200), `target_address` (wallet), `royalty_address` (creator wallet), `royalty_percentage` (env `PHASE2_ROYALTY_PCT`, default 10).
- **Free mint:** No `requested_mojos`. MintGarden mints the NFT to `target_address` and returns a **launcher_id** (or equivalent) in the response.
- **Paid mint:** We add `requested_mojos = round(priceXch * 1e12)`. MintGarden returns an **offer file** (hex) that the user signs in their Chia wallet to pay XCH and receive the NFT. We store the offer in `phase2_mints.offer_file` and return it to the frontend so the user can copy it into Sage.

### 5.3 Response handling

- **Response fields (MintGarden):** We accept `launcher_id`, `nft_coin_id`, `coin_id`, `nft_id` for the NFT identifier, and `offer_file` or `offer` for the offer string. See `parseResponse` in request.ts.
- **Retries:** Up to 3 attempts with exponential backoff (1s, 2s, 4s). On non-OK or parse error we retry then return null.

### 5.4 Chia blockchain

- **MintGarden** is a minting/marketplace layer on top of **Chia**. When we call `/mint/dynamic`:
  - **Free:** They create the NFT on Chia and assign it to our `target_address`; we get back the launcher/coin id.
  - **Paid:** They create an **offer** (Chia offer format). The user **accepts** the offer in their Chia wallet (e.g. Sage), which moves XCH and creates the NFT on-chain. Our app does not broadcast the transaction; the user’s wallet does after they paste/import the offer.

### 5.5 Who receives royalties (creator = minter)

- **MintGarden API** accepts `royalty_address` (XCH address) and `royalty_percentage`. On secondary sales, that percentage is paid to `royalty_address`. See [MintGarden minting API](https://mintgarden.io/minting-api).
- **We set** `royalty_address` to the **minter’s wallet** — the same `params.walletAddress` used for `target_address`. That address comes from the **Sage wallet** (frontend sends it in the prepare body; we pass it through to `callMintGardenMint`). So the user who creates (or buys) the NFT is the one who receives royalties on resales.
- **No fixed “project” royalty:** We do not use a shared royalty address; each NFT’s royalty goes to the creator’s wallet. The percentage is from env `PHASE2_ROYALTY_PCT` (default 10).

### 5.6 Env / secrets for MintGarden

- **MINTGARDEN_API_KEY** (secret): Required for `callMintGardenMint`. Without it, the function returns null and paid/free mint will fail.
- **PHASE2_PROFILE_ID**: MintGarden profile for the Your Wojak collection.
- **PHASE2_COLLECTION_UUID**: Collection id (e.g. for metadata `collection.id`).
- **PHASE2_ROYALTY_PCT** (optional): Default 10. Creator (minter) gets this royalty on secondary sales.

---

## 6. Mint flow (backend sequence)

### 6.1 Prepare (`POST /api/mint/prepare`)

1. Validate wallet, imageBase64, selectedLayers, selectedColors, mintType.
2. Expire stale pending mints; if this wallet already has a pending mint, return it (no new mint).
3. Check supply cap (4200 minted); if sold out, 400.
4. **Free:** Query balance (credit_events − credit_spends); if &lt; 10,000 units, 400 “Insufficient credits”.
5. Build **metadata** object (CHIP-0007, name, description, collection, attributes from layers + colors).
6. **Upload:** POST to `/api/mint/upload` with `{ imageBase64, metadata }` → get `dataHash`, `dataUris`, `metadataHash`, `metadataUris`.
7. **MintGarden:** `callMintGardenMint(...)` with image/metadata hashes and URIs.
8. **Free path:** Insert `credit_spends` (10,000), insert `phase2_mints` (status `minted`, mint_type `free`, mintgarden_launcher_id), increment `trait_usage`. Return success + mintNumber + launcherId + mintgardenUrl.
9. **Paid path:** Compute price (base + trait surcharge), call MintGarden with `requested_mojos`, get offer file. Insert `phase2_mints` (status `pending`, offer_file, expires_at). Return pending + mintId + offerFile + expiresAt.

### 6.2 Confirm (`POST /api/mint/confirm`) — paid only

- **When:** After the user has accepted the offer in their wallet and we have the NFT’s launcher_id (e.g. from frontend or a future “my NFTs” check).
- **Body:** `{ mintId: number, launcherId?: string }`.
- **Logic:** Load pending row by mintId; if launcherId not in body, use row’s `mintgarden_launcher_id` if already set. Assign next `mint_number`, update row to status `minted`, set `minted_at` and `mintgarden_launcher_id`, increment `trait_usage`. Return success + mintNumber + launcherId + mintgardenUrl.

### 6.3 Status (`GET /api/mint/status?wallet=...`)

- Used by the frontend to **resume** a pending paid mint (e.g. after reload). Expires old pending mints, then returns the current pending mint for that wallet (mintId, offerFile, expiresAt, totalPriceXch, etc.) if any.

---

## 7. File and doc index

| Area | Path |
|------|------|
| **Routes / nav** | `src/config/routes.ts` |
| **Generator page** | `src/pages/Generator.tsx` |
| **Generator state** | `src/contexts/GeneratorContext.tsx`, `src/contexts/generatorReducer.ts` |
| **Layer rules** | `src/lib/wojakRules.ts`, `src/lib/generatorTraitIds.ts` |
| **Canvas / export** | `src/services/canvasRenderer.ts`, `src/services/canvasRendererLayerBuilder.ts`, `src/services/canvasRendererConstants.ts`, `src/config/layers.ts` |
| **Mint state** | `src/contexts/MintContext.tsx` |
| **ActionBar / Mint UI** | `src/components/generator/ActionBar.tsx`, `src/components/generator/MintFlowModal.tsx` |
| **Prepare** | `functions/api/mint/prepare.ts` |
| **Upload (IPFS)** | `functions/api/mint/upload.ts` |
| **MintGarden** | `functions/api/mint/request.ts` |
| **Confirm** | `functions/api/mint/confirm.ts` |
| **Status** | `functions/api/mint/status.ts` |
| **Pricing** | `functions/api/mint/pricing.ts` |
| **DB (mints)** | `functions/migrations/030_credit_system.sql` (phase2_mints, trait_usage, credit_spends, etc.) |
| **Credits (full)** | **docs/CREDIT-LEADERBOARD-SYSTEM.md** |
| **Credits formula** | **docs/CREDITS-FORMULA.md** |
| **Generator code health** | **docs/GENERATOR-CODE-HEALTH.md** |
| **Phase 2 branding** | **docs/PHASE2-COLLECTION-BRANDING.md** |
| **Launch checklist** | **LAUNCH-PLAN.md** (e.g. confirm flow with launcherId) |

---

## 8. Env vars and secrets (summary)

| Name | Where | Purpose |
|------|--------|--------|
| **PINATA_JWT** | Pages/Worker secret | IPFS upload (image + metadata) |
| **MINTGARDEN_API_KEY** | Pages/Worker secret | MintGarden /mint/dynamic |
| **PHASE2_PROFILE_ID** | Var | MintGarden profile for Your Wojak |
| **PHASE2_COLLECTION_UUID** | Var | Collection id in metadata |
| **PHASE2_ROYALTY_PCT** | Var (optional) | Creator royalty % (default 10) |
| **DB** (D1) | Binding | phase2_mints, credit_events, credit_spends, trait_usage |

---

## 9. What another LLM should do next

1. **Read this handoff** and **docs/CREDIT-LEADERBOARD-SYSTEM.md** for credits.
2. **Trace one flow** end-to-end (e.g. free mint: ActionBar → startMint → prepare → upload → request → DB).
3. **Confirm paid flow:** If the app should call `/api/mint/confirm` after the user accepts the offer, implement “get launcherId” (e.g. from wallet or MintGarden “my NFTs”) and `POST /api/mint/confirm` with `{ mintId, launcherId }` (see LAUNCH-PLAN.md).
4. **Generator/layer work:** Follow **docs/GENERATOR-CODE-HEALTH.md** for rules and file roles.
5. **Credits/leaderboard changes:** Follow **docs/CREDIT-LEADERBOARD-SYSTEM.md** and **docs/CREDIT-LEADERBOARD-BULLETPROOF.md** for workers, formula, and runbooks.

This handoff plus the linked docs give full scope: user journey, IPFS, MintGarden dynamic minting, Chia, and free-mint credits derivation.
