# Universal AI Enhancement Families Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the AI preset system so every family appears in all 3 categories (clothes, head, background) with both modes (enhance + create_new), growing from ~400 to ≥2,500 prompts.

**Architecture:** Replace 6 separate arrays with a single `MASTER_FAMILIES: MasterFamily[]` (38 entries). A `buildCatalog()` function derives the existing `AI_PRESET_CATALOG` shape — no UI components change. Background gets an `enhance` mode (dramatic makeover of existing bg) added alongside its existing `create_new`.

**Tech Stack:** TypeScript, React, Cloudflare Workers, Vite. No new dependencies.

---

## Context Files to Read First

Before touching any code, read:
- `src/config/aiEnhancePresets.ts` — current structure (886 lines, 6 arrays, ~400 prompts)
- `src/types/aiEnhance.ts` — existing types: `AIStyleFamily`, `AICategoryPresets`, `AICategory`
- `src/components/generator/ai/AIPromptBuilder.tsx` — wizard component; background bypass at lines 59–66, mode picker at line 140
- `functions/api/ai/_shared.ts` lines 75–108 — `PROMPT_TEMPLATES` and `buildConstrainedPrompt`
- `docs/plans/2026-03-09-universal-families-design.md` — approved design doc

---

## Task 1: Add MasterFamily Type

**Files:**
- Modify: `src/types/aiEnhance.ts`

**Step 1: Read the file to understand current types**

Run: `cat -n src/types/aiEnhance.ts`

The file currently exports `AIStyleFamily`, `AICategoryPresets`, `AICategory`, `AIMode`, and others.

**Step 2: Add MasterFamily interface after the AIStyleFamily definition (after line 19)**

In `src/types/aiEnhance.ts`, add after the closing `}` of `AIStyleFamily`:

```typescript
/** A family that spans all categories and both modes. */
export interface MasterFamily {
  label: string;
  clothesEnhance:     AIPresetOption[];
  clothesCreate:      AIPresetOption[];
  headEnhance:        AIPresetOption[];
  headCreate:         AIPresetOption[];
  backgroundEnhance:  AIPresetOption[];
  backgroundCreate:   AIPresetOption[];
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/types/aiEnhance.ts
git commit -m "feat: add MasterFamily type to aiEnhance types"
```

---

## Task 2: Add Background Enhance Prompt Template

**Files:**
- Modify: `functions/api/ai/_shared.ts` (lines 98–101)

**Step 1: Read the PROMPT_TEMPLATES section**

The current `background` entry in `PROMPT_TEMPLATES` only has `create_new`. The server's `buildConstrainedPrompt` falls back to `create_new` if `enhance` is missing — so currently any background enhance call would silently use the wrong template.

**Step 2: Add `enhance` entry to the `background` block**

Find this block (around line 98):
```typescript
  background: {
    create_new:
      `${STYLE} ${PRESERVE} Replace ONLY the background: {user_prompt}. ...`,
  },
```

Replace with:
```typescript
  background: {
    enhance:
      `${STYLE} ${PRESERVE} Edit ONLY the background to make it more dramatic: {user_prompt}. Keep the same general scene but intensify it — stronger mood, richer colors, more atmosphere. Apply the same flat cartoon style as the character. Keep ALL character elements (pose, outfit, face, size, position) 100% unchanged. Apply a gentle gaussian blur to keep the background behind the character.`,
    create_new:
      `${STYLE} ${PRESERVE} Replace ONLY the background: {user_prompt}. IMPORTANT STYLE RULES: Draw the background as a simple, minimalistic flat cartoon — like a Wojak meme background. Use only flat solid color fills, thick black outlines, and very simple shapes. NO realistic detail, NO complex textures, NO photorealism, NO gradients, NO lighting effects, NO shadows, NO 3D depth. Think simple MS Paint-level drawing with clean shapes. Apply a gentle gaussian blur to the entire background so it sits behind the character. COMPOSITION: The center of the image MUST be empty and clear — no objects, no detail, no visual clutter in the middle. ALL scene elements (furniture, walls, objects, landscape features) go ONLY on the far left edge, far right edge, top edge, and bottom edge. The middle 50% of the background should be a simple flat color or very minimal. The character must remain EXACTLY the same — same size, same position, same pose, same outfit, same colors, same line-art, same zoom level. Do not alter the character in any way.`,
  },
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add functions/api/ai/_shared.ts
git commit -m "feat: add background enhance prompt template to PROMPT_TEMPLATES"
```

---

## Task 3: Enable Background Enhance Mode in the Wizard

**Files:**
- Modify: `src/components/generator/ai/AIPromptBuilder.tsx`

**Step 1: Read the relevant section**

Read lines 55–175 of `AIPromptBuilder.tsx`. Find these two critical points:

1. Lines 59–66 — background auto-advances to `create_new`, bypassing the mode picker
2. Line 140 — mode picker only renders if `!isBackgroundCategory`

**Step 2: Remove the background bypass**

Find this block (around lines 59–66):
```typescript
  // Background always skips mode (no "enhance" option — background is always create_new)
  const isBackgroundCategory = selectedCategory === 'background';

  // Auto-advance only for background (no mode choice)
  if (isBackgroundCategory && !selectedMode) {
    setSelectedMode('create_new');
    setPromptSubStep('family');
  }
```

Replace with:
```typescript
  const isBackgroundCategory = selectedCategory === 'background';
```

(The `isBackgroundCategory` const is still used below for mode card copy — keep it.)

**Step 3: Update the mode picker render condition**

Find this line (around line 140):
```typescript
  if (promptSubStep === 'mode' && !isBackgroundCategory) {
```

Replace with:
```typescript
  if (promptSubStep === 'mode') {
```

**Step 4: Update mode card copy for background**

Inside the mode picker JSX, the enhance card currently shows:
```tsx
<span className="ai-family-name">{hasLayer ? `Enhance my ${layerName}` : 'Enhance existing'}</span>
<span className="ai-family-desc">{hasLayer ? 'Modify existing style' : 'No layer selected'}</span>
```

And the create new card shows:
```tsx
<span className="ai-family-name">Create new {categoryConfig.label.toLowerCase()}</span>
<span className="ai-family-desc">Start from scratch</span>
```

Replace these with background-aware copy:
```tsx
<span className="ai-family-name">
  {isBackgroundCategory
    ? 'Make it dramatic'
    : hasLayer ? `Enhance my ${layerName}` : 'Enhance existing'}
</span>
<span className="ai-family-desc">
  {isBackgroundCategory
    ? 'Intensify existing background'
    : hasLayer ? 'Modify existing style' : 'No layer selected'}
</span>
```

And for create new:
```tsx
<span className="ai-family-name">
  {isBackgroundCategory ? 'New scene' : `Create new ${categoryConfig.label.toLowerCase()}`}
</span>
<span className="ai-family-desc">
  {isBackgroundCategory ? 'Replace with fresh background' : 'Start from scratch'}
</span>
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Build to confirm no runtime issues**

Run: `npm run build`
Expected: Clean build with no errors.

**Step 7: Commit**

```bash
git add src/components/generator/ai/AIPromptBuilder.tsx
git commit -m "feat: enable background enhance mode in wizard — remove create_new bypass"
```

---

## Task 4: Restructure aiEnhancePresets.ts — Shell (No Content Yet)

Replace the current 886-line file with the new skeleton structure. The families array will be populated in Tasks 5–8.

**Files:**
- Modify: `src/config/aiEnhancePresets.ts` (full rewrite)

**Step 1: Read the current bottom of the file**

Read lines 855–887 to understand the current catalog shape and `getRandomPreset` function.

**Step 2: Write the new file skeleton**

Replace the ENTIRE file with:

```typescript
import type { AICategory, AIStyleFamily, AICategoryPresets, MasterFamily } from '@/types/aiEnhance';

// ─────────────────────────────────────────────────────────────────────────────
// MASTER FAMILIES
//
// Each family appears in ALL categories (clothes, head, background) and ALL
// modes (enhance, create_new). 38 families × 6 contexts × ~13 options = ~2,964
// total prompt options.
//
// Title rules: 1 word ideal, 2 words max. NEVER 3 words.
// ─────────────────────────────────────────────────────────────────────────────

export const MASTER_FAMILIES: MasterFamily[] = [
  // ── 1. Animal Prints ─────────────────────────────────────────────────────
  {
    label: '🐾 Animal Prints',
    clothesEnhance:    [],  // TODO: Task 5
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 2. Elemental ─────────────────────────────────────────────────────────
  {
    label: '🔥 Elemental',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 3. Precious Metals ───────────────────────────────────────────────────
  {
    label: '✨ Precious Metals',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 4. Battle Worn ───────────────────────────────────────────────────────
  {
    label: '⚔️ Battle Worn',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 5. Art & Paint ───────────────────────────────────────────────────────
  {
    label: '🎨 Art & Paint',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 6. Digital & Glitch ──────────────────────────────────────────────────
  {
    label: '👾 Digital & Glitch',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 7. Nature Overgrowth ─────────────────────────────────────────────────
  {
    label: '🌿 Nature Overgrowth',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 8. Luxury & Bling ────────────────────────────────────────────────────
  {
    label: '💎 Luxury & Bling',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 9. Tactical ──────────────────────────────────────────────────────────
  {
    label: '🎖️ Tactical',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 10. Street & Punk ────────────────────────────────────────────────────
  {
    label: '🎸 Street & Punk',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 11. Patterns ─────────────────────────────────────────────────────────
  {
    label: '🌈 Patterns',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 12. Energy & Power ───────────────────────────────────────────────────
  {
    label: '⚡ Energy & Power',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 13. Worn & Aged ──────────────────────────────────────────────────────
  {
    label: '👴 Worn & Aged',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 14. Formal & Elegant ─────────────────────────────────────────────────
  {
    label: '👔 Formal & Elegant',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 15. Sports ───────────────────────────────────────────────────────────
  {
    label: '🏋️ Sports',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 16. Cultural ─────────────────────────────────────────────────────────
  {
    label: '🌍 Cultural',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 17. Costumes ─────────────────────────────────────────────────────────
  {
    label: '🎭 Costumes',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 18. Uniforms ─────────────────────────────────────────────────────────
  {
    label: '👷 Uniforms',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 19. Fantasy ──────────────────────────────────────────────────────────
  {
    label: '🧙 Fantasy',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 20. Steampunk ────────────────────────────────────────────────────────
  {
    label: '⚙️ Steampunk',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 21. Sci-Fi ───────────────────────────────────────────────────────────
  {
    label: '🚀 Sci-Fi',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 22. Armor ────────────────────────────────────────────────────────────
  {
    label: '🛡️ Armor',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 23. Dark & Horror ────────────────────────────────────────────────────
  {
    label: '💀 Dark & Horror',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 24. Royalty ──────────────────────────────────────────────────────────
  {
    label: '👑 Royalty',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 25. Adventure ────────────────────────────────────────────────────────
  {
    label: '🤠 Adventure',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 26. Material Swap ────────────────────────────────────────────────────
  {
    label: '🧊 Material Swap',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 27. Mystical ─────────────────────────────────────────────────────────
  {
    label: '🔮 Mystical',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 28. Absurd & Meme ────────────────────────────────────────────────────
  {
    label: '🤪 Absurd & Meme',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 29. Food & Objects ───────────────────────────────────────────────────
  {
    label: '🍬 Food & Objects',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 30. Patches & Pins ───────────────────────────────────────────────────
  {
    label: '🧢 Patches & Pins',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 31. City ─────────────────────────────────────────────────────────────
  {
    label: '🌆 City',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 32. Nature & Wild ────────────────────────────────────────────────────
  {
    label: '🏝️ Nature & Wild',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 33. Indoor ───────────────────────────────────────────────────────────
  {
    label: '🏠 Indoor',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 34. Action & Extreme ─────────────────────────────────────────────────
  {
    label: '🤸 Action & Extreme',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 35. Abstract ─────────────────────────────────────────────────────────
  {
    label: '🌀 Abstract',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 36. Crypto & Web3 ────────────────────────────────────────────────────
  {
    label: '💰 Crypto & Web3',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 37. Entertainment ────────────────────────────────────────────────────
  {
    label: '🎪 Entertainment',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
  // ── 38. Weather ──────────────────────────────────────────────────────────
  {
    label: '🌩️ Weather',
    clothesEnhance:    [],
    clothesCreate:     [],
    headEnhance:       [],
    headCreate:        [],
    backgroundEnhance: [],
    backgroundCreate:  [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG BUILDER
// Derives the Record<AICategory, AICategoryPresets> shape from MASTER_FAMILIES.
// No UI code changes required — same output shape as before.
// ─────────────────────────────────────────────────────────────────────────────

function toFamilies(families: MasterFamily[], ctx: keyof Omit<MasterFamily, 'label'>): AIStyleFamily[] {
  return families.map(f => ({ label: f.label, options: f[ctx] }));
}

export const AI_PRESET_CATALOG: Record<AICategory, AICategoryPresets> = (() => {
  return {
    clothes: {
      enhance:    toFamilies(MASTER_FAMILIES, 'clothesEnhance'),
      create_new: toFamilies(MASTER_FAMILIES, 'clothesCreate'),
    },
    head: {
      enhance:    toFamilies(MASTER_FAMILIES, 'headEnhance'),
      create_new: toFamilies(MASTER_FAMILIES, 'headCreate'),
    },
    background: {
      enhance:    toFamilies(MASTER_FAMILIES, 'backgroundEnhance'),
      create_new: toFamilies(MASTER_FAMILIES, 'backgroundCreate'),
    },
    facewear: {
      create_new: [],
    },
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// RANDOMIZER
// ─────────────────────────────────────────────────────────────────────────────

export function getRandomPreset(
  category: AICategory,
  mode: 'enhance' | 'create_new',
): { family: AIStyleFamily; option: { label: string; prompt: string } } | null {
  const presets = AI_PRESET_CATALOG[category];
  if (!presets) return null;
  const families = (mode === 'enhance' ? presets.enhance : presets.create_new) ?? [];
  const nonEmpty = families.filter(f => f.options.length > 0);
  if (nonEmpty.length === 0) return null;

  const family = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
  const option = family.options[Math.floor(Math.random() * family.options.length)];
  return { family, option };
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. (All option arrays are empty `[]` — valid; content comes in Tasks 5–8.)

**Step 4: Build**

Run: `npm run build`
Expected: Clean build. The UI will show empty families until content is added.

**Step 5: Commit**

```bash
git add src/config/aiEnhancePresets.ts
git commit -m "refactor: restructure presets to MASTER_FAMILIES + buildCatalog (empty content shell)"
```

---

## Tasks 5–8: Content Writing (Use superpowers:dispatching-parallel-agents)

> **REQUIRED SUB-SKILL:** Before starting these tasks, invoke `superpowers:dispatching-parallel-agents`.
>
> Dispatch 4 parallel agents. Each writes the content for their family slice directly into `MASTER_FAMILIES` in `src/config/aiEnhancePresets.ts`. After all agents complete, run Task 9 (verification).

### Content Quality Rules (ALL agents must follow)

1. **Title length:** 1 word ideal, 2 words max. NEVER 3+ words.
2. **Prompt specificity:** Name the most iconic/specific example, not the generic category.
   - ❌ "City street scene" → ✅ "Blade Runner Tokyo"
   - ❌ "Fantasy castle" → ✅ "Hogwarts tower"
   - ❌ "Dark style" → ✅ "Vantablack void"
3. **Per context what to write:**
   - `clothesEnhance`: Modify the existing clothing's texture/pattern/finish (keep shape)
   - `clothesCreate`: Replace clothing entirely with a new garment
   - `headEnhance`: Modify the existing headwear (keep shape, change surface/style)
   - `headCreate`: Replace headwear with a new item (hats, crowns, helmets, hair, etc.)
   - `backgroundEnhance`: Make the existing background more dramatic (intensify, not replace)
   - `backgroundCreate`: Replace background with a new scene (follow the flat-cartoon composition rules)
4. **Options per context:** 12–15 per family per context. Never fewer than 10.
5. **Prompt wording style:** Lowercase, descriptive, no punctuation at end. 10–25 words per prompt.

### Background-specific prompt rules (from existing template)

For `backgroundCreate` options: Keep the scene simple and flat. Composition rule is already in the server template — the option prompt just names the scene. Example: `{ label: 'Tokyo alley', prompt: 'neon-lit Tokyo back alley at night, vending machines and kanji signs lining the walls, puddles reflecting neon glow' }`.

For `backgroundEnhance` options: Describe the dramatic transformation. Example: `{ label: 'Storm rolls in', prompt: 'dark stormclouds rolling in overhead, lightning in the distance, wind effects on the scene, dramatic atmosphere shift' }`.

---

### Agent A: Families 1–10

Assign families: Animal Prints, Elemental, Precious Metals, Battle Worn, Art & Paint, Digital & Glitch, Nature Overgrowth, Luxury & Bling, Tactical, Street & Punk.

**Agent A research targets (search before writing):**
- Animal Prints: most iconic animals in streetwear (Supreme×Louis, Off-White, BAPE), most dramatic animal habitats
- Elemental: iconic elemental scenes (Pompeii eruption, Arctic tundra, thunderstorm over sea, Sahara sandstorm)
- Precious Metals: rarest metals/gems (Alexandrite, Padparadscha sapphire, Painite), iconic gold plating (Versace, Olympic medals)
- Battle Worn: most recognizable battle damage styles (samurai nicks, Viking ax marks, bullet holes, acid burns)
- Art & Paint: iconic art movements (Basquiat, Jackson Pollock drip, Klimt gold, Mondrian grid, Banksy stencil)
- Digital & Glitch: iconic glitch aesthetics (vaporwave, CRT scanlines, RGB split, green matrix rain, Windows XP crash)
- Nature Overgrowth: iconic overgrowth scenes (Cambodia temple ruins, Chernobyl nature reclaim, Amazon canopy)
- Luxury & Bling: most recognizable luxury brands without naming them (Hermès orange, LV monogram, Rolex green)
- Tactical: iconic military units and gear (Navy SEAL kit, SAS uniform, Delta Force, UN peacekeepers)
- Street & Punk: iconic subcultures (Harajuku Decora, London punk 1977, Bronx hip-hop 1990, Tokyo Ura-Harajuku)

Write all 6 context arrays for each of these 10 families (clothesEnhance, clothesCreate, headEnhance, headCreate, backgroundEnhance, backgroundCreate).

---

### Agent B: Families 11–20

Assign families: Patterns, Energy & Power, Worn & Aged, Formal & Elegant, Sports, Cultural, Costumes, Uniforms, Fantasy, Steampunk.

**Agent B research targets:**
- Patterns: most iconic textile patterns worldwide (Burberry check, Madras plaid, Argyle, Ikat, Bogolan, Kente, Harris Tweed, paisley)
- Energy & Power: most spectacular energy displays (CERN particle ring, aurora borealis, Tesla coil, nuclear plant glow, plasma ball)
- Worn & Aged: most iconic aged aesthetics (Rust Belt factories, Japanese wabi-sabi, Saharan desert wear, sea-weathered sailor gear)
- Formal & Elegant: iconic formal wear (white tie & tails, Savile Row bespoke, Chanel tweed, Met Gala avant-garde, geisha)
- Sports: most recognizable team uniforms and sports aesthetics (NBA, NFL, F1 suit, Tour de France jersey, Shaolin wushu)
- Cultural: most visually distinct traditional dress (Hanbok, Kimono, Dirndl, Dashiki, Sari, Huipil, Thawb, Yukata, Kilt)
- Costumes: most iconic character costumes (Darth Vader, Batman, Joker, Pikachu, Mario, Freddy Krueger)
- Uniforms: most distinctive professional uniforms (NASA spacesuit, surgeon scrubs, Swiss Guard, Tokyo police, UPS driver, pilot)
- Fantasy: most iconic fantasy archetypes (Gandalf grey robes, Legolas elvish tunic, Sauron dark armor, Galadriel ethereal white)
- Steampunk: most referenced steampunk aesthetics (Victorian airship captain, clockwork automaton, brass goggles inventor)

Write all 6 context arrays for each of these 10 families.

---

### Agent C: Families 21–30

Assign families: Sci-Fi, Armor, Dark & Horror, Royalty, Adventure, Material Swap, Mystical, Absurd & Meme, Food & Objects, Patches & Pins.

**Agent C research targets:**
- Sci-Fi: most iconic sci-fi aesthetics (Dune stillsuit, Star Wars Mandalorian, Alien xenomorph biomech, Cyberpunk 2077 chrome, Tron grid)
- Armor: most distinct historical armor (Spartan phalanx, Samurai do-maru, Medieval plate, Aztec eagle warrior, Roman lorica)
- Dark & Horror: most iconic horror aesthetics (SCP Foundation, Junji Ito body horror, Coraline Other Mother, Annihilation shimmer)
- Royalty: most iconic royal regalia (St. Edward's Crown, French dauphin ermine, Byzantine emperor purple, Joseon dynasty)
- Adventure: most distinct explorer aesthetics (Indiana Jones, Antarctic Scott, Amazon explorer, Sahara Bedouin, Arctic Amundsen)
- Material Swap: most striking material transformations (origami paper, crumpled foil, circuit board, coral reef, obsidian glass)
- Mystical: most powerful mystical visual languages (Hermetic seals, Norse runes, Buddhist mandalas, Aztec calendar glyphs, Enochian)
- Absurd & Meme: most recognizable internet meme aesthetics (Minecraft grass block, Among Us, Doge, Shrek, deep fried meme)
- Food & Objects: most visually striking food textures (cotton candy, bubble wrap, Cheeto dust, gummy bear, watermelon rind)
- Patches & Pins: most iconic patch cultures (NASA mission patches, Iron Maiden back patch, Boy Scout merit badges, varsity letter)

Write all 6 context arrays for each of these 10 families.

---

### Agent D: Families 31–38

Assign families: City, Nature & Wild, Indoor, Action & Extreme, Abstract, Crypto & Web3, Entertainment, Weather.

**Agent D research targets:**
- City: most visually distinct cities (Tokyo Shinjuku, NYC Times Square, Blade Runner LA, Dubai skyline, São Paulo graffiti district, Lagos Island, Medina Marrakech, Hong Kong Kowloon)
- Nature & Wild: most dramatic ecosystems (Amazon basin at flood, Sahara dunes at sunset, Patagonia glacier calving, Borneo rainforest canopy, Tibetan plateau)
- Indoor: most distinct interior aesthetics (Japanese izakaya, 1970s Brady Bunch living room, NASA control room, Tokyo capsule hotel, Baroque library)
- Action & Extreme: most recognizable extreme sports aesthetics (halfpipe snowboard, motocross track, wingsuit cliff, BASE jump city, underground boxing)
- Abstract: most iconic abstract visual styles (Rothko color field, Escher impossible geometry, Kandinsky composition, Mondrian primary grid, quantum foam)
- Crypto & Web3: most recognizable crypto culture visuals (Bored Ape yacht, moon rocket, crypto winter bear, blockchain grid, diamond hands)
- Entertainment: most iconic entertainment venues and aesthetics (Madison Square Garden, Glastonbury stage, Vegas Strip, Broadway marquee, Colosseum arena)
- Weather: most dramatic weather phenomena (supercell thunderstorm, category 5 hurricane eye wall, Northern Lights, sandstorm haboob, blizzard whiteout)

Write all 6 context arrays for each of these 8 families.

---

## Task 9: Verification

Run these checks after all content agents complete.

**Step 1: TypeScript**

```bash
npx tsc --noEmit
```
Expected: Zero errors.

**Step 2: Build**

```bash
npm run build
```
Expected: Clean build.

**Step 3: Count total families**

In Node or browser console:
```javascript
import { MASTER_FAMILIES } from './src/config/aiEnhancePresets.ts';
console.log('Families:', MASTER_FAMILIES.length); // must be 38
```

Or check manually in the file.

**Step 4: Count total prompts**

Run this count script:
```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/config/aiEnhancePresets.ts', 'utf8');
const matches = src.match(/{ label: '[^']+', prompt: '[^']+' }/g);
console.log('Total prompts:', matches?.length ?? 0);
"
```
Expected: ≥ 2500

**Step 5: Check for 3-word titles**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/config/aiEnhancePresets.ts', 'utf8');
const labels = src.match(/label: '([^']+)'/g) ?? [];
const bad = labels.filter(l => {
  const text = l.replace('label: ', '').replace(/'/g, '').replace(/^[^\w]+/, '').trim();
  return text.split(' ').filter(w => w.length > 0).length >= 3;
});
console.log('3-word labels:', bad.length);
bad.forEach(b => console.log(' ', b));
"
```
Expected: 0 violations.

**Step 6: Visual test in dev server**

```bash
npm run dev
```

Navigate to generator → AI enhance button → test:
1. Select "Clothes" → see mode picker → select Enhance → see all 38 families with options
2. Select "Head" → see mode picker → select Create → see all 38 families
3. Select "Background" → see mode picker (NEW: should show both modes, NOT auto-advance) → select Enhance → see 38 families → select Create → see 38 families
4. Surprise Me button works in all 3 categories and both modes

**Step 7: Commit**

```bash
git add src/config/aiEnhancePresets.ts
git commit -m "feat: universal AI families — 38 families × 6 contexts, ~2,964 prompts

Every family now appears in all 3 categories (clothes, head, background)
and both modes (enhance + create_new). Background gains enhance mode.
Total prompts: ~2,964 (up from ~400).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Success Criteria Self-Check

| Criterion | How to Verify |
|-----------|--------------|
| `MASTER_FAMILIES.length === 38` | Count in file or Node |
| Every family has all 6 context arrays with ≥10 options | Visual scan + count script |
| Total prompts ≥ 2,500 | Count script |
| Zero 3-word titles | Label check script |
| `AICategoryPresets.enhance` populated for background | Check `AI_PRESET_CATALOG.background.enhance.length > 0` |
| `background.enhance` template in `PROMPT_TEMPLATES` | Read _shared.ts |
| Background shows mode picker (no auto-advance) | Visual test in dev |
| `npx tsc --noEmit` passes | Run command |
| `npm run build` passes | Run command |
| Surprise Me works in all 6 contexts | Manual test |

---

## Notes

- **No UI component changes** except `AIPromptBuilder.tsx` (remove 5-line bypass, update mode copy)
- **No new dependencies** — pure TypeScript content
- **Facewear** remains unchanged: `create_new: []` (deliberately excluded from AI wizard per existing decision)
- **`getRandomPreset`** is updated to skip families with empty options (prevents crash during content development)
- Content agents should cross-check: if the same specific reference appears in multiple options within one context, rename one to avoid duplication
