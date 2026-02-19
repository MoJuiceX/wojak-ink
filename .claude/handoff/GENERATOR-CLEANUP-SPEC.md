# Generator Cleanup — Pure Creative Experience

---

## Overview

The Generator currently shows combat identity info (type, nature, ability) live as the user picks traits via the `CombatPreview` component. This is being removed. The Generator should be a **pure creative experience** — users focus on making a visually cool Wojak. All combat identity (type, nature, ability, attacks) is calculated in the background and revealed for the first time **after** minting.

This spec removes combat UI from the Generator and cleans up the related move selection code that is no longer needed in the frontend flow.

---

## Task 1: Remove CombatPreview from Generator

**File:** `src/pages/Generator.tsx`

Remove the CombatPreview component from the metadata panel.

1. Remove the import:
```tsx
// DELETE this line:
import { CombatPreview } from '@/components/generator/CombatPreview';
```

2. Remove the component usage (around line 151):
```tsx
// In the metadata panel motion.div, DELETE <CombatPreview />
// BEFORE:
<motion.div key="metadata" ...>
  <MetadataPreview onSwitchToColors={() => setRightPanelMode('colors')} />
  <CombatPreview />
</motion.div>

// AFTER:
<motion.div key="metadata" ...>
  <MetadataPreview onSwitchToColors={() => setRightPanelMode('colors')} />
</motion.div>
```

Do NOT delete the `CombatPreview.tsx` file — it will be repurposed later for the post-mint reveal.

---

## Task 2: Remove combatMoves from ActionBar Mint Flow

**File:** `src/components/generator/ActionBar.tsx`

The ActionBar currently reads `combatMoves` from GeneratorContext and passes them to `prepareMint`. Since moves are now auto-assigned server-side, remove this:

1. Remove `combatMoves` from the destructured useGenerator (around line 121):
```tsx
// BEFORE:
const {
  ...
  combatMoves,
} = useGenerator();

// AFTER: (remove combatMoves line)
const {
  ...
  canExport,
} = useGenerator();
```

2. Update the prepareMint call (around line 206) — remove combatMoves param:
```tsx
// BEFORE:
prepareMint(webpBlob, layersForApi, colorsForApi, effectiveMintType, combatMoves.length === 4 ? combatMoves : undefined);

// AFTER:
prepareMint(webpBlob, layersForApi, colorsForApi, effectiveMintType);
```

3. Remove `combatMoves` from the useCallback dependency array (around line 210).

---

## Task 3: Remove combatMoves from MintContext

**File:** `src/contexts/MintContext.tsx`

Remove the `combatMoves` parameter from the mint flow since moves are now auto-assigned server-side during finalization.

1. Remove `combatMoves` from `PendingMintParams` interface (around line 98/169):
```tsx
// BEFORE:
interface PendingMintParams {
  imageBlob: Blob;
  selectedLayers: Record<string, string>;
  selectedColors: Record<string, string>;
  mintType: 'paid' | 'free';
  combatMoves?: string[];
}

// AFTER:
interface PendingMintParams {
  imageBlob: Blob;
  selectedLayers: Record<string, string>;
  selectedColors: Record<string, string>;
  mintType: 'paid' | 'free';
}
```

2. Remove `combatMoves` from `prepareMint` function signature (around line 515):
```tsx
// BEFORE:
(imageBlob: Blob, selectedLayers: ..., selectedColors: ..., mintType: ..., combatMoves?: string[]) => {
  setPendingMintParams({ imageBlob, selectedLayers, selectedColors, mintType, combatMoves });

// AFTER:
(imageBlob: Blob, selectedLayers: ..., selectedColors: ..., mintType: ...) => {
  setPendingMintParams({ imageBlob, selectedLayers, selectedColors, mintType });
```

3. Remove `combatMoves` from the submit API call (around line 550):
```tsx
// BEFORE:
body: JSON.stringify({
  ...
  combatMoves: combatMoves?.length === 4 ? combatMoves : undefined,
}),

// AFTER:
body: JSON.stringify({
  ...
  // combatMoves removed — auto-assigned server-side
}),
```

---

## Task 4: Remove combatMoves from GeneratorContext

**File:** `src/contexts/GeneratorContext.tsx`

The `combatMoves` state in GeneratorContext is no longer needed since moves are auto-assigned.

1. Find and remove the `combatMoves` state declaration and any setCombatMoves function.
2. Remove `combatMoves` from the context value object (around line 265).
3. Remove `combatMoves` from the GeneratorContextType interface.
4. If there's a `setCombatMoves` in the interface, remove that too.

**Note:** Keep the `calculateCombatIdentity` function and its imports — it's still used server-side and will be used for the mint reveal later.

---

## Task 5: Remove MoveSelection from MintFlowModal (if wired)

**File:** `src/components/generator/MintFlowModal.tsx`

Check if MoveSelection is imported or referenced in the mint flow modal. If it is, remove it:

1. Remove any import of MoveSelection
2. Remove any move selection UI from the confirming step
3. Remove any validation that checks `combatMoves.length !== 4` from the confirm button disabled state (around line 376)

The confirm button should only be disabled if `nameError` is non-empty. Remove the combat moves validation:
```tsx
// BEFORE (if exists):
disabled={!!nameError || (combatType != null && combatMoves.length !== 4)}

// AFTER:
disabled={!!nameError}
```

---

## Task 6: Clean Up Unused Imports

After all changes, run through each modified file and remove any unused imports:

- `ActionBar.tsx` — remove any MoveSelection or combat-related imports that are now unused
- `Generator.tsx` — CombatPreview import already removed in Task 1
- `MintFlowModal.tsx` — remove MoveSelection import if present
- `MintContext.tsx` — remove any combat move validation imports

Do NOT delete these files (they'll be reused):
- `src/components/generator/CombatPreview.tsx` — will be repurposed for reveal
- `src/components/generator/MoveSelection.tsx` — will be repurposed for "How It Works" page
- `src/lib/combat/identity-calculator.ts` — still used server-side
- `src/lib/combat/data/moves.ts` — still used server-side

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Do NOT delete any combat lib files or components — only disconnect them from the Generator flow
- The Generator should show ZERO combat information after these changes
- The MetadataPreview component should remain (it shows layer/trait info, not combat)
