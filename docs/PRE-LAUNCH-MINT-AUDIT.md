# Pre-launch mint audit — before turning minting back on

Use this checklist to confirm **you receive XCH on paid mints** (target address) and **SplitXCH is used** for royalties, then re-enable minting.

---

## 1. Target address (where primary-sale XCH goes when a user pays for the mint)

**What it controls:** For **paid** mints, MintGarden creates an offer. The **payment** (XCH) goes to the address we send as `target_address`. We use **TREASURY_ADDRESS** for that by default (so the same wallet receives both mint payments and the ~2% royalty share). You only need **CREATOR_PAYOUT_ADDRESS** if you want primary-sale XCH to go to a *different* address than the treasury.

**Code path:**
- `functions/api/mint/request.ts`: For paid mints, `target_address = CREATOR_PAYOUT_ADDRESS || TREASURY_ADDRESS`. If neither is set, the API throws.
- So with **TREASURY_ADDRESS** set (which you already have), paid-mint XCH goes to the treasury. No need to set `CREATOR_PAYOUT_ADDRESS` unless you want a separate payout address.

**Checklist:**
- [ ] **TREASURY_ADDRESS** is set in Cloudflare (you have this). That’s where primary-sale XCH and royalty share go.
- [ ] **CREATOR_PAYOUT_ADDRESS** is **optional**. Set it only if you want mint payments to go to a different XCH address than the treasury.
- [ ] **(Optional)** If you do set `CREATOR_PAYOUT_ADDRESS`, verify with the admin endpoint:
  ```bash
  curl -s -H "Authorization: Bearer YOUR_ADMIN_SECRET" "https://wojak.ink/api/admin/creator-payout-check"
  ```
  You should see `"configured": true` and a `"suffix"` that matches the last 6 characters of your intended address.

**Summary:** With **TREASURY_ADDRESS** set, you get primary-sale XCH (and royalty share) in that wallet. No need for a separate CREATOR_PAYOUT_ADDRESS unless you want to split them.

---

## 2. SplitXCH (minter + treasury get royalties on resales)

**What it controls:** The NFT’s on-chain **royalty address**. We set it to a **SplitXCH splitter** so that on secondary sales, ~10% goes to the minter and ~2% to the treasury (and a small fee to SplitXCH).

**Checklist:**
- [ ] **TREASURY_ADDRESS** is set in Cloudflare (you already have this).
- [ ] **All mint paths use SplitXCH** when `TREASURY_ADDRESS` is set:
  - Queue (primary): `process.ts` — ✅ uses `getOrCreateSplitterAddress`, passes `royaltyAddress`.
  - Prepare paid: `prepare.ts` — ✅ uses SplitXCH, passes `royaltyAddress`.
  - Prepare free: `prepare.ts` — ✅ uses SplitXCH, passes `royaltyAddress`.
- [ ] **Optional verification:** From project root run:
  ```bash
  bash scripts/verify-royalty-split.sh
  ```
  Expect: “ROYALTY SPLIT CONFIGURATION CORRECT” and no failures.

**Summary:** With `TREASURY_ADDRESS` set, every mint (free and paid, queue and prepare) uses the SplitXCH splitter as `royalty_address`, so minter and treasury receive royalties on resales as intended.

---

## 3. Re-enable minting (UI)

**Current state:** Minting is paused via a constant in the frontend.

**To turn minting back on:**
- [ ] In `src/components/generator/ActionBar.tsx`, change:
  ```ts
  const GENERATOR_MINTING_PAUSED = true;
  ```
  to:
  ```ts
  const GENERATOR_MINTING_PAUSED = false;
  ```
- [ ] Build, deploy, and confirm the Mint button is enabled and the flow works (e.g. one test paid mint and/or free mint if applicable).

---

## 4. Quick reference

| Item | Where | Purpose |
|------|--------|--------|
| **TREASURY_ADDRESS** | Cloudflare vars (and wrangler.toml) | Primary-sale XCH (paid mints) **and** ~2% of secondary royalties go here (unless CREATOR_PAYOUT_ADDRESS is set for paid mints). |
| **CREATOR_PAYOUT_ADDRESS** | Cloudflare vars (optional) | If set, paid-mint XCH goes here instead of TREASURY_ADDRESS. |
| **GENERATOR_MINTING_PAUSED** | `ActionBar.tsx` | `false` = mint button active. |
| **creator-payout-check** | `GET /api/admin/creator-payout-check` | Verify payout address is set (returns suffix only). |
| **verify-royalty-split.sh** | `scripts/` | Checks SplitXCH config and wiring. |

---

**Final go/no-go:**  
1) `TREASURY_ADDRESS` set in Cloudflare (primary-sale XCH + royalty share go here).  
2) `verify-royalty-split.sh` passes.  
3) Set `GENERATOR_MINTING_PAUSED = false`, deploy, and smoke-test one mint.  
Then you’re good to turn minting back on.
