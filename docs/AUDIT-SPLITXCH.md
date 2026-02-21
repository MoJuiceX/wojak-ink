# SplitXCH (XCH.split) Audit — Royalty Split on Every Mint

This doc audits that **every user mint** uses [SplitXCH](https://splitxch.com/) so the **minter** and **treasury** are the receivers of future royalties for each NFT.

---

## 1. SplitXCH (research)

- **What it is:** SplitXCH lets you split Chia coins or project royalties among multiple recipients. It charges a **150 basis points (1.5%)** service fee.
- **How Chia royalties work:** The NFT’s on-chain **royalty address** is where the full royalty (e.g. 12%) is sent on each secondary sale. If that address is a **splitter puzzle** (from SplitXCH), the puzzle automatically distributes the payment to multiple addresses (minter + treasury + SplitXCH fee).
- **Our usage:** We call SplitXCH once per minter (per wave), cache the returned **splitter address** in DB, and pass that address to MintGarden as `royalty_address`. So the NFT’s royalty address on-chain is the splitter, not the minter’s wallet.
- **API (from our code):**
  - `POST https://splitxch.com/api/compute/fast`
  - Body: `{ recipients: [ { address: string, points: number }, ... ] }` — points in basis points; total sent by us is 9,850 (SplitXCH adds 150bp fee → 10,000).
  - Response: `{ id: string, address: string }` — `address` is the splitter (bech32) we use as `royalty_address`.

*Confirmed by [SplitXCH builder](https://github.com/Koba42Corp/splitxch-builder): recipient points sum to 9,850; API adds 150 bp fee; endpoint `POST /api/compute/fast`.*

---

## 2. Intended behaviour

- **Every mint (free or paid)** should set the NFT’s `royalty_address` to the **SplitXCH splitter** for that minter (when `TREASURY_ADDRESS` is set).
- **Split (Wave 1):** 8,258bp → minter (~10%), 1,592bp → treasury (~2%), 150bp → SplitXCH fee. Total on-chain royalty 12% (`PHASE2_ROYALTY_PCT`).
- **Fallback:** If `TREASURY_ADDRESS` is unset or SplitXCH fails, we fall back to the minter’s wallet as `royalty_address` (they get 100% of the 12% royalty; treasury gets nothing).

---

## 3. Mint entry points and SplitXCH usage

| Entry point | File | Free/Paid | Uses SplitXCH? | Notes |
|-------------|------|-----------|----------------|-------|
| **Queue (primary)** | `process.ts` | Both | ✅ Yes | Resolves splitter when `TREASURY_ADDRESS` set; passes `royaltyAddress` to `callMintGardenMint`. Same for free and paid. |
| **Prepare (legacy)** | `prepare.ts` | Paid | ✅ Yes | SplitXCH added for paid mints; resolves splitter, passes `royaltyAddress`. |
| **Prepare (legacy)** | `prepare.ts` | Free | ✅ Yes | SplitXCH added for free mints; resolves splitter, passes `royaltyAddress`. |

**Frontend:** Current flow uses `/api/mint/submit` → queue → `process.ts`. The prepare path is deprecated but still present; both paths now use SplitXCH when `TREASURY_ADDRESS` is set.

---

## 4. Code verification

### 4.1 `functions/api/mint/splitxch.ts`

- **Recipients:** `creatorWallet` (minter) and `treasuryAddress` from env.
- **Points (Wave 1):** `creatorPoints: 8258`, `treasuryPoints: 1592` → 9,850 total; SplitXCH fee 150 → 10,000. ✓
- **API:** `POST https://splitxch.com/api/compute/fast`, body `{ recipients: [ { address, points }, ... ] }`. ✓
- **Caching:** `splitter_addresses` table keyed by `(creator_wallet, wave)`; cache hit returns stored `splitter_address`. ✓
- **Env:** Requires `TREASURY_ADDRESS`; throws if unset when creating a new splitter. ✓

### 4.2 `functions/api/mint/request.ts`

- **MintGarden payload:** `royalty_address: params.royaltyAddress || params.walletAddress`. So when callers pass `royaltyAddress` (the splitter), it is used; otherwise minter’s wallet. ✓
- **Royalty %:** `royalty_percentage` from `PHASE2_ROYALTY_PCT` (12). ✓

### 4.3 `functions/api/mint/process.ts`

- Before `callMintGardenMint`: if `env.TREASURY_ADDRESS` set, calls `getOrCreateSplitterAddress(env, job.wallet_address, 1)` and passes result as `royaltyAddress`. On failure or empty, falls back to no `royaltyAddress` (so request.ts uses `walletAddress`). ✓
- Used for both free and paid jobs. ✓

### 4.4 `functions/api/mint/prepare.ts`

- **Paid mints:** Resolves SplitXCH when `TREASURY_ADDRESS` set; passes `royaltyAddress` into `callMintGardenMint`. ✓
- **Free mints:** Resolves SplitXCH when `TREASURY_ADDRESS` set; passes `royaltyAddress` into `callMintGardenMint`. ✓

### 4.5 Config

- **TREASURY_ADDRESS:** Must be set in Cloudflare (or wrangler) for SplitXCH to run. Plaintext is fine.
- **PHASE2_ROYALTY_PCT:** Should be `12` so total on-chain royalty matches the 10%+2%+fee split.

---

## 5. Summary

- **SplitXCH is used for every mint** (queue and prepare, free and paid) when `TREASURY_ADDRESS` is set.
- **Minter and treasury are the receivers** of future royalties: the NFT’s `royalty_address` is the SplitXCH splitter, which sends ~10% to the minter and ~2% to the treasury (Wave 1); SplitXCH keeps 150bp.
- **Fallback:** If SplitXCH is skipped (no `TREASURY_ADDRESS` or API error), `royalty_address` becomes the minter’s wallet so they receive 100% of the 12% royalty; treasury receives nothing for that mint.
- **Verification:** Run `scripts/verify-royalty-split.sh` for config and code checks; run `scripts/verify-split-on-mints.ts` (with DB access) to compare on-chain `royalty_address` to expected splitter addresses.
