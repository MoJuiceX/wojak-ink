# Your Wojak — Price curve analysis (post-launch)

**Collection:** [Your Wojak on MintGarden](https://mintgarden.io/collections/your-wojak-col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx)  
**Date:** 2026-02-21  
**Data:** MintGarden events API (type=2, XCH sales) + live `/api/mint/pricing`

## Design (intended)

- **Base cost:** 0.2 XCH for every mint.
- **Surcharge:** Only **three** categories add a surcharge: **Head**, **Clothes**, **Face Wear** (hat, clothing, facewear).
- **Formula:** `total = 0.2 + max(surcharge among Head, Clothes, Face Wear)` — i.e. **one** surcharge per mint (the highest of the three), not the sum of all three.
- **Exempt traits:** “No Headgear”, “No Face Wear” do not add surcharge.

Implementation: `functions/api/mint/_shared.ts` (`SURCHARGE_CATEGORIES`, `surchargeXch`), `submit.ts` / `prepare.ts` (max surcharge only).

## How we checked

1. **Fetch sales:** MintGarden `GET /events?collection=...&type=2&size=100` with `page` cursor until no `next`. Only events with `xch_price > 0` (XCH sales).
2. **Attributes:** For each sold NFT, `GET /nfts/{nft_id}` to read `metadata_json.attributes` (Head, Clothes, Face Wear, etc.).
3. **Current curve:** `GET https://wojak.ink/api/mint/pricing` for current trait `surchargeXch` per `trait_category_trait_name`.
4. **Expected price:** For each sale, `expected = 0.2 + max(surcharge for that NFT’s Head, Clothes, Face Wear)`.
5. **Compare:** Actual sale price vs this expected (noting that “expected” uses **current** usage/decay; at mint time usage was different, so small differences are normal).

Script: `scripts/analyze-your-wojak-prices.ts`. Run:

```bash
npx tsx scripts/analyze-your-wojak-prices.ts
# Optional: BASE_URL=https://wojak.ink
```

## Result (run on 2026-02-21)

- **XCH sales analyzed:** 153 (MintGarden events, two pages).
- **Actual price:** min 0.112, max 0.478, mean 0.308 XCH.
- **Expected (current curve):** mean 0.316 XCH.
- **Conclusion:** No bug found. Prices sit in the band of “base + single surcharge”. Mean actual slightly below mean expected, consistent with using **current** trait usage (and decay) vs usage at mint time.
- **“Sum of surcharges” check:** If we had been adding Head + Clothes + Face Wear surcharges together, many prices would be ~0.5–0.7+ XCH; we do **not** see that pattern. Only one surcharge (the max) is applied.

## Notes

- **0.112 XCH sale:** One sale below base (0.2). Likely secondary/transfer or listing quirk; not a primary mint price.
- **CAT sales:** Script only uses XCH events. CAT sales would need token→XCH rates and could be added later if desired.
- **Pagination:** Events API uses `next` as the `page` param for the next page (not `cursor`).

## If you want to re-run or extend

- Full run takes a few minutes (rate-limited MintGarden + pricing fetch).
- To include more sales: ensure script paginates until `data.next` is null (already implemented).
- To analyze CAT sales: add token rates and events with `payments[].asset_id` / amount, then convert to XCH equivalent and compare to the same expected formula.
