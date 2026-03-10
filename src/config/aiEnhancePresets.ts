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
    clothesEnhance:    [],
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
