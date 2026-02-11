# Your Wojak — Launch Plan

Step-by-step plan to get the generator and minting ready for launch. Do each phase in order; each step is actionable.

---

## Phase 1: Generator design (layers, order, details)

**Goal:** All YourWojak layers render in the correct order, details/frames show correctly, and the UI matches the manifest.

### 1.1 Audit layer order and virtual layers

- [ ] **1.1.1** Open the Generator and go through each tab: Background, Base, Clothes, Mouth, Mask, Eyes, Head.
- [ ] **1.1.2** Confirm the **render order** matches the design: Background → Base → Clothes → FacialHair → MouthBase → MouthItem → Mask → Eyes → Head, with virtual layers (Astronaut, Bandana over Ronin, Eyes over Head, Bubble Gum over eyes, etc.) in the right place.
- [ ] **1.1.3** Check `src/services/canvasRenderer.ts` — `buildRenderLayers()` and `LAYER_Z_INDEX` — and compare to `public/assets/wojak-layers/YourWojak-layers/manifest.json` `zIndex` per category (Clothes 2, Face-laser 10.5, Face-wear 10, Head 12, Mouth 5). Resolve any mismatch (e.g. Face-laser vs Face-wear order).
- [ ] **1.1.4** Document any G2-only traits that need special ordering (e.g. Laser Eyes above/below Face-wear). Implement in `buildRenderLayers()` if needed.

### 1.2 Manifest vs assets

- [ ] **1.2.1** Verify every file referenced in `YourWojak-layers/manifest.json` exists in `YourWojak-layers/` (e.g. `Face-wear_MOG-Glasses_detail_default.png` — manifest says "Default (Rainbow)" with file `Face-wear_MOG-Glasses_detail_default.png`; confirm the file exists or fix the manifest).
- [ ] **1.2.2** Run a quick script or manual check: for each trait’s `outlineFile`, `fillFile`, `fill1File`, `fill2File`, `fillFiles`, `detailFile`, `detailOptions[].file`, `frameFiles[].file`, `layer0File`, `layer1File` — ensure the path is correct and the file is present.
- [ ] **1.2.3** Fix any typos (e.g. `Straigth` in manifest vs `Straight`) in display names if desired; keep file names as-is if assets use them.

### 1.3 Details and frames

- [ ] **1.3.1** For traits with `detailOptions` (e.g. Astronaut, SWAT, Wizard-drip, Beer Hat, MOG Glasses): in the Generator, select the trait and open the detail selector (G2TraitPanel). Confirm every detail option loads and displays.
- [ ] **1.3.2** For traits with `frameFiles` (e.g. Astronaut “Detail 1 Frame” / “Detail 2 Frame”, Wizard-drip “Patch Frame”): confirm frames render on top of the correct detail and that the “over” target matches.
- [ ] **1.3.3** If any detail or frame image is missing or wrong, fix the manifest or add the asset.

### 1.4 G2 ↔ G1 mapping and rules

- [ ] **1.4.1** Check `src/lib/traitMapping.ts` — `G1_TO_G2_MAP` — so G1 options (e.g. from old CLOTHES, HEAD, EYE folders) that have a YourWojak equivalent point to the right G2 trait ID. Add or fix mappings for any new YourWojak-only traits (no G1 match).
- [ ] **1.4.2** In `src/lib/wojakRules.ts`, confirm rules still make sense for YourWojak (e.g. Astronaut blocks certain mouths, Mask blocks MouthItem, Pipe/Bubble Gum disable MouthItem). Add rules for new G2-only combos if needed.
- [ ] **1.4.3** Test blocking: e.g. select Astronaut, then try to select Pipe/Bubble Gum — should be blocked or forced to Numb. Select Copium mask — MouthItem should clear. Repeat for other critical combos.

### 1.5 Mouth layer and Eyes

- [ ] **1.5.1** Mouth tab uses `MouthLayerSelector` and combines MouthBase + MouthItem. Confirm YourWojak mouth traits (BubbleGum, Pipe) appear and are selectable when not blocked by rules.
- [ ] **1.5.2** Eyes tab: Face-wear and Face-laser both map to UI “Eyes”. Confirm both categories appear in the same grid (or intended UX) and that Laser Eyes and e.g. 3d-glasses can be combined if design allows; if not, add a rule.
- [ ] **1.5.3** Confirm default mouth for export is set (e.g. Numb) when no mouth is selected, and that “Mouth” required-for-export check uses the right layer.

### 1.6 Export and mint payload

- [ ] **1.6.1** Export image (WebP 1024) and confirm the composite matches the preview (all layers, details, colors).
- [ ] **1.6.2** Trigger “Mint” (with wallet connected): confirm the payload sent to `/api/mint/prepare` includes the correct `selectedLayers` (paths) and `selectedColors` (hex per layer) for every visible layer. No missing or wrong keys.

**Phase 1 done when:** Layer order is correct, every manifest-referenced asset exists and loads, details/frames work, rules and G2 mapping are correct, and export/mint payload matches the preview.

---

## Phase 2: Minting infrastructure

**Goal:** Backend can create a MintGarden offer (paid) or trigger a direct mint (free), and frontend can complete the flow.

### 2.1 MintGarden API

- [ ] **2.1.1** Get MintGarden Dynamic Minting API docs (or Acevail contact): endpoint(s), auth (e.g. API key), request body for “create offer” (paid) and “mint to address” (free), and response (offer string, launcher_id, etc.).
- [x] **2.1.2** Create `functions/api/mint/request.ts` that:
  - Accepts: wallet address, mint type (paid/free), IPFS image + metadata URIs, price (for paid), collection UUID (from env).
  - Calls MintGarden to create an offer (paid) or mint to wallet (free).
  - Returns: `{ offerFile?: string, launcherId?: string }` or error.
- [x] **2.1.3** From `functions/api/mint/prepare.ts`, after a successful IPFS upload, call `request.ts` (or inline the MintGarden call). For **paid**: store returned `offerFile` and `expires_at` in `phase2_mints`, return `mintId`, `offerFile`, `expiresAt` to the client. For **free**: pass launcher_id back if MintGarden returns it, and/or rely on confirm step.

### 2.2 Environment and config

- [ ] **2.2.1** In Cloudflare (Pages env or `wrangler.toml`): set `PHASE2_COLLECTION_UUID` to the real “Your Wojak” collection UUID from MintGarden. Replace `PLACEHOLDER_ROYALTY_XCH_ADDRESS` if you use royalties.
- [ ] **2.2.2** Set secret `MINTGARDEN_API_KEY` (or whatever the MintGarden API uses) in the Pages project.
- [ ] **2.2.3** Ensure `PINATA_JWT` is set (already used by `upload.ts`). Confirm Pinata gateway or URLs work for the metadata URIs you store.

### 2.3 Confirm and status

- [ ] **2.3.1** For **paid**: after user accepts the offer in Sage, frontend gets launcher_id (from wallet or a MintGarden “my NFTs” call). Frontend calls `POST /api/mint/confirm` with `{ mintId, launcherId }`. Backend already updates `phase2_mints`, assigns `mint_number`, increments `trait_usage`. Confirm this works with a test mint.
- [ ] **2.3.2** For **free**: prepare already creates the mint and assigns number; confirm endpoint may only be needed if MintGarden returns launcher_id asynchronously. If so, same `confirm` flow with `launcherId` when available.
- [x] **2.3.3** Optional: **Resume pending offer on reload.** On Generator page load, if wallet is connected, call `GET /api/mint/status?wallet=...`. If `pending` is non-null, re-open the countdown modal and restore “Copy Offer File” so the user can finish the paid flow.

**Phase 2 done when:** Paid mints create a real offer and user can accept in Sage; free mints complete and show success; confirm and (optionally) status/resume work.

---

## Phase 3: Credits and supply

**Goal:** Credits and supply numbers are correct and visible.

### 3.1 Credit system

- [ ] **3.1.1** Run D1 migration `030_credit_system.sql` on production if not already.
- [ ] **3.1.2** Run the backfill script (or apply generated SQL) so historical XCH buyers get credits. Confirm a test wallet’s balance via `GET /api/credits/balance?wallet=xch1...`.
- [ ] **3.1.3** Ensure the credit-tracker worker is deployed and cron is enabled. After a test XCH sale, wait for the next run (or trigger manually) and confirm a new row in `credit_events`.

### 3.2 Supply and pricing

- [ ] **3.2.1** Supply shown in the Generator (“X / 4,200”) should come from `GET /api/mint/pricing` (already wired in MintContext). Confirm the number matches `phase2_mints` where `status = 'minted'`.
- [ ] **3.2.2** Trait surcharges (if you show them) come from the same `pricing` endpoint. Confirm `trait_usage` is updated only on confirm (not on prepare).

**Phase 3 done when:** Credits and supply are correct; leaderboard and balance display correctly.

---

## Phase 4: Testing and launch

**Goal:** End-to-end flows work; then go live.

### 4.1 Test flows

- [ ] **4.1.1** **Free mint:** Connect wallet with enough credits → design → Free Mint → confirm. Check: credit balance decreases, supply increases, success screen shows mint number and link. Verify NFT in wallet/MintGarden.
- [ ] **4.1.2** **Paid mint:** Design → Pay XCH → get offer → copy offer / accept in Sage. After accept, confirm (or auto-detect) launcher_id and call confirm. Check: supply increases, trait_usage increments, success screen.
- [ ] **4.1.3** **Offer expiry:** Start paid flow, do not accept. Wait for expiry (or shorten for test). Confirm modal shows “expired” and user can try again; no charge.
- [ ] **4.1.4** **Double-mint:** With one pending paid mint, try to start another. Backend should return existing pending offer (no second IPFS upload).
- [ ] **4.1.5** **Resume after reload:** Start paid flow, copy offer, reload page. If status endpoint is wired, modal should re-open with countdown and copy button.

### 4.2 Launch checklist

- [ ] **4.2.1** Replace any placeholder copy (e.g. “USER_PROVIDES_UUID” in metadata) with real collection UUID or remove before first real mint.
- [ ] **4.2.2** Confirm CHIP-0007 metadata (name, description, collection, attributes) is correct for “Your Wojak” and matches what you want on-chain.
- [ ] **4.2.3** Announce: retroactive credits date (if applicable), launch time, and link to Generator. Monitor credit_events, phase2_mints, and errors in the first hours.

**Phase 4 done when:** All test flows pass and launch checklist is complete; then announce and monitor.

---

## Summary: what you need to do

| Phase | You (or design) | Dev / system |
|-------|------------------|--------------|
| **1** | Confirm layer order and “correct” look; list any missing assets or wrong details | Fix manifest/assets, layer order in code, rules, G2 mapping, export payload |
| **2** | Get MintGarden API details (or intro); create “Your Wojak” collection and get UUID | Add `request.ts`, wire prepare → MintGarden, set env/secrets, optional status/resume |
| **3** | (Optional) Confirm backfill date and test wallet | Run migration + backfill, deploy credit-tracker, verify balance/supply |
| **4** | Run through free/paid/expiry/double-mint (and reload) | Fix bugs; replace placeholders; go live |

**Next immediate step:** Start with **Phase 1.1** (audit layer order and virtual layers in the Generator and in code). Once 1.1 is done, we can fix any ordering or missing-layer issues, then move to 1.2 (manifest vs assets) and so on.
