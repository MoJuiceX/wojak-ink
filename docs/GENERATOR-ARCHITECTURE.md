# Generator Architecture

This document describes the Wojak avatar generator’s data flow, where G1 vs G2 live, and how to extend layers and traits. For step-by-step change lists, see [GENERATOR-CHECKLIST.md](./GENERATOR-CHECKLIST.md).

## Overview

The generator composes a Wojak image from multiple layers (Background, Base, Clothes, Mouth, Mask, Eyes, Head, etc.). Assets come from two sources:

- **G1**: Legacy manifest + folder-based assets (paths like `/assets/wojak-layers/CLOTHES/...`).
- **G2**: Manifest with categories and optional composite/color traits (e.g. fill + detail layers).

Selections are stored **unified** (one record per UI layer with `path`, `traitId`, optional `g2`). The UI and APIs that need “path + g2 per layer” get them via the **selection adapter**. Rules and the **layer builder** use a **selection resolver** so they depend on trait identity and paths from a single abstraction.

## Data flow

```mermaid
flowchart LR
  subgraph Data
    Manifest[Manifest(s)]
    UnifiedTraits[Unified traits]
    PathMap[pathToTraitIdMap]
  end

  subgraph State
    Selections[selections: SelectionsSnapshot]
    History[history]
  end

  subgraph Adapter
    toExternal[toExternal]
    fromExternal[fromExternal]
  end

  subgraph External
    selectedLayers[selectedLayers]
    g2Selections[g2Selections]
  end

  subgraph Resolver
    Resolver[SelectionResolver]
  end

  subgraph Rules
    getDisabledLayers[getDisabledLayers]
  end

  subgraph Render
    buildRenderLayers[buildRenderLayers]
    Draw[draw / G2 expand]
    Canvas[Canvas]
  end

  Manifest --> UnifiedTraits
  UnifiedTraits --> PathMap
  Selections --> toExternal --> selectedLayers
  toExternal --> g2Selections
  selectedLayers --> fromExternal --> Selections
  g2Selections --> fromExternal
  PathMap --> fromExternal

  Selections --> Resolver
  selectedLayers --> Resolver
  g2Selections --> Resolver
  PathMap --> Resolver

  Resolver --> getDisabledLayers
  selectedLayers --> buildRenderLayers
  buildRenderLayers --> Draw
  Draw --> Canvas
```

1. **Manifest(s) → generatorService**  
   Manifests are loaded and merged into **unified traits**. `generatorService` builds **pathToTraitIdMap** (path → traitId for G1) and exposes `getPathToTraitIdMap()` / `ensurePathToTraitIdMapReady()`.

2. **Unified traits + pathToTraitIdMap**  
   Used to populate pickers and to convert between unified selections and the dual shape (`selectedLayers` + `g2Selections`). See [Unified selection model](#unified-selection-model) below.

3. **selectedLayers + g2Selections → resolver**  
   The context derives `selectedLayers` and `g2Selections` via `toExternal(state.selections)`. For rules and (where needed) for trait identity, it builds a **SelectionResolver** via `createSelectionResolver(selectedLayers, g2Selections, getPathToTraitIdMap())` or `createSelectionResolverFromUnified(state.selections)`.

4. **Resolver → rules**  
   `getDisabledLayers(resolver)` (and helpers like `isLayerDisabled`, `getDisabledReason`) use only `resolver.getTraitId(layer)` and `resolver.getPath(layer)`. No raw path substring checks for trait identity; trait IDs come from [generatorTraitIds](./GENERATOR-CHECKLIST.md#trait-ids) and the resolver.

5. **selectedLayers → buildRenderLayers → draw**  
   `buildRenderLayers(selectedLayers)` returns a flat list of render layers (including virtual layers) sorted by zIndex. The main **canvasRenderer** loads images, expands G2 composites, applies tints, and draws to canvas.

## Where G1 vs G2 live

| Concern | G1 | G2 |
|--------|----|----|
| **Manifest** | `generatorService` (manifest load), folder-based | Same service; G2 categories and composite entries |
| **Path → UI layer** | `G1_FOLDER_TO_UI` in `generatorLayerMapping.ts`; MOUTH handled by `classifyMouthItem` in generatorService | `G2_CATEGORY_TO_UI` in `generatorLayerMapping.ts` |
| **Trait identity** | `pathToTraitIdMap` (path → traitId), built when unified traits load | `g2Selections[layer].traitId` |
| **Resolver** | `getTraitId(layer)` from pathToTraitIdMap when no G2 for that layer | `getTraitId(layer)` from `g2Selections[layer].traitId` |
| **Draw** | Paths from `selectedLayers`; images loaded by path | Composite expansion, fill/detail, tint in `canvasRenderer` |

Single source of truth for **layer names and order** is [layerRegistry](../../src/lib/layerRegistry.ts): `UILayerName`, `RENDER_ORDER`, `UI_ORDER`, `LAYER_META`, and default paths.

## Single source of truth: layerRegistry

- **`src/lib/layerRegistry.ts`** defines:
  - `UILayerName` (all UI layers)
  - `RENDER_ORDER` (compositing order, bottom → top)
  - `UI_ORDER` (tabs / picker order)
  - `LAYER_META` (labels, required, icons)
  - `DEFAULT_SELECTIONS`, `DEFAULT_BASE_PATH`, `DEFAULT_MOUTHBASE_PATH`, `DEFAULT_CLOTHES_PATH`, `REQUIRED_LAYERS_FOR_EXPORT`, `BASE_CLOTHES_MAP`

Configs and other modules import from here; do not duplicate layer names or order elsewhere.

## Selection resolver

- **`src/lib/selectionResolver.ts`**  
  The resolver is the single view over “what is selected” for rules and any logic that needs trait identity:
  - `getTraitId(layer)` — from G2 when present, else from pathToTraitIdMap for G1.
  - `getPath(layer)` — selected path for that UI layer (or virtual key).

Use `createSelectionResolver(selectedLayers, g2Selections, pathToTraitIdMap)` when you have the dual shape; use `createSelectionResolverFromUnified(selections)` when you already have unified state.

## Virtual layers

Virtual layers are **not** in `RENDER_ORDER`. They are invented by the **layer builder** based on selections (e.g. Astronaut suit, Chia Farmer addon, BubbleGum+Rekt, masks over/under head).

- **Defined in:** `src/services/canvasRendererLayerBuilder.ts`  
  All “if this combo then push this virtual layer” logic lives here. Z-index and condition constants are in `src/services/canvasRendererConstants.ts`.

- **Examples:**  
  Astronaut, MaskUnderAstronaut, MaskOverAstronaut, ClothesAddon (Chia Farmer), TysonTattoo, NinjaTurtleUnderMask, EyePatchUnderHannibal, HannibalMask, BubbleGumRekt, BubbleGumOverEyes, BandanaMaskOverRonin, EyesOverHead, EyesOverStandardCut, MaskOverStandardCut, FullFaceMask, LaserEyesOverAstronaut.

- **Adding a virtual layer:**  
  Update the layer builder (and constants if needed). See [GENERATOR-CHECKLIST.md](./GENERATOR-CHECKLIST.md).

## Unified selection model

- **State:** Generator context holds `selections: SelectionsSnapshot` (one entry per UI layer: `path`, `traitId`, optional `g2`).
- **Adapter:** `src/lib/selectionAdapter.ts`  
  - `toExternal(selections)` → `{ selectedLayers, g2Selections }` (for mint API, canvas, v1 favorites).
  - `fromExternal(selectedLayers, g2Selections, pathToTraitIdMap?)` → `SelectionsSnapshot` (fills `traitId` when map is provided).
- **Favorites:** Stored as v2 with `unifiedSelections`; v1 favorites are migrated on load via `fromExternal`.

## Key files

| File | Role |
|------|------|
| `src/lib/layerRegistry.ts` | Layer names, order, metadata, defaults (single source of truth) |
| `src/config/layers.ts` | Re-exports registry; canvas/config constants |
| `src/config/generatorLayerMapping.ts` | G2 category → UI, G1 folder → UI |
| `src/lib/selectionResolver.ts` | Resolver (getTraitId / getPath) over selections |
| `src/lib/selectionAdapter.ts` | Unified ↔ selectedLayers + g2Selections |
| `src/lib/wojakRules.ts` | Rules engine (getDisabledLayers, etc.); uses resolver only |
| `src/lib/generatorTraitIds.ts` | Known trait IDs for rules/layer builder |
| `src/services/generatorService.ts` | Manifest load, unified traits, pathToTraitIdMap, buildLayerImages |
| `src/services/canvasRendererConstants.ts` | Z-index and condition lists for layer builder |
| `src/services/canvasRendererLayerBuilder.ts` | buildRenderLayers; all virtual-layer logic |
| `src/services/canvasRenderer.ts` | Image load, G2 expansion, draw to canvas |
| `src/contexts/generatorReducer.ts` | Reducer and initial state; all action handlers |
| `src/contexts/generatorStateUtils.ts` | applyRulesUnified, pushHistoryUnified, export validation, isUILayerName guard |
| `src/contexts/GeneratorContext.tsx` | Provider, derived state, actions, error handling, path validation |
| `src/types/generator.ts` | SelectionsSnapshot, LayerSelection, FavoriteWojak, isSelectionPathEmpty |

## Operational notes

- **pathToTraitIdMap:** Generator actions (SET_LAYER, randomize, loadFavorite, etc.) assume `ensurePathToTraitIdMapReady()` has completed. The provider runs this on mount before dispatching the first RANDOMIZE; if it fails, `generatorError` is set and the UI shows an error state with refresh. Do not dispatch selection-changing actions before init completes if you need correct G1 traitIds.
- **generatorError:** Init failures, export validation/download failures, and save-favorite validation failures set `generatorError` in state. The Generator page shows a dismissible banner when `generatorError` is set; ExportPanel shows it inline when the export modal is open. Closing the export modal or clicking Dismiss calls `clearGeneratorError()`. When init fails, the main generator UI is hidden and a “Refresh page” prompt is shown.

## Feature boundary

- **Generator** = layer/trait model, rules, layer list, draw. It does **not** implement auth, mint API, or persistence; the context exposes state and actions, and the adapter shapes data for external consumers (mint, favorites, canvas).

## Code health and next steps

See [GENERATOR-CODE-HEALTH.md](./GENERATOR-CODE-HEALTH.md) for a short audit, recommended order of work when changing rules, and what to avoid.
