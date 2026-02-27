# Generator code health and next steps

Quick reference for keeping the generator maintainable and what to do next. See [GENERATOR-ARCHITECTURE.md](./GENERATOR-ARCHITECTURE.md) for data flow and [GENERATOR-CHECKLIST.md](./GENERATOR-CHECKLIST.md) for adding layers/traits.

## Current state (post-refactor, 2026-02-27)

- **Single source of truth:** Layer names and order in `layerRegistry`; G1/G2 mapping in `generatorLayerMapping`; trait IDs in `generatorTraitIds`; virtual layers in `canvasRendererLayerBuilder`.
- **Unified state:** Context holds `SelectionsSnapshot`; adapter converts to/from `selectedLayers` + `g2Selections` for mint, renderer, and v1 favorites.
- **Rules:** All in `wojakRules.ts`; they use only `SelectionResolver` (getTraitId / getPath). No trait identity from path substrings. Disabled options stored as `Set<string>` for O(1) lookups.
- **Shared convention:** “Empty” selection path is defined once as `isSelectionPathEmpty(path)` in `types/generator.ts` and used in adapter, resolver, and state utils.
- **G2 color logic:** Shared in `generatorG2Helpers.ts` — both `buildG2Selection()` and `selectG2Layer()` delegate to `assembleG2Selection()`.
- **Reducer:** `processLayerUpdate()` handles both G1 and G2 layer selection (merged SET_LAYER + SET_G2_LAYER logic).
- **G2Selection type:** Trait-specific fields grouped under `options` bag — new customizable traits don't require interface changes.
- **Performance:** G2 manifest indexed with `Map` for O(1) trait lookup; G1/G2 manifests load in parallel; card components memoized with `React.memo`.
- **Constants:** `generatorTraitIds.ts` has all G2 trait IDs and mouth/mask classification patterns — no scattered magic strings.
- **UI components:** `TraitCardShell` wraps all 7 card types; `MilitaryBeretSwatches`, `MaskVariantPicker`, `BeerHatUnderlayerPicker` extracted from RightPanel; `usePrimarySlot` hook extracted.
- **Styles:** Generator card/tab/metadata styles in `theme.css` classes (not inline).
- **Error handling:** Init/export/save errors set `generatorError`; banner and ExportPanel show it; init failure shows refresh prompt.
- **Tests:** Unit tests for rules, layer builder, state utils, and reducer; E2E smoke tests for generator page.

## What to do next (recommended order)

1. **When changing layer rules**
   - Edit only `src/lib/wojakRules.ts` (and `generatorTraitIds.ts` if you add a new trait ID).
   - Add or update a test in `src/lib/wojakRules.test.ts` for the new behavior.
   - Run `npm run test:unit` and manually test the affected layer combos (see “What to test when you change layer rules” in project docs or your testing notes).

2. **Keep context readable**
   - `GeneratorContext.tsx` is the main orchestrator; reducer and state utils are already split out.
   - If you add more actions or effects, consider moving randomize/randomizeLayer into a small hook or `generatorRandomize.ts` so the provider stays under ~600 lines.

3. **Optional cleanups (low priority)**
   - Use `isSelectionPathEmpty` in `canvasRendererLayerBuilder.ts` and `LayerTabs.tsx` so the “empty path” convention stays in one place.
   - If you add more G2 layers or traits, keep trait IDs in `generatorTraitIds` and rules in `wojakRules`; avoid scattering path substring checks.

4. **Before release**
   - Run `npm run test:unit` and fix any failing tests.
   - Run `npm run build` and fix type/build errors.
   - Run E2E (e.g. `TEST_BASE_URL=http://localhost:5173 npx playwright test tests/generator.spec.ts`) if you have Playwright set up.
   - Do a quick manual pass: load generator → change layers → randomize → export → save favorite → load favorite.

## What not to do

- Don’t add a second source of layer order or default paths (keep using `layerRegistry` and config re-exports).
- Don’t add rule logic that relies on path substrings for trait identity; use `resolver.getTraitId(layer)` and constants from `generatorTraitIds`.
- Don’t put virtual-layer conditions in the main renderer; keep them in `canvasRendererLayerBuilder.ts`.
- Don’t skip the checklist when adding a new UI layer or trait; missing a step (e.g. rules or mapping) causes subtle bugs.
- **Don’t change the main preview (PreviewCanvas) to zoom, crop, or reposition by trait** (e.g. Beer Hat). The preview must always show the full avatar centered (`object-contain`). Trait-specific zoom/crop causes the avatar to shift and empty space below.

## File roles (reminder)

| Area            | Files |
|-----------------|--------|
| Layer definitions | `layerRegistry`, `config/layers` |
| Rules & trait IDs | `wojakRules`, `generatorTraitIds` (includes mouth/mask constants) |
| Resolver & adapter | `selectionResolver`, `selectionAdapter` |
| State & reducer   | `generatorReducer`, `generatorStateUtils`, `GeneratorContext`, `generatorG2Helpers` |
| Render pipeline   | `canvasRendererLayerBuilder`, `canvasRendererConstants`, `canvasRenderer` |
| UI components     | `TraitCardShell`, `MilitaryBeretSwatches`, `MaskVariantPicker`, `BeerHatUnderlayerPicker` |
| Hooks             | `usePrimarySlot` |
| Styles            | `theme.css` (generator card/tab/metadata classes) |
| Docs              | `GENERATOR-ARCHITECTURE`, `GENERATOR-CHECKLIST`, this file |
