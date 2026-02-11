# Trait Audit Workflow — Wojak Generator

This document describes how to use the trait audit tools to review and change traits, then apply those changes back to the Wojak generator.

## Audit tools

### 1. Layer Audit (`/layer-audit.html`)

- **URL:** `http://localhost:5173/layer-audit.html` (or your deployed base + `/layer-audit.html`)
- **Source of truth for:** YourWojak traits with a `layers` array
- **Use for:** Layered traits (Ninja Turtle, Military jacket, Viking helmet, Laser Eyes, 3D glasses, etc.)

**Features:**
- Layer order and visibility
- Fill treatment config (free_choice, derived, fixed)
- Single-trait export (Copy JSON / Download)
- Full config import (all traits at once)

**Export (single trait):**
- Trait ID, name, category
- `layers`: pos, key, type, label, file, visible, color, computedColor
- `fills`: fill key → { treatment, source, amount?, fixedColor? }
- Notes, group, camo (Bepe Army), text (Bepe Army)

### 2. Trait Audit (`/trait-audit.html`)

- **URL:** `http://localhost:5173/trait-audit.html`
- **Use for:** All traits, including single-fill (Sonic, Tee, etc.)

**Features:**
- Categories and trait list
- Swatch-based color picker
- Fill treatment dropdown
- Same manifest as generator

## Workflow: change items → export → apply

1. **Run the audit tool** (layer-audit or trait-audit) next to the generator.
2. **Make changes** (layer order, visibility, fills, defaults, treatments).
3. **Export:**
   - **Layer audit:** "Copy JSON" or "Download" (per trait) or "Import full config" (entire state).
   - **Trait audit:** use its export if available.
4. **Share the JSON** with the assistant (paste or attach file).
5. **Assistant applies changes** in:
   - `public/assets/wojak-layers/YourWojak-layers/manifest.json`
   - `src/config/g2DefaultColors.ts`
   - `src/lib/g2FillTreatments.ts`
   - `src/services/canvasRenderer.ts` (if draw order or fill logic changes)
   - `src/utils/layeredTraitPreviewColors.ts` (if new layered traits)

## Export formats

### Single-trait snapshot (layer-audit)

```json
{
  "trait": "Clothes_Ninja-turtle-fit",
  "name": "Ninja Turtle Fit",
  "category": "Clothes",
  "layers": [
    { "pos": 0, "key": "mfill2", "type": "fill", "label": "Fill 3", "file": "Clothes_Ninja-turtle-fit_fill3.png", "visible": true },
    { "pos": 1, "key": "moutline1", "type": "outline", "label": "Outline 2", "file": "...", "visible": true },
    ...
  ],
  "fills": {
    "mfill0": { "treatment": "free_choice" },
    "mfill1": { "treatment": "desaturated", "source": "mfill0", "amount": 24 },
    "mfill2": { "treatment": "desaturated", "source": "mfill0", "amount": 39 }
  }
}
```

### Full config import (layer-audit)

Object keyed by trait ID; each value has `fills`, `layerOrder`, `layerVis`, `notes`, `group`, etc.

## Generator alignment

The generator and audit tools both read the same manifest (`public/assets/wojak-layers/YourWojak-layers/manifest.json`). To keep them in sync:

1. **Manifest:** Layer order (`pos`), `fills`, `defaultColors`, `defaultColor`.
2. **g2FillTreatments:** Which slots are user vs derived vs fixed.
3. **g2DefaultColors:** Default colors for user-pickable slots (overrides manifest).
4. **canvasRenderer:** Draw order and fill resolution for special traits.
5. **TraitSelector preview:** Default colors for layered traits so preview matches canvas.

## Starting a test audit

1. Open `layer-audit.html` and `trait-audit.html` locally (or on your deployed URL).
2. Go through traits and note mismatches between audit and generator.
3. Adjust in the audit tool and export.
4. Share the JSON so the generator can be updated to match.
