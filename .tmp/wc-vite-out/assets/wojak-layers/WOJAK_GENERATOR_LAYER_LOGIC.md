# Wojak Generator Layer Behavior Logic - Complete Documentation

This document contains **all the logic** for how layers behave in the Wojak Generator, including render order, virtual layers, rules engine, and special behaviors.

---

## Table of Contents

1. [Layer Order & Structure](#layer-order--structure)
2. [Virtual Layers](#virtual-layers)
3. [Rules Engine](#rules-engine)
4. [Rendering Logic](#rendering-logic)
5. [Special Behaviors](#special-behaviors)
6. [Randomization Logic](#randomization-logic)
7. [Layer Selection Logic](#layer-selection-logic)

---

## Layer Order & Structure

### Canonical Render Order

The render order is defined in `src/lib/memeLayers.js` and determines the z-index stacking of all layers.

**File:** `src/lib/memeLayers.js`

```javascript
export const LAYER_ORDER = [
  { name: 'Background', folder: 'BACKGROUND', zIndex: 0 },
  { name: 'Base', folder: 'BASE', zIndex: 1 },
  { name: 'Clothes', folder: 'CLOTHES', zIndex: 2 },
  { name: 'ClothesAddon', folder: 'CLOTHESADDON', zIndex: 3 },
  { name: 'FacialHair', folder: 'FACIALHAIR', zIndex: 4 },
  { name: 'MouthBase', folder: 'MOUTHBASE', zIndex: 5 },
  { name: 'BubbleGumRekt', folder: 'MOUTH', zIndex: 5.1 },
  { name: 'MouthItem', folder: 'MOUTHITEM', zIndex: 6 },
  { name: 'TysonTattoo', folder: 'TYSONTATTOO', zIndex: 6.5 },
  { name: 'NinjaTurtleUnderMask', folder: 'VIRTUAL', zIndex: 6.6 },
  { name: 'Mask', folder: 'MASK', zIndex: 7 },
  { name: 'HannibalMask', folder: 'HANNIBALMASK', zIndex: 9 },
  { name: 'Eyes', folder: 'EYE', zIndex: 10 },
  { name: 'Astronaut', folder: 'ASTRONAUT', zIndex: 11 },
  { name: 'Head', folder: 'HEAD', zIndex: 12 },
  { name: 'BandanaMaskOverRonin', folder: 'MASK', zIndex: 13 },
  { name: 'EyesOverHead', folder: 'EYES', zIndex: 14 },
  { name: 'BubbleGumOverEyes', folder: 'MOUTH', zIndex: 60 },
]
```

### Absolute Rules (Non-Negotiable)

These rules are **hardcoded** into the layer order and cannot be violated:

1. **Head** MUST ALWAYS render OVER Mask (Head overlays mask)
2. **Head** MUST ALWAYS render OVER Eyes (Head overlays eyes)
3. **Mask** MUST ALWAYS render BEFORE Eyes (Eyes overlay all masks)
4. **Eyes** MUST ALWAYS render OVER ALL Mask traits (Eyes overlay all masks)
5. **Mask** MUST ALWAYS render AFTER Mouth(Base) and Mouth(Item) (Mask overlays mouth layers)
6. **Mouth(Base)** MUST ALWAYS render BEFORE Mask (Mask overlays mouth base)
7. **Mouth(Item)** MUST ALWAYS render BEFORE Mask (Mask overlays mouth item)
8. **Mouth(Item)** MUST ALWAYS render AFTER Mouth(Base) (MouthItem overlays MouthBase)
9. **Facial Hair** MUST ALWAYS render UNDER Mouth(Base) and Mouth(Item) (Mouth on top)
10. **Facial Hair** MUST ALWAYS render UNDER Astronaut (Astronaut covers facial hair)
11. **Mouth(Item)** Always renders AFTER FacialHair (Mouth on top)
12. **Mouth(Base)** Always renders AFTER FacialHair (Mouth on top)
13. **Mouth(Base)** ALL traits (including Screaming) render BEFORE Astronaut (Astronaut covers all mouth bases)
14. **Hannibal Mask** MUST ALWAYS render OVER Mouth(Base) and Mouth(Item)
15. **Tyson Tattoo** ONLY allowed directly under Hannibal Mask, never exists without it
16. **Eyes** Renders before Head (Head overlays eyes)
17. **Eyes** Renders before Astronaut (Astronaut covers eyes)
18. **Astronaut** MUST ALWAYS render OVER Eyes (Astronaut covers eyes)
19. **Astronaut** MUST ALWAYS render OVER Facial Hair (Astronaut covers facial hair)
20. **Astronaut** MUST ALWAYS render OVER ALL Mouth(Base) traits including Screaming (Astronaut covers all mouths)

### UI Layer Order

Layers that appear in the user interface (excludes virtual/internal layers):

```javascript
export const UI_LAYER_ORDER = LAYER_ORDER.filter(layer => 
  layer.name !== 'Extra' && 
  layer.name !== 'ClothesAddon' && 
  layer.name !== 'HannibalMask' && 
  layer.name !== 'TysonTattoo' &&
  layer.name !== 'NinjaTurtleUnderMask' &&
  layer.name !== 'Astronaut' && 
  layer.name !== 'BandanaMaskOverRonin' &&
  layer.name !== 'EyesOverHead' &&
  layer.name !== 'BubbleGumOverEyes' &&
  layer.name !== 'BubbleGumRekt'
)
```

---

## Virtual Layers

Virtual layers are **not user-selectable** but are rendered based on conditions. They extract or duplicate content from other layers.

### 1. ClothesAddon (Chia Farmer Overlay)

- **Source:** Extracted from `Clothes` layer when Chia Farmer is selected
- **Condition:** Only renders when Chia Farmer is selected AND Tee/Tank-top exists
- **Behavior:** 
  - When user selects Chia Farmer in Clothes dropdown, it's stored in `ClothesAddon` layer
  - Base Tee/Tank-top remains in `Clothes` layer
  - Rules engine auto-inserts Tee Blue if no Tee/Tank-top exists
- **zIndex:** 3 (renders after Clothes base layer)

### 2. Astronaut

- **Source:** Extracted from `Clothes` layer when Astronaut is selected
- **Condition:** Only renders when Astronaut clothes is selected
- **Behavior:**
  - When Astronaut is selected, it's extracted from `Clothes` and rendered in virtual layer
  - Regular `Clothes` layer skips rendering when Astronaut is detected
  - Disables Head layer (helmet includes head)
  - Disables MouthItem layer (helmet covers mouth)
  - Mutually exclusive with Mask
- **zIndex:** 11 (renders over Eyes, FacialHair, and all Mouth traits)

### 3. HannibalMask

- **Source:** Extracted from `Mask` layer when Hannibal Mask is selected
- **Condition:** Only renders when Hannibal Mask is selected in Mask layer
- **Behavior:**
  - Regular `Mask` layer skips rendering when Hannibal Mask is detected
  - Renders over Mouth(Base) and Mouth(Item)
  - Can enable Tyson Tattoo virtual layer
- **zIndex:** 9 (renders over mouth layers, under Eyes)

### 4. TysonTattoo

- **Source:** Extracted from `Eyes` layer when Tyson Tattoo is selected
- **Condition:** Only renders when:
  - Tyson Tattoo is selected in Eyes layer
  - AND any mask exists (Hannibal, Copium, Bandana, etc.)
- **Behavior:**
  - Renders UNDER the mask (lower zIndex than Mask)
  - Regular `Eyes` layer skips rendering when Tyson is selected with mask
  - If no mask exists, Tyson renders normally in Eyes layer
- **zIndex:** 6.5 (renders under Mask, over Mouth layers)

### 5. NinjaTurtleUnderMask

- **Source:** Extracted from `Eyes` layer when Ninja Turtle Mask is selected
- **Condition:** Only renders when:
  - Ninja Turtle Mask is selected in Eyes layer
  - AND a covering mask exists (Copium, Hannibal, or Bandana)
- **Behavior:**
  - Renders UNDER the covering mask
  - Regular `Eyes` layer skips rendering when Ninja is selected with covering mask
  - If no covering mask exists, Ninja renders normally in Eyes layer
- **zIndex:** 6.6 (renders under covering masks)

### 6. BubbleGumRekt

- **Source:** Special variant of Bubble Gum mouth
- **Condition:** Only renders when:
  - Rekt base is selected
  - AND Bubble Gum is selected in MouthBase
- **Behavior:**
  - Renders on top of regular Bubble Gum
  - Shows rekt variant of bubble gum
- **zIndex:** 5.1 (renders after MouthBase, before MouthItem)

### 7. BubbleGumOverEyes

- **Source:** Extracted from `MouthBase` layer when Bubble Gum is selected
- **Condition:** Only renders when:
  - Bubble Gum is selected in MouthBase
  - AND Eyes are selected (needs something to cover)
- **Behavior:**
  - Renders Bubble Gum on top of Eyes
  - Creates overlay effect
- **zIndex:** 60 (highest zIndex, renders absolutely on top)

### 8. EyesOverHead

- **Source:** Extracted from `Eyes` layer
- **Condition:** Only renders when:
  - Specific head traits are selected: Clown, Pirate Head, Ronin Helmet, Super Saiyan
  - AND Eyes are selected
- **Behavior:**
  - Renders **right half only** of eyes (clipping applied)
  - Creates overlay effect on specific head traits
- **zIndex:** 14 (renders after Head)

### 9. BandanaMaskOverRonin

- **Source:** Extracted from `Mask` layer when Bandana Mask is selected
- **Condition:** Only renders when:
  - Ronin Helmet is selected in Head layer
  - AND Bandana Mask is selected in Mask layer
- **Behavior:**
  - Renders **right half only** of Bandana Mask (clipping applied)
  - Creates overlay effect on Ronin Helmet
- **zIndex:** 13 (renders after Head)

---

## Rules Engine

The rules engine (`src/utils/wojakRules.js`) enforces which layer combinations are allowed and automatically fixes invalid states.

### Rule Execution Order

Rules are executed in this order (earlier rules take precedence):

```javascript
const RULES = [
  ruleBaseNeverNone,                  // Base normalization (must be first)
  ruleCopiumMaskForcesValidMouthBase, // Copium Mask special handling
  ruleMaskForcesNumbMouth,            // Other masks force MouthBase to Numb
  rulePipeDisablesMouthItem,          // Pipe in MouthBase blocks MouthItem
  ruleCigJointCohibaRequiresMouthBase, // Cig/Joint/Cohiba auto-sets MouthBase to Numb if None
  rulePizzaDisablesMouthItem,         // Pizza blocks MouthItem
  ruleBubbleGumDisablesMouthItem,     // Bubble gum blocks MouthItem
  ruleAstronautDisablesMouthItem,     // Astronaut disables all MouthItem traits
  ruleAstronautMaskMutualExclusion,   // Astronaut and Mask are mutually exclusive
  ruleAstronautNoHead,                // Astronaut disables Head layer
  ruleFacialHairRequiresMouthBase,   // FacialHair requires compatible MouthBase
  ruleMaskBlocksOtherLayers,          // Mask blocks MouthItem and FacialHair
  ruleClothesAddonRequiresTeeOrTanktop, // Chia Farmer requires Tee/Tank-top
]
```

### Rule Types

Each rule can return:

- **disabledLayers**: Array of layer names to disable (gray out in UI)
- **clearSelections**: Array of layer names to auto-clear
- **forceSelections**: Object mapping layer names to forced values
- **disabledOptions**: Object mapping layer names to arrays of option identifiers to disable
- **reason**: String explaining why (shown in UI tooltips)

### Key Rules

#### 1. ruleBaseNeverNone

- **Behavior:** If Base is None/empty and any other trait is selected, auto-set Base to Classic
- **Type:** Normalization (runs first)
- **Returns:** `forceSelections: { Base: '/wojak-creator/BASE/BASE_Base-Wojak_classic.png' }`

#### 2. ruleAstronautNoHead

- **Behavior:** If Astronaut clothes is selected, disable Head layer
- **Reason:** "Astronaut suit includes helmet - head trait not available"
- **Returns:** `disabledLayers: ['Head']`

#### 3. ruleAstronautDisablesMouthItem

- **Behavior:** If Astronaut is selected, disable MouthItem layer and force to None
- **Reason:** "Astronaut helmet — mouth items disabled"
- **Returns:** 
  - `disabledLayers: ['MouthItem']`
  - `forceSelections: { MouthItem: '' }`
  - `clearSelections: ['MouthItem']`

#### 4. ruleAstronautMaskMutualExclusion

- **Behavior:** 
  - If Astronaut is selected: disable Mask layer and force Mask to None
  - If Mask is selected: disable Astronaut option in Clothes dropdown
- **Returns:**
  - When Astronaut: `disabledLayers: ['Mask']`, `forceSelections: { Mask: '' }`
  - When Mask: `disabledOptions: { Clothes: ['Astronaut'] }`

#### 5. ruleFacialHairRequiresMouthBase

- **Behavior:**
  - FacialHair requires MouthBase to be one of: numb, teeth, golden teeth, smile, screaming, pizza, pipe
  - If FacialHair is selected and MouthBase is incompatible (e.g., Bubble Gum), auto-change MouthBase to Numb
  - If FacialHair is selected and MouthBase is None, auto-set MouthBase to Numb
  - If MouthBase is changed to incompatible option, clear FacialHair
- **Returns:**
  - When incompatible: `forceSelections: { MouthBase: '/wojak-creator/MOUTH/MOUTH_numb.png' }`
  - When clearing: `clearSelections: ['FacialHair']`, `disabledLayers: ['FacialHair']`

#### 6. ruleMaskBlocksOtherLayers

- **Behavior:** If any Mask is selected, disable and clear MouthItem and FacialHair
- **Reason:** "Mask selected — other mouth/extra traits disabled"
- **Returns:** `disabledLayers: ['MouthItem', 'FacialHair']`

#### 7. ruleCopiumMaskForcesValidMouthBase

- **Behavior:** 
  - If Copium Mask is selected, only allow compatible mouth bases (Teeth/Gold/Smile/Screaming/Numb)
  - If Pizza, Bubble Gum, or empty/None is selected, force to Numb
  - Disables Pizza and Bubble Gum options in dropdown
- **Returns:**
  - When forcing: `forceSelections: { MouthBase: '/wojak-creator/MOUTH/MOUTH_numb.png' }`
  - Always: `disabledOptions: { MouthBase: ['Pizza', 'Bubble-Gum', 'Bubble Gum'] }`

#### 8. ruleMaskForcesNumbMouth

- **Behavior:** If any Mask (except Copium) is selected, automatically set MouthBase to Numb and clear MouthItem
- **Reason:** "Mask selected — mouth must be Numb."
- **Returns:** `forceSelections: { MouthBase: '/wojak-creator/MOUTH/MOUTH_numb.png', MouthItem: '' }`

#### 9. rulePipeDisablesMouthItem

- **Behavior:** If Pipe is selected in MouthBase, disable and clear MouthItem
- **Reason:** "Remove Pipe."
- **Returns:** `disabledLayers: ['MouthItem']`, `clearSelections: ['MouthItem']`

#### 10. ruleCigJointCohibaRequiresMouthBase

- **Behavior:** If Cig, Joint, or Cohiba is selected in MouthItem AND MouthBase is None/empty, automatically set MouthBase to Numb
- **Reason:** "Cig/Joint/Cohiba requires a mouth base — auto-set to Numb."
- **Returns:** `forceSelections: { MouthBase: '/wojak-creator/MOUTH/MOUTH_numb.png' }` (only when MouthBase is None)

#### 11. rulePizzaDisablesMouthItem

- **Behavior:** If Pizza is selected in MouthBase, disable and clear MouthItem
- **Reason:** "Remove Pizza."
- **Returns:** `disabledLayers: ['MouthItem']`, `clearSelections: ['MouthItem']`

#### 12. ruleBubbleGumDisablesMouthItem

- **Behavior:** If Bubble Gum is selected in MouthBase, disable and clear MouthItem
- **Reason:** "Remove Bubble Gum."
- **Returns:** `disabledLayers: ['MouthItem']`, `clearSelections: ['MouthItem']`

#### 13. ruleClothesAddonRequiresTeeOrTanktop

- **Behavior:**
  - If NO Tee/Tank-top is selected, disable Chia Farmer options
  - If Chia Farmer is selected but no Tee/Tank-top exists, auto-insert Tee Blue
  - If user is selecting Chia Farmer but no Tee/Tank-top exists, auto-insert Tee Blue
  - If Chia Farmer is active, allow all clothes to be selectable (selecting non-Tee/Tank-top will clear Chia Farmer)
- **Returns:**
  - When disabling: `disabledOptions: { Clothes: ['Chia Farmer', 'Chia-Farmer'] }`
  - When forcing: `forceSelections: { Clothes: '/wojak-creator/CLOTHES/CLOTHES_Tee_blue.png' }`

---

## Rendering Logic

The rendering logic is in `src/hooks/useMemeGenerator.js` in the `renderCanvasInternal` function.

### Rendering Process

1. **Clear canvas** (800×800 or 600×600 on mobile)
2. **Iterate through layers** in `LAYER_ORDER` (sorted by zIndex)
3. **Check layer visibility** (can be toggled by user)
4. **Resolve image path** for each layer:
   - Regular layers: use `selectedLayers[layerName]`
   - Virtual layers: extract from source layer based on conditions
5. **Load and draw image** with aspect-ratio aware fitting
6. **Apply special clipping** for half-overlay layers (EyesOverHead, BandanaMaskOverRonin)

### Virtual Layer Resolution

#### Astronaut
```javascript
if (layerName === 'Astronaut') {
  const clothesPath = selectedLayers['Clothes']
  if (clothesPath && (clothesPath.includes('Astronaut') || clothesPath.includes('astronaut'))) {
    imagePath = clothesPath
  } else {
    imagePath = null // Don't render if not Astronaut
  }
}
```

#### HannibalMask
```javascript
if (layerName === 'HannibalMask') {
  const maskPath = selectedLayers['Mask']
  if (maskPath && (maskPath.includes('Hannibal-Mask') || maskPath.includes('Hannibal_Mask'))) {
    imagePath = maskPath
  } else {
    imagePath = null // Don't render if not Hannibal Mask
  }
}
```

#### TysonTattoo
```javascript
if (layerName === 'TysonTattoo') {
  const hasMask = hasRealSelection(selectedLayers['Mask'])
  const isTysonSelected = isTysonTattooPath(selectedLayers['Eyes'])
  imagePath = (hasMask && isTysonSelected) ? selectedLayers['Eyes'] : null
}
```

#### NinjaTurtleUnderMask
```javascript
if (layerName === 'NinjaTurtleUnderMask') {
  const isMaskThatCoversNinja = maskPath && (
    maskPath.toLowerCase().includes('copium') ||
    maskPath.toLowerCase().includes('hannibal') ||
    maskPath.toLowerCase().includes('bandana')
  )
  const isNinjaSelected = isNinjaTurtleMaskPath(selectedLayers['Eyes'])
  imagePath = (isMaskThatCoversNinja && isNinjaSelected) ? selectedLayers['Eyes'] : null
}
```

#### BubbleGumOverEyes
```javascript
if (layerName === 'BubbleGumOverEyes') {
  const mouthBasePath = selectedLayers['MouthBase']
  const isBubbleGum = mouthBasePath && (
    mouthBasePath.toLowerCase().includes('bubble-gum') ||
    mouthBasePath.toLowerCase().includes('bubble gum')
  )
  if (isBubbleGum && selectedLayers['Eyes']) {
    imagePath = mouthBasePath // Render Bubble Gum on top of eyes
  } else {
    imagePath = null
  }
}
```

#### BubbleGumRekt
```javascript
if (layerName === 'BubbleGumRekt') {
  const basePath = selectedLayers['Base']
  const mouthBasePath = selectedLayers['MouthBase']
  const isRektBase = basePath && basePath.toLowerCase().includes('rekt')
  const isBubbleGum = mouthBasePath && (
    mouthBasePath.toLowerCase().includes('bubble-gum') ||
    mouthBasePath.toLowerCase().includes('bubble gum')
  )
  if (isRektBase && isBubbleGum) {
    imagePath = '/wojak-creator/MOUTH/MOUTH_Bubble-Gum_rekt.png'
  } else {
    imagePath = null
  }
}
```

#### EyesOverHead
```javascript
if (layerName === 'EyesOverHead') {
  const headPath = selectedLayers['Head']
  const needsEyesOverlay = headPath && (
    headPath.toLowerCase().includes('clown') ||
    headPath.toLowerCase().includes('pirate') ||
    headPath.toLowerCase().includes('ronin') ||
    headPath.toLowerCase().includes('supa') ||
    headPath.toLowerCase().includes('saiyan')
  )
  if (needsEyesOverlay && selectedLayers['Eyes']) {
    imagePath = selectedLayers['Eyes'] // Reuse the same eyes image
  } else {
    imagePath = null
  }
}
// Special clipping: right half only (50% to 100% of width)
```

#### BandanaMaskOverRonin
```javascript
if (layerName === 'BandanaMaskOverRonin') {
  const headPath = selectedLayers['Head']
  const maskPath = selectedLayers['Mask']
  const hasRoninHelmet = headPath && headPath.toLowerCase().includes('ronin')
  const hasBandanaMask = maskPath && maskPath.toLowerCase().includes('bandana')
  if (hasRoninHelmet && hasBandanaMask) {
    imagePath = maskPath // Reuse the same mask image
  } else {
    imagePath = null
  }
}
// Special clipping: right half only (50% to 100% of width)
```

### Layer Skipping Logic

Some layers skip rendering in certain conditions:

#### Clothes Layer
```javascript
if (layerName === 'Clothes') {
  const clothesPath = selectedLayers['Clothes']
  if (clothesPath && (clothesPath.includes('Astronaut') || clothesPath.includes('astronaut'))) {
    imagePath = null // Skip Astronaut in regular Clothes layer (renders in virtual layer instead)
  }
}
```

#### Eyes Layer
```javascript
if (layerName === 'Eyes') {
  // If Tyson selected AND a mask exists, don't draw it here (it goes under-mask via TysonTattoo virtual layer)
  // If Ninja selected AND a covering mask exists, don't draw it here (it goes under-mask via NinjaTurtleUnderMask virtual layer)
  if ((hasMask && isTysonSelected) || (isMaskThatCoversNinja && isNinjaSelected)) {
    imagePath = null
  } else {
    imagePath = selectedLayers['Eyes'] // render normally
  }
}
```

#### Mask Layer
```javascript
if (layerName === 'Mask') {
  const maskPath = selectedLayers['Mask']
  if (maskPath && (maskPath.includes('Hannibal-Mask') || maskPath.includes('Hannibal_Mask'))) {
    imagePath = null // Skip Hannibal Mask in regular Mask layer (renders in virtual layer instead)
  }
  // All other masks (including Copium) render normally here
}
```

#### Head Layer
```javascript
if (layerName === 'Head') {
  // Prevent McD.png (logo file from CLOTHES folder) from being rendered as Head layer
  if (imagePath) {
    const pathLower = imagePath.toLowerCase()
    if (pathLower.includes('/clothes/mcd.png') || 
        (pathLower.endsWith('mcd.png') && !pathLower.includes('head_cap_mcd'))) {
      imagePath = null // Skip rendering the logo file
    }
  }
}
```

---

## Special Behaviors

### Centurion Head Variants

The Head layer has two variants: `Centurion` and `Centurion_mask`. The system automatically switches between them based on:

- **Mask selection** (any mask)
- **MouthItem selection** (Cig, Joint, Cohiba)
- **MouthBase selection** (Pipe, Pizza, Bubble Gum)

**Logic:**
- If ANY of the above conditions are true → use `Centurion_mask`
- If ALL are false → use `Centurion`

This logic is applied in:
1. `selectLayerInternal` when Mask, MouthItem, or MouthBase changes
2. `randomizeAllLayers` when Head is being randomized

### Chia Farmer Overlay System

Chia Farmer is a special overlay that requires a base Tee or Tank-top:

1. **User selects Chia Farmer** in Clothes dropdown
2. **System stores** Chia Farmer in `ClothesAddon` layer
3. **System checks** if Tee/Tank-top exists in `Clothes` layer
4. **If no Tee/Tank-top:** Rules engine auto-inserts Tee Blue
5. **If user selects non-Tee/Tank-top:** Chia Farmer is automatically cleared

**Implementation:**
- `selectLayerInternal` handles the migration
- `ruleClothesAddonRequiresTeeOrTanktop` enforces the requirement
- `randomizeAllLayers` handles Chia Farmer during randomization

### Pipe Migration

Pipe was moved from `MouthItem` to `MouthBase`. The system automatically migrates old selections:

```javascript
// Migration: Move Pipe from MouthItem to MouthBase
if (layerName === 'MouthItem' && imagePath) {
  const pathLower = (imagePath || '').toLowerCase()
  if (pathLower.includes('pipe')) {
    newLayers['MouthBase'] = imagePath
    newLayers['MouthItem'] = ''
  }
}
```

### Wizard Glasses Migration

Old "Wizard Glasses" is automatically replaced with "Wizard Glasses New":

```javascript
// Migration: Replace old Wizard Glasses with Wizard Glasses New
if (layerName === 'Eyes' && imagePath) {
  const pathLower = (imagePath || '').toLowerCase()
  if (pathLower.includes('wizard') && pathLower.includes('glasses') && !pathLower.includes('new')) {
    // Find and use Wizard Glasses New
    const eyesImages = getAllLayerImages('Eyes') || []
    const wizardGlassesNew = eyesImages.find(img => {
      const imgPath = (img.path || '').toLowerCase()
      return imgPath.includes('wizard') && imgPath.includes('glasses') && imgPath.includes('new')
    })
    if (wizardGlassesNew) {
      newLayers['Eyes'] = wizardGlassesNew.path
    }
  }
}
```

---

## Randomization Logic

The randomization logic is in `src/hooks/useMemeGenerator.js` in the `randomizeAllLayers` function.

### Generator Layer Order

Layers are randomized in this order (respects dependencies):

```javascript
const GENERATOR_LAYER_ORDER = [
  'Eyes',      // First (Face Wear meta-decision)
  'Base',      // Required layer
  'MouthBase', // Required layer
  'Mask',      // Before Head (enables Head filtering)
  'Head',      // After Mask (can filter based on Mask)
  'MouthItem', // After MouthBase
  'FacialHair', // After MouthBase
  'Clothes',   // Independent
  'Background' // Independent
]
```

### Face Wear Meta-Layer Decision

**CRITICAL:** Before processing Eyes and Mask, the system makes a meta-decision about "Face Wear":

1. **Weighted selection** from Face Wear traits (No Face Wear, Eyes only, Mask only)
2. **Correlated event:** "No Face Wear" sets BOTH Eyes and Mask to None simultaneously
3. **No-repeat logic:** Avoids repeating the same (Eyes, Mask) pair from previous randomization

**Implementation:**
- Uses `faceWearTraitWeights` and `faceWearToLayerRouting` from `buildWeightedMaps`
- If Face Wear decision sets Eyes/Mask, those layers skip normal randomization

### Special Randomization Behaviors

#### Mask Layer
- Uses weighted selection
- Respects Face Wear meta-decision (skips if already set)
- Filters out disabled options based on current selections

#### FacialHair Layer
- Uses weighted selection
- **Anti-None logic:** If last 3 randomizations were all "None", forces a non-None selection
- Tracks history in `facialHairHistoryRef`

#### MouthBase Layer
- Uses weighted selection (weights from TRAIT_FREQUENCIES['Mouth'])
- Filters out disabled options (Pizza/Bubble Gum when Copium Mask is selected)

#### Clothes Layer
- Separates suit variants, Chia Farmer variants, and regular options
- If Chia Farmer is selected:
  - Stores in `ClothesAddon`
  - Ensures Tee/Tank-top exists in `Clothes`
  - Auto-inserts Tee Blue if needed
- Uses weighted selection for all options

#### Head Layer
- Filters Centurion variants based on Mask, MouthItem, and MouthBase
- Groups color variants together
- Uses weighted selection

#### Eyes Layer
- Uses weighted selection
- Respects Face Wear meta-decision (skips if already set)
- Filters out disabled options

#### Base Layer
- Always required (excludes "None")
- Uses weighted selection

#### Background Layer
- Can be empty (None is valid)
- Uses weighted selection

### Rules Application After Randomization

After all layers are randomized:

1. **Apply rules** (`getDisabledLayers`) to check for conflicts
2. **Clear disabled layers**
3. **Apply forced selections** (rules that auto-set values)
4. **Re-check rules** after forced selections
5. **Second pass:** For layers that were cleared but should have values, try to pick valid options

---

## Layer Selection Logic

The layer selection logic is in `src/hooks/useMemeGenerator.js` in the `selectLayerInternal` function.

### Selection Process

1. **Update selectedLayers** with new value
2. **Handle special cases:**
   - Chia Farmer migration to ClothesAddon
   - Pipe migration from MouthItem to MouthBase
   - Wizard Glasses migration
   - Centurion variant switching
3. **Apply rules** (`getDisabledLayers`)
4. **Clear disabled layers**
5. **Apply forced selections**
6. **Return updated layers**

### Debouncing

- `selectLayerInternal` is NOT debounced (immediate state updates)
- `selectLayer` (public API) is debounced (100ms delay) to prevent rapid updates
- `renderCanvas` is debounced (150ms delay) for smooth trait switching

### Default Values on Open

When the generator opens, these defaults are applied (only if unset):

- **Base:** Classic
- **MouthBase:** Numb
- **Clothes:** Random valid (excluding Chia Farmer overlay)

**Implementation:**
- Uses `resolveDefaultPathByName` for Base and MouthBase
- Uses `resolveRandomValidPath` for Clothes
- Only applies if layer is empty/None

---

## Summary

The Wojak Generator layer system is a complex but well-organized system:

1. **Layer Order** defines render stacking (z-index)
2. **Virtual Layers** extract/duplicate content based on conditions
3. **Rules Engine** enforces valid combinations and auto-fixes conflicts
4. **Rendering Logic** draws layers in order with special handling for virtual layers
5. **Special Behaviors** handle edge cases (Centurion variants, Chia Farmer, migrations)
6. **Randomization Logic** uses weighted selection with meta-decisions and no-repeat logic
7. **Layer Selection Logic** handles migrations and rule application

All of this logic is contained in:
- `src/lib/memeLayers.js` - Layer order and structure
- `src/utils/wojakRules.js` - Rules engine
- `src/hooks/useMemeGenerator.js` - Rendering, selection, and randomization logic

