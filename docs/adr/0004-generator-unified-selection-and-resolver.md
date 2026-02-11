# ADR-0004: Generator unified selection model and selection resolver

## Status
ACCEPTED

## Context
The Wojak avatar generator had grown with duplicated layer ordering, rules that relied on path substrings for trait identity, and state stored as two parallel shapes (`selectedLayers` + `g2Selections`). This made it hard to add layers or traits consistently and to reason about rules and render order.

Requirements:
- One place to define layer names and order (render and UI).
- Rules and layer builder that depend on **trait identity** (traitId), not path substrings.
- A single state shape for selections that can be converted to/from the dual shape needed by the mint API and canvas.

## Decision

1. **Layer registry as single source of truth**  
   `src/lib/layerRegistry.ts` defines `UILayerName`, `RENDER_ORDER`, `UI_ORDER`, `LAYER_META`, default paths, and related constants. All layer names and order are imported from here; no duplication in config or services.

2. **Selection resolver**  
   Introduce a `SelectionResolver` with `getTraitId(layer)` and `getPath(layer)`. Rules and any logic that need trait identity use the resolver only. Trait IDs come from G2 selections or from a path→traitId map for G1. No “path contains X” for determining trait identity; path substrings are used only where explicitly needed (e.g. full-face mask names).

3. **Unified selection model**  
   Generator state holds `selections: SelectionsSnapshot` — one record per UI layer with `path`, `traitId`, and optional `g2`. An adapter converts to/from `selectedLayers` + `g2Selections` for mint API, canvas, and v1 favorites. Favorites are stored as v2 with `unifiedSelections`; v1 favorites are migrated on load.

4. **Centralized G1/G2 mapping**  
   `src/config/generatorLayerMapping.ts` holds `G2_CATEGORY_TO_UI` and `G1_FOLDER_TO_UI`. Adding a new G2 category or G1 folder is a single entry.

5. **Virtual layers in one place**  
   All virtual-layer logic (Astronaut, ClothesAddon, BubbleGumRekt, etc.) lives in `src/services/canvasRendererLayerBuilder.ts`, with z-index and condition lists in `canvasRendererConstants.ts`.

## Consequences

### Positive
- Adding a new layer or trait follows a documented checklist (GENERATOR-CHECKLIST.md) and touches a minimal set of files.
- Rules are testable with a mock resolver (no pathToTraitIdMap or real manifests).
- Single state shape simplifies persistence (favorites) and future features (e.g. share link with full state).
- Clear separation: resolver for trait identity, adapter for external shape, layer builder for draw order.

### Negative
- Context and reducer must keep unified state and adapter in sync; care needed when changing actions.
- pathToTraitIdMap must be built after unified traits load; callers must call `ensurePathToTraitIdMapReady()` where needed.

### Neutral
- Legacy favorites (v1) are migrated on load; no backfill of stored data required.

## References
- [GENERATOR-ARCHITECTURE.md](../GENERATOR-ARCHITECTURE.md)
- [GENERATOR-CHECKLIST.md](../GENERATOR-CHECKLIST.md)
- Generator refactor plan (Phases 1–5)
