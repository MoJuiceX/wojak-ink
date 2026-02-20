# Wojak NFT Mint Metadata — Proof: Combat Type, Nature, Ability, Moves on IPFS

**Date:** 2026-02-20  
**Purpose:** Confirm that when a user creates a Wojak NFT in the Generator, the metadata sent to IPFS includes **Combat Type**, **Nature**, **Ability**, and **Move 1–4** correctly.

---

## 1. Where It’s Built

| Step | File | What happens |
|------|------|--------------|
| Job processing | `functions/api/mint/process.ts` | Reads `layers_json` + `colors_json` from `mint_jobs`, builds metadata, uploads to IPFS. |
| Layer traits | `consolidateTraits(layers)` → `traitResolver.ts` | Maps layer paths to canonical `trait_type` + display name (Background, Head, Clothes, etc.). |
| Combat identity | `calculateCombatIdentity({ traits, colors, details })` → `src/lib/combat/identity-calculator.ts` | From traits + colors: **Type** (highest type score), **Nature** (from stat spread via `getNatureByStats`), **Ability** (offensive vs defensive sum → `getAbilitiesForType(type)`). |
| Moves | `assignMoves(combatIdentity)` → `src/lib/combat/move-assigner.ts` | Picks 4 moves for that type (3 damage + 1 status). Returns **move IDs** (e.g. `poke_fire_flare-blitz`). |
| CHIP-0007 combat attrs | `buildCombatAttributes({ type, nature, ability, moves })` → `process.ts` | Adds 7 attributes: **Combat Type**, **Nature**, **Ability**, **Move 1**, **Move 2**, **Move 3**, **Move 4**. |
| Final metadata | Same `process.ts` | `metadata.attributes` = layer attributes (sorted) + combat attributes. This object is passed to `uploadToIPFS(imageBase64, metadata, ...)`. |

So: **Types, Natures, and Abilities are correctly implemented** in the metadata that gets sent to IPFS. **Moves** are stored as **move IDs** (stable identifiers); display names live in `src/lib/combat/data/moves.ts` and can be resolved by ID for UIs/marketplaces.

---

## 2. One Full Example of Metadata Sent to IPFS

Below is one concrete example of the **metadata** object that is pinned to IPFS (and referenced by the NFT on-chain). Layer traits and combat attributes are real shapes; exact values depend on the user’s selections and the deterministic identity/move logic.

```json
{
  "format": "CHIP-0007",
  "name": "Your Wojak #42",
  "description": "Your Wojak puts collectors in control. Same handcrafted layers and lore from the Wojak Farmers Plot collection — but you choose every layer, every color, every detail using the Wojak Generator on Wojak.ink 🍊",
  "sensitive_content": false,
  "collection": {
    "name": "Your Wojak",
    "id": "<PHASE2_COLLECTION_UUID>",
    "attributes": [
      { "type": "description", "value": "Your Wojak puts collectors in control. Choose every layer, every color, every detail." },
      { "type": "website", "value": "https://wojak.ink" },
      { "type": "twitter", "value": "https://x.com/MoJuiceX" }
    ]
  },
  "edition": 42,
  "date": 1730000000000,
  "compiler": "Wojak.ink Generator",
  "attributes": [
    { "trait_type": "Background", "value": "Moon" },
    { "trait_type": "Base", "value": "Wojak" },
    { "trait_type": "Clothes", "value": "Suit" },
    { "trait_type": "Face", "value": "Classic" },
    { "trait_type": "Face Wear", "value": "MOG Glasses" },
    { "trait_type": "Head", "value": "Crown" },
    { "trait_type": "Mouth", "value": "Cig" },
    { "trait_type": "Combat Type", "value": "FIRE" },
    { "trait_type": "Nature", "value": "Focused" },
    { "trait_type": "Ability", "value": "Blaze" },
    { "trait_type": "Move 1", "value": "poke_fire_flare-blitz" },
    { "trait_type": "Move 2", "value": "poke_fire_overheat" },
    { "trait_type": "Move 3", "value": "poke_fire_flamethrower" },
    { "trait_type": "Move 4", "value": "poke_fire_will-o-wisp" }
  ],
  "edition_number": 42,
  "edition_total": 4200
}
```

- **Combat Type** — One of the 18 types (e.g. `FIRE`, `PSYCHE`, `NEUTRAL`). From `calculateCombatIdentity(...).type`.  
- **Nature** — One of the 25 natures (e.g. `Focused`, `Balanced`, `Wild`). From `getNatureByStats(highestStat, lowestStat).name`.  
- **Ability** — One of the two abilities for that type (e.g. `Blaze` / `Inferno` for FIRE). From `getAbilitiesForType(type)` and offensive vs defensive stat sum.  
- **Move 1–4** — Four **move IDs** for that type (e.g. `poke_fire_flare-blitz`). From `assignMoves(combatIdentity).moves`. Display names (e.g. "Rug Pull Rush", "Meltdown", "Flamethrower", "Spite Flame") are in `src/lib/combat/data/moves.ts`; lookup by `id`.

---

## 3. Code References (Proof)

- **Combat attributes pushed into IPFS metadata:**  
  `functions/api/mint/process.ts` (lines 178–209, 215–235): build `attributes`, then `metadata = { ..., attributes }`, then `uploadToIPFS(imageBase64, metadata, ...)`.
- **Combat Type / Nature / Ability:**  
  `identity-calculator.ts` → `type`, `nature`, `ability`.  
  `process.ts` → `buildCombatAttributes({ type: combatIdentity.type, nature: combatIdentity.nature, ability: combatIdentity.ability, moves: ... })`.
- **Move IDs:**  
  `move-assigner.ts` → `assignMoves(identity)` returns `{ moves: string[] }` (IDs).  
  `process.ts` → `buildCombatAttributes({ ..., moves: combatMoveAssignment.moves })` → `Move 1` … `Move 4` get those IDs.
- **Unit test (combat attributes shape):**  
  `functions/api/mint/process.test.ts` — `buildCombatAttributes` test shows the 7 entries (Combat Type, Nature, Ability, Move 1–4) with expected structure.

---

## 4. Summary

| Attribute    | Source | Example value | On IPFS? |
|-------------|--------|----------------|----------|
| Combat Type | `calculateCombatIdentity().type` | `FIRE`, `PSYCHE`, … | Yes |
| Nature      | `getNatureByStats(...).name`     | `Focused`, `Balanced`, … | Yes |
| Ability     | `getAbilitiesForType(type)` + stat sum | `Blaze`, `Magic Guard`, … | Yes |
| Move 1–4    | `assignMoves(identity).moves`   | Move IDs, e.g. `poke_fire_flare-blitz` | Yes (as IDs) |

So when a user creates a Wojak NFT in the Generator, the metadata that gets sent to IPFS **does** include Combat Type, Nature, Ability, and Move 1–4; types and natures and abilities are human-readable, and moves are stable IDs that can be resolved to display names from the moves data.
