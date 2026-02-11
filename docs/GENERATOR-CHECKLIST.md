# Generator checklist: adding layers and traits

Use this checklist when adding a new UI layer, G1 trait, or G2 trait so the right files are updated in one place. Architecture overview: [GENERATOR-ARCHITECTURE.md](./GENERATOR-ARCHITECTURE.md).

---

## Adding a new UI layer

1. **Layer registry**  
   In `src/lib/layerRegistry.ts`:
   - Add the name to the `UILayerName` union.
   - Add it to `RENDER_ORDER` (compositing order: bottom → top).
   - Add it to `UI_ORDER` (tabs / picker order).
   - Add an entry in `LAYER_META` (label, required, icon, description).
   - If it has a default path, add to `DEFAULT_SELECTIONS` or the default-path constants as appropriate.

2. **G1 folder mapping (if this layer has G1 assets)**  
   In `src/config/generatorLayerMapping.ts`: add the G1 manifest folder name to `G1_FOLDER_TO_UI`.  
   If the layer is driven by a special G1 rule (e.g. MOUTH → MouthBase/MouthItem/Mask/FacialHair), ensure `generatorService.buildLayerImages` / `classifyMouthItem` (or equivalent) route the folder to this layer.

3. **G2 category mapping (if this layer has G2 traits)**  
   In `src/config/generatorLayerMapping.ts`: add the G2 manifest category to `G2_CATEGORY_TO_UI`.

4. **Manifest(s)**  
   Ensure the asset manifest(s) used by generatorService include paths for this layer (G1 folder or G2 category).

5. **Rules**  
   If this layer participates in blocking/dependency rules: in `src/lib/wojakRules.ts` add or update the relevant rule(s). Use `resolver.getTraitId(layer)` and `resolver.getPath(layer)` only; add any new trait IDs to `src/lib/generatorTraitIds.ts` if needed.

6. **Virtual layers**  
   If this layer needs special render behavior (e.g. drawn twice, or under/over another layer): in `src/services/canvasRendererLayerBuilder.ts` add the condition and push the virtual layer; add z-index in `src/services/canvasRendererConstants.ts` if new.

7. **UI**  
   Wire the layer into the generator UI: layer tabs, right panel, and trait selector (e.g. `TraitSelector`, `MouthLayerSelector`) so users can pick traits for this layer.

---

## Adding a new G1 trait

1. **Asset and manifest**  
   Add the asset file and the corresponding entry in the G1 manifest used by generatorService.

2. **Rules**  
   If the trait affects rules (e.g. new mask, new mouth type): add the trait ID to `src/lib/generatorTraitIds.ts` and use it in `src/lib/wojakRules.ts` via the resolver (e.g. `resolver.getTraitId('Mask') === KNOWN_TRAIT_IDS.Mask_MyNewMask`).

3. **Render order / virtual layers**  
   If the trait affects render order or needs a virtual layer (e.g. composite, or draw above head): update `src/services/canvasRendererLayerBuilder.ts` (and `canvasRendererConstants.ts` if needed).

4. **G2 parity**  
   If the same trait exists in G2, ensure trait mapping (e.g. G1 path → G2 traitId) and unified-trait merge in generatorService so both appear as one logical trait where intended.

---

## Adding a new G2 trait

1. **G2 manifest**  
   Add the trait to the G2 manifest (category, traitId, paths for fill/detail/composite as used by the app).

2. **Category → UI**  
   If the trait is in a **new** category, add that category in `src/config/generatorLayerMapping.ts` → `G2_CATEGORY_TO_UI`. Existing categories (Clothes, Face-wear, Face-laser, Head, Mouth) already map to a UI layer.

3. **Color / detail behavior**  
   If the trait has special fill or detail behavior, add or extend handling in `src/services/generatorService.ts` (e.g. g2FillTreatments) and in `src/services/canvasRenderer.ts` (tint, composite expansion) as needed.

4. **Rules**  
   If the trait affects rules: add its trait ID to `src/lib/generatorTraitIds.ts` and use it in `src/lib/wojakRules.ts` via the resolver. G2 selections provide `traitId` on the resolver.

5. **Virtual layers**  
   If the trait needs a virtual layer (e.g. composite drawn in a special order), implement the condition and layer in `src/services/canvasRendererLayerBuilder.ts` and the draw logic in `canvasRenderer.ts`.

---

## Mouth layers (MouthBase, MouthItem, FacialHair)

These share the **MouthLayerSelector** UI and mouth-specific rules:

- **MouthBase** – base mouth (Numb, Smile, Pipe, Pizza, BubbleGum, etc.).
- **MouthItem** – overlay items (Cig, Joint, Cohiba).
- **FacialHair** – neckbeard, stache; can be blocked by mask/mouth rules.

When adding a new mouth trait:

1. Add asset and manifest entry (G1 and/or G2 as above).
2. If it affects rules (e.g. “Pipe disables MouthItem”, “BubbleGum disables MouthItem”), update `wojakRules.ts` and optionally `generatorTraitIds.ts`.
3. If it affects render order or virtual layers (e.g. mouth over Centurion), update `canvasRendererLayerBuilder.ts` and constants.
4. Ensure `MouthLayerSelector` and any mouth-specific logic (e.g. classifyMouthItem in generatorService) include or recognize the new trait.

---

## Trait IDs

Known trait IDs used by rules and layer builder live in **`src/lib/generatorTraitIds.ts`** (`KNOWN_TRAIT_IDS`). When a rule or the layer builder needs to identify a trait by ID (not by path substring), add the constant there and use it via the selection resolver.
