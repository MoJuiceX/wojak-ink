# Universal AI Enhancement Families — Design Document

**Date:** 2026-03-09
**Status:** Approved

---

## Problem

The current AI enhance preset system has structural fragmentation that limits coverage and consistency:

- 51 total family *entries* split across 6 separate arrays: `UNIVERSAL_ENHANCE`, `CLOTHES_ENHANCE`, `HEAD_ENHANCE`, `CLOTHES_CREATE`, `HEAD_CREATE`, `BACKGROUND_CREATE`
- Many duplicate families appear across arrays with slight wording differences (e.g. Fantasy appears 3 times with minimal variation)
- Background only has `create_new` mode — no `enhance` mode
- Total prompts: ~400 (target: ≥2,500)
- Zero cross-category consistency — a user sees different family sets depending on what they select

---

## Decision

**Option A — Universal families with context-specific prompts.**

Every family appears in every category (clothes, head, background) and every mode (enhance, create_new). Each family has the same name everywhere, but the prompts within each family are specific to what makes sense for that context.

Example — "Fantasy" family:
- `clothesEnhance` → wizard robes, enchanted armor trim, magical fabric shimmer
- `clothesCreate` → full sorcerer outfit, elvish tunic, dark mage cloak
- `headEnhance` → mystical glow around existing hat, runic engravings on helmet
- `headCreate` → horned crown, pointed witch hat, dragon scale crown
- `backgroundEnhance` → make existing background more dramatic (storm rolls in, magic mist rises)
- `backgroundCreate` → enchanted forest, ancient wizard tower, floating magical islands

---

## Architecture

### New Type: MasterFamily

```typescript
export interface MasterFamily {
  label: string;          // e.g. "🧙 Fantasy"
  clothesEnhance: AIPresetOption[];
  clothesCreate:  AIPresetOption[];
  headEnhance:    AIPresetOption[];
  headCreate:     AIPresetOption[];
  backgroundEnhance: AIPresetOption[];
  backgroundCreate:  AIPresetOption[];
}
```

### New Source of Truth

`src/config/aiEnhancePresets.ts` exports:
- `MASTER_FAMILIES: MasterFamily[]` — the single source of truth
- `AI_PRESET_CATALOG: Record<AICategory, AICategoryPresets>` — derived from MASTER_FAMILIES via `buildCatalog()`, same shape as today so **no UI code changes required**

```typescript
function buildCatalog(): Record<AICategory, AICategoryPresets> {
  return {
    clothes: {
      enhance:    MASTER_FAMILIES.map(f => ({ label: f.label, options: f.clothesEnhance })),
      create_new: MASTER_FAMILIES.map(f => ({ label: f.label, options: f.clothesCreate })),
    },
    head: {
      enhance:    MASTER_FAMILIES.map(f => ({ label: f.label, options: f.headEnhance })),
      create_new: MASTER_FAMILIES.map(f => ({ label: f.label, options: f.headCreate })),
    },
    background: {
      enhance:    MASTER_FAMILIES.map(f => ({ label: f.label, options: f.backgroundEnhance })),
      create_new: MASTER_FAMILIES.map(f => ({ label: f.label, options: f.backgroundCreate })),
    },
  };
}
```

### Background Enhance Mode

Background category (`freedom: 'free'` in `AI_CATEGORIES`) currently only has `create_new`. Adding `enhance` mode means:
- `AICategoryPresets.enhance` is now populated for `background`
- The wizard shows the mode picker for background (enhance = "make current bg more dramatic"; create_new = "replace with new scene")
- Server prompt templates in `functions/api/ai/_shared.ts` need a `backgroundEnhance` template added

---

## Families — 38 Master Families

Merged and deduplicated from the current 51 entries:

| # | Family | Emoji |
|---|--------|-------|
| 1 | Animal Prints | 🐾 |
| 2 | Elemental | 🔥 |
| 3 | Precious Metals | ✨ |
| 4 | Battle Worn | ⚔️ |
| 5 | Art & Paint | 🎨 |
| 6 | Digital & Glitch | 👾 |
| 7 | Nature Overgrowth | 🌿 |
| 8 | Luxury & Bling | 💎 |
| 9 | Tactical | 🎖️ |
| 10 | Street & Punk | 🎸 |
| 11 | Patterns | 🌈 |
| 12 | Energy & Power | ⚡ |
| 13 | Worn & Aged | 👴 |
| 14 | Formal & Elegant | 👔 |
| 15 | Sports | 🏋️ |
| 16 | Cultural | 🌍 |
| 17 | Costumes | 🎭 |
| 18 | Uniforms | 👷 |
| 19 | Fantasy | 🧙 |
| 20 | Steampunk | ⚙️ |
| 21 | Sci-Fi | 🚀 |
| 22 | Armor | 🛡️ |
| 23 | Dark & Horror | 💀 |
| 24 | Royalty | 👑 |
| 25 | Adventure | 🤠 |
| 26 | Material Swap | 🧊 |
| 27 | Mystical | 🔮 |
| 28 | Absurd & Meme | 🤪 |
| 29 | Food & Objects | 🍬 |
| 30 | Patches & Pins | 🧢 |
| 31 | City | 🌆 |
| 32 | Nature & Wild | 🏝️ |
| 33 | Indoor | 🏠 |
| 34 | Action & Extreme | ⚡ |
| 35 | Abstract | 🌀 |
| 36 | Crypto & Web3 | 💰 |
| 37 | Entertainment | 🎪 |
| 38 | Weather | 🌩️ |

---

## Scale

| Dimension | Count |
|-----------|-------|
| Master families | 38 |
| Context slots per family | 6 |
| Options per context | ~13 |
| **Total prompts** | **~2,964** |

Exceeds the 2,500 target.

---

## Execution Plan (Agent Workflow)

Content creation uses a **research-first, parallel-write** approach:

### Phase 1 — Research (parallel agents)
3 parallel web search agents, each covering ~13 families, finding the most iconic/lore-rich examples per family before any prompts are written. Research output: structured notes per family with best-in-class reference points.

### Phase 2 — Gap Analysis (single agent)
Review all ~400 existing prompts against:
- Redundancies (similar prompts under different labels)
- 3-word title violations (strict: 1 word ideal, 2 words max, NEVER 3)
- Missing emoji
- Weak or generic prompts that should be replaced by research findings

### Phase 3 — Content Writing (parallel agents)
4 parallel agents splitting the 38 families:
- Agent A: families 1–10, all 6 contexts
- Agent B: families 11–20, all 6 contexts
- Agent C: families 21–30, all 6 contexts
- Agent D: families 31–38, all 6 contexts

### Phase 4 — Code + Type Changes (single agent)
- Add `MasterFamily` type to `src/types/aiEnhance.ts`
- Add `backgroundEnhance` prompt template to `functions/api/ai/_shared.ts`
- Restructure `src/config/aiEnhancePresets.ts` with `MASTER_FAMILIES` + `buildCatalog()`
- Verify TypeScript clean, build passes

---

## Title Rules

| Rule | Detail |
|------|--------|
| Length | 1 word ideal, 2 words acceptable |
| Hard limit | NEVER 3 words or more |
| Example: good | "Tiger", "Lava", "Night Sky" |
| Example: bad | "Tiger Fur Coat", "Dark Night Sky" |

Applies to both `AIPresetOption.label` (button text) AND `MasterFamily.label` (family name, after emoji).

---

## Constraints

- **No UI changes needed** — `buildCatalog()` output is identical in shape to current `AI_PRESET_CATALOG`
- **No new dependencies** — pure TypeScript content file
- **No `!important`** — CSS anti-pattern prohibited
- **No inline styles** — per CSS architecture rules
- **Background enhance mode** — must wire up `backgroundEnhance` prompt template in `_shared.ts` to avoid sending a generic clothes/head template to background calls

---

## Success Criteria

1. `MASTER_FAMILIES.length === 38`
2. Every family has all 6 context arrays populated with ≥10 options each
3. Total prompt count ≥ 2,500
4. Zero 3-word titles across all labels
5. `AICategoryPresets.enhance` is populated for `background`
6. `backgroundEnhance` prompt template exists in `_shared.ts`
7. `npx tsc --noEmit` — zero errors
8. `npm run build` — clean build
9. AI wizard shows families in background enhance mode correctly
