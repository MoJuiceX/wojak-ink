# Verifying SplitXCH (xchsplit.com) on All Minted Your Wojak NFTs

This doc describes how to **prove** that every minted Your Wojak NFT has the SplitXCH royalty split set on-chain (royalty_address = splitter puzzle, not the raw minter wallet).

## What we verify

- **Intended behaviour:** Each mint uses a SplitXCH splitter address as `royalty_address` when calling MintGarden. That address splits secondary sale royalties (10% creator / 2% treasury, 12% total on-chain).
- **Proof:** For every row in `phase2_mints` (status = minted) we have an expected splitter in `splitter_addresses`. We then check MintGarden’s NFT detail for that launcher and confirm `royalty_address` equals the expected splitter.

## Prerequisites

- `ADMIN_SECRET` (Cloudflare Pages secret used for admin APIs). Set it when running the script.
- Optional: `BASE_URL` (default `https://wojak.ink`). Use e.g. `http://localhost:8788` if you run against local `wrangler pages dev`.

## 1. Admin API (data source)

**Endpoint:** `GET /api/admin/verify-royalty-split`  
**Auth:** `Authorization: Bearer <ADMIN_SECRET>`

Returns:

- All minted NFTs from `phase2_mints` with `mintgarden_launcher_id` and `wallet_address`.
- For each, the expected SplitXCH splitter from `splitter_addresses` (creator_wallet + wave 1).

Response shape:

```json
{
  "mints": [
    {
      "mintNumber": 1,
      "launcherId": "nft1...",
      "walletAddress": "xch1...",
      "expectedSplitter": "xch1..."
    }
  ],
  "summary": {
    "total": 250,
    "withExpectedSplitter": 250,
    "missingSplitterInDb": 0
  }
}
```

If `missingSplitterInDb` > 0, those mints have no row in `splitter_addresses` (e.g. minted before SplitXCH was enabled or TREASURY_ADDRESS unset).

## 2. Verification script

**Script:** `scripts/verify-split-on-mints.ts`

1. Calls the admin API above to get every mint and its expected splitter.
2. For each mint, fetches `GET https://api.mintgarden.io/nfts/{launcherId}` and reads `royalty_address`.
3. Compares on-chain `royalty_address` to `expectedSplitter` (after normalising for comparison).
4. Prints a report: total checked, matched, mismatches, and any NFTs that could not be fetched.

**Run:**

```bash
ADMIN_SECRET=your_admin_secret npx tsx scripts/verify-split-on-mints.ts
```

With custom base URL (e.g. local):

```bash
BASE_URL=http://localhost:8788 ADMIN_SECRET=your_secret npx tsx scripts/verify-split-on-mints.ts
```

**Exit code:** `0` if every checked mint has on-chain royalty = expected splitter; `1` if there are mismatches.

## 3. Interpreting the report

- **Match:** On-chain `royalty_address` equals the expected SplitXCH splitter → split is correctly set.
- **Mismatch:** On-chain address differs (e.g. minter’s wallet instead of splitter) → investigate that mint (e.g. old mint before SplitXCH, or a one-off failure).
- **No expected splitter in DB:** Mint is in `phase2_mints` but has no row in `splitter_addresses`. Possible if SplitXCH was not enabled for that mint (e.g. TREASURY_ADDRESS not set at mint time).
- **Fetch failed:** MintGarden did not return the NFT (e.g. network, rate limit, or invalid launcher). Re-run or check manually.

## 4. One-off proof for “all mints so far”

1. Deploy the app so that `GET /api/admin/verify-royalty-split` is live (it uses the same D1 as production).
2. Run the script once with production `BASE_URL` and your `ADMIN_SECRET`.
3. If the script exits 0 and the report shows “All minted NFTs have the SplitXCH split set as royalty_address on-chain”, that is the proof for all NFTs minted up to that run.
4. Save the script output (or a screenshot) as evidence.

No DB access or wrangler is required on your machine; only the admin secret and network access to wojak.ink and api.mintgarden.io.
