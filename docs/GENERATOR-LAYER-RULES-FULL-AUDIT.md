# Generator Layer Rules — Full Audit

Comprehensive audit of all layer stacking rules and trait-specific logic. Use this to verify consistency and identify adjustments before implementing changes.

---

## 1. Core Z-Index Order (Bottom → Top)

| z    | Layer                      | Used For                                                |
|------|----------------------------|---------------------------------------------------------|
| 0    | Background                 | All backgrounds                                         |
| 0.9  | ClothesCompositeUnderBase  | Composite suit parts behind Base (e.g. Proof hood back) |
| 1    | Base                       | Wojak body                                              |
| 2    | Clothes                    | Regular clothes (Tee, Sonic, Bathrobe, etc.)           |
| 2.1  | ClothesComposite0          | Composite suit layer0 — under Mouth                     |
| 2.2  | ClothesComposite1          | Composite suit layer1                                   |
| 3    | ClothesAddon               | G1 Chia Farmer addon only                               |
| 4    | FacialHair                 | Neckbeard, Stache                                       |
| 5    | MouthBase                  | Numb, Smile, Pizza, Pipe (G2), BubbleGum, etc.          |
| 5.1  | BubbleGumRekt              | Rekt-specific bubble gum variant                        |
| 6    | MouthItem                  | Cig, Joint, Cohiba (when separate from MouthBase)       |
| 6.5  | TysonTattoo                | Eyes over mask (virtual)                                |
| 6.6  | NinjaTurtleUnderMask       | Ninja mask under covering masks (virtual)               |
| 7    | Mask                       | Bandana, Hannibal, Copium, etc.                         |
| 8    | EyePatchUnderHannibal      | Eye patch under Hannibal (virtual)                      |
| 9    | HannibalMask               | Hannibal when not StandardCut (virtual)                 |
| 10   | Eyes                       | Glasses, Laser Eyes, Ninja Turtle Mask, etc.             |
| 10.5 | EyesOverHannibal           | Eyes over Hannibal (virtual)                            |
| 10.8 | MaskUnderAstronaut         | Bandana under helmet (virtual)                          |
| 11   | Astronaut                  | Full suit when Astronaut selected (virtual)             |
| 11.3 | MaskOverAstronaut          | Most masks over helmet (virtual)                         |
| 11.5 | LaserEyesOverAstronaut     | Laser eyes over helmet (virtual)                         |
| 12   | Head                       | Hats, helmets, Crown, etc.                              |
| 13   | BandanaMaskOverRonin       | Bandana over Ronin helmet (virtual)                      |
| 14   | EyesOverHead               | Eyes (right half) over clown/pirate/ronin/saiyan heads  |
| 15   | EyesOverStandardCut        | Eyes over Standard Cut / Trump Wave                     |
| 16   | MaskOverStandardCut        | Hannibal/Copium over Standard Cut                       |
| 60   | BubbleGumOverEyes           | Bubble gum over eyes (virtual)                          |
| 100  | FullFaceMask               | Skull, Fake It, etc. — always on top                    |

---

## 2. Invariant Rules (Should Always Hold)

1. **MouthBase (5) and MouthItem (6) always on top of all Clothes**
   - Pipe, Pizza, Numb, etc. must render over Tee, Gopher suit, Sonic suit, and every other outfit.

2. **Pipe and all MouthItems treated the same**
   - All MouthItems (Cig, Joint, Cohiba, Pipe when it's MouthItem) at z 6.

3. **All Clothes treated consistently**
   - Regular clothes: z 2
   - Composite suits: z 2.1/2.2 (under mouth)
   - No Clothes should ever draw above MouthBase or MouthItem.

4. **Masks, Eyes, Heads** — per-category consistency (see below).

---

## 3. Clothes — Treatment by Type

### 3.1 Regular (Single/Dual Fill)

**Traits:** Tee, Tank-top, Sonic-suit, Bathrobe, Ronin, Roman-drip, Leather-jacket, Born-to-ride, Sports-jacket, Straitjacket, Super-Saiyan, fire-figther, gods-robe, Wizard-drip, Military-jacket, SWAT, Viking-Armor

**Render:** Single Clothes layer at z 2. Mouth and MouthItem draw on top. ✅ Consistent.

### 3.2 Composite (Layer0 / Layer1)

**Traits:** Bepe-suit, Pepe-suit, Drac-suit, Goose-suit, Pickle-suit, gopher-suit, Proof-of-prayer

**Render:**
- `underBase: true` → ClothesCompositeUnderBase (0.9)
- `underBase: false` or no flag → ClothesComposite0/1 (2.1/2.2)
- Mouth and MouthItem on top. ✅ Fixed.

### 3.3 Special G2 Logic (buildG2LayerData)

| Trait          | Behavior                                                          |
|----------------|-------------------------------------------------------------------|
| Bepe-army      | Default vs colored, detail overlay, name position                 |
| Astronaut      | Skips normal Clothes, draws at z 11; blocks some mouth options    |
| Chia-farmer    | Draws Tee/Tank under + outfit on top, both at z 2                 |
| Suit           | Tie vs Bow variants, fill order                                   |
| Ninja-turtle-fit | Split: fill3/outline2 under base (0.9), fill1/fill2/outline1 at 2  |
| SWAT           | Detail options, ordered draw items                                |

---

## 4. Mouth — Treatment

### 4.1 MouthBase (z 5)

- Numb, Smile, Teeth, Pizza, Pipe (G2), BubbleGum, etc.
- **Astronaut:** Pipe, Pizza, BubbleGum are skipped (blocked).
- **Centurion head:** If in `MOUTH_OVER_CENTURION`, z = Head + 1 (13) so mouth draws on top of helmet.

### 4.2 MouthItem (z 6)

- Cig, Joint, Cohiba when in MouthItem.
- **Astronaut:** All MouthItems skipped.
- **Centurion:** Same over-centurion elevation as MouthBase when in the list.

### 4.3 MOUTH_OVER_CENTURION

`['stach', 'Pizza', 'Bubble-Gum', 'Pipe', 'Joint', 'Cohiba', 'Cig', 'Sick']`

**Check:** Are all mouth options that should appear over Centurion included? Any new G2 mouth traits missing?

---

## 5. Masks — Treatment

### 5.1 Normal Mask (z 7)

- Bandana, Hannibal, Copium, etc.

### 5.2 Virtual / Special Cases

- **Full-face masks:** Skull, Fake It, etc. → FullFaceMask (z 100), skip normal Mask.
- **Astronaut:** Bandana → MaskUnderAstronaut (10.8); Hannibal → MaskUnderAstronaut; others → MaskOverAstronaut (11.3).
- **Ronin + Bandana:** BandanaMaskOverRonin (z 13).
- **Standard Cut / Trump Wave + Hannibal or Copium:** MaskOverStandardCut (z 16).
- **Hannibal (no Standard Cut):** HannibalMask (z 9) instead of normal Mask.

### 5.3 Ninja-Covering Masks

`['copium', 'hannibal', 'bandana']` — when selected, Ninja Turtle (Eyes) gets NinjaTurtleUnderMask (z 6.6).

---

## 6. Eyes — Treatment

### 6.1 Normal Eyes (z 10)

- Glasses, shades, etc.

### 6.2 Virtual / Special Cases

- **Laser Eyes + Astronaut:** LaserEyesOverAstronaut (11.5), skip normal Eyes.
- **Ninja Turtle + Astronaut:** Same layer, clipLeftPercent 0.25, skip normal Eyes.
- **Ninja Turtle + Ronin:** Same layer, clipLeftPercent 0.25, skip normal Eyes.
- **Tyson Tattoo + any Mask:** TysonTattoo (6.5), skip normal Eyes.
- **Ninja Turtle + covering mask:** NinjaTurtleUnderMask (6.6), skip normal Eyes.
- **Eye Patch + Hannibal:** EyePatchUnderHannibal (8), skip normal Eyes.
- **Standard Cut / Trump Wave (no Eye Patch):** Skip normal Eyes; use EyesOverStandardCut (15) if Eyes selected.

### 6.3 HEADS_NEEDING_EYES_OVERLAY

`['clown', 'pirate', 'ronin', 'supa', 'saiyan']` — right half of eyes drawn above head (EyesOverHead, z 14).

**Check:** Any new heads that should have eyes overlay?

---

## 7. Head — Treatment

### 7.1 Normal Head (z 12)

- Crown, Fedora, etc.

### 7.2 Special Cases

- **Astronaut:** Head layer skipped (no visible head).
- **Centurion + mask:** Head path swapped to Centurion mask variant.
- **FacialHair Stache + Centurion:** z = Head + 1 (13).
- **MouthBase/MouthItem + Centurion (in MOUTH_OVER_CENTURION):** z = Head + 1 (13).

---

## 8. Issues Identified — Test Before Changing

### 8.1 Trait Card Thumbnails — Clothes vs Mouth Order

**Issue:** Several Clothes trait cards render Base → Mouth → Clothes. That puts clothes on top of the mouth in the thumbnail, while the main canvas has Mouth on top of Clothes.

**Affected paths (order: Base, Mouth, then clothes):**
- Chia Farmer
- Super Saiyan and other dual-fill (SWAT, etc.)
- Suit (colorableDualFill)
- colorableSingleFill (Sonic, Bathrobe, Roman-drip, etc.)

**Desired:** Base → clothes → Mouth, so Mouth is on top (consistent with main canvas).

**Test:** Compare each Clothes trait card thumbnail to the main preview when that trait is selected. Mouth (and Pipe if shown) should appear on top in both.

---

### 8.2 Chia Farmer Trait Card — Missing Pipe

**Issue:** Chia Farmer thumbnail shows Base, Mouth, Tee, outfit. No MouthItem (Pipe). Other thumbnails also omit Pipe.

**Question:** Should Pipe (or a generic mouth item) be included in all Clothes thumbnails for consistency?

---

### 8.3 MOUTH_OVER_CENTURION — Completeness

**Current:** `['stach', 'Pizza', 'Bubble-Gum', 'Pipe', 'Joint', 'Cohiba', 'Cig', 'Sick']`

**Check:** Are all G2 mouth traits that should appear over Centurion in this list? Any new traits (e.g. Gold-teeth, Screaming) that should be added?

---

### 8.4 HEADS_NEEDING_EYES_OVERLAY — Completeness

**Current:** `['clown', 'pirate', 'ronin', 'supa', 'saiyan']`

**Check:** Any new heads (e.g. Standard-Cut, Trump-Wave) that need similar treatment? (Currently they use EyesOverStandardCut / MaskOverStandardCut instead.)

---

### 8.5 G1 vs G2 Path Handling

**Issue:** Some logic uses `pathContains` on paths. G2 uses virtual paths like `/g2/Clothes/Ninja-turtle-fit`. G1 uses paths like `/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png`.

**Check:** Does every rule that relies on path strings work for both G1 and G2 paths?

---

### 8.6 Goose Suit — No underBase

**Manifest:** Goose suit has `layer0` and `layer1`, neither has `underBase`. Both draw at 2.1 and 2.2 (under mouth). ✅ Matches desired behavior.

**No change needed.**

---

### 8.7 Pickle / Gopher — layer0File / layer1File

**Manifest:** Use `layer0File` and `layer1File`, no `layers` array. `getCompositeLayerEntries` gives both `underBase: false`, so they use ClothesComposite0 and ClothesComposite1. ✅ Correct.

---

## 9. Summary — Recommended Test Matrix

Before changing code, manually verify:

| # | Test Case                                   | Expected                                              |
|---|---------------------------------------------|-------------------------------------------------------|
| 1 | Tee + Pizza + Pipe                          | Pizza and Pipe visible on top of Tee                 |
| 2 | Gopher suit + Pizza + Pipe                   | Pizza and Pipe on top of suit                        |
| 3 | Sonic suit + Pizza                           | Pizza on top of Sonic                                |
| 4 | Proof of Prayer + Pizza                     | Pizza on top of hood                                 |
| 5 | Chia Farmer + Pipe                           | Pipe on top of outfit                                |
| 6 | All composite suits + all mouth options    | Mouth always on top                                  |
| 7 | Chia Farmer trait card thumbnail             | Mouth visible on top of outfit (currently may be wrong) |
| 8 | Sonic suit trait card thumbnail              | Mouth on top (currently may be wrong)                 |
| 9 | Centurion + Pizza / Pipe                     | Mouth over helmet                                    |
| 10| Astronaut + any mouth                        | Blocked mouths not shown; allowed mouths visible     |

---

## 10. Files Reference

| File                              | Purpose                              |
|-----------------------------------|--------------------------------------|
| `canvasRendererConstants.ts`      | Z-index values, MOUTH_OVER_CENTURION, etc. |
| `canvasRendererLayerBuilder.ts`   | Virtual layers, skip logic, path checks   |
| `canvasRenderer.ts`               | G2 expansion, buildG2LayerData, composite handling |
| `generatorService.ts`             | getCompositeLayerEntries, underBase from manifest |
| `TraitSelector.tsx`               | Trait card thumbnails stacking       |
| `wojakRules.ts`                   | Disabled options, force selections   |
