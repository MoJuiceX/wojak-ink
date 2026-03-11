// src/lib/combat/data/ai-combat-map.ts
//
// Combat mappings for AI enhancement presets.
// Family-level defaults (38 — one per MasterFamily in aiEnhancePresets.ts),
// per-option overrides for diverse families (8 families, 76 options).
//
// IMPORTANT: Family default keys must match the preset label AFTER emoji
// stripping. E.g. "🐾 Animal Prints" → "Animal Prints".

import type { CombatType, StatName } from '../types';

export interface AICombatMapping {
  primaryType: CombatType;
  primaryPts: number;
  secondaryType: CombatType;
  secondaryPts: number;
  natureStat: StatName;
  natureStatPts: number;
}

// ---------- Family Defaults ----------
// Key: family label after emoji stripping (must match MasterFamily.label exactly)
// All 38 preset families covered.

const FAMILY_DEFAULTS: Record<string, AICombatMapping> = {
  // ── Enhance-mode families (shared across clothes/head/background) ──
  'Animal Prints':       { primaryType: 'VENOM',    primaryPts: 5, secondaryType: 'INSECT',   secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Elemental':           { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Precious Metals':     { primaryType: 'METAL',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Energy & Power':      { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Material Swap':       { primaryType: 'ICE',      primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },

  // ── Create-mode families ──
  'Battle Worn':         { primaryType: 'MARTIAL',  primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Art & Paint':         { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Digital & Glitch':    { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Nature Overgrowth':   { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Luxury & Bling':      { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Tactical':            { primaryType: 'MARTIAL',  primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Street & Punk':       { primaryType: 'SHADOW',   primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Patterns':            { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'NEUTRAL',  secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Worn & Aged':         { primaryType: 'EARTH',    primaryPts: 5, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Formal & Elegant':    { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Sports':              { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'MARTIAL',  secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Cultural':            { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Costumes':            { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'SHADOW',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Uniforms':            { primaryType: 'METAL',    primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Fantasy':             { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Steampunk':           { primaryType: 'METAL',    primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Sci-Fi':              { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Armor':               { primaryType: 'METAL',    primaryPts: 6, secondaryType: 'MARTIAL',  secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Dark & Horror':       { primaryType: 'SHADOW',   primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Royalty':             { primaryType: 'MYSTIC',   primaryPts: 6, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Adventure':           { primaryType: 'EARTH',    primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Mystical':            { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Absurd & Meme':       { primaryType: 'NEUTRAL',  primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Food & Objects':      { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'NEUTRAL',  secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Patches & Pins':      { primaryType: 'NEUTRAL',  primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },

  // ── Background-only families ──
  'City':                { primaryType: 'SHADOW',   primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Nature & Wild':       { primaryType: 'WATER',    primaryPts: 5, secondaryType: 'GRASS',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Indoor':              { primaryType: 'SHADOW',   primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Action & Extreme':    { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Abstract':            { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Crypto & Web3':       { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Entertainment':       { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Weather':             { primaryType: 'ICE',      primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
};

// ---------- Per-Option Overrides ----------
// Key: option label (must match AIPresetOption.label exactly)

const OPTION_OVERRIDES: Record<string, AICombatMapping> = {
  // ── Elemental ──
  'Flame pattern':       { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Ice frost':           { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Lightning bolts':     { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Lava cracks':         { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },
  'Sandstorm grit':      { primaryType: 'EARTH',    primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Tidal wave splash':   { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'ICE',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Tornado debris':      { primaryType: 'AIR',      primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Acid rain drips':     { primaryType: 'VENOM',    primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Arctic blizzard':     { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Earthquake cracks':   { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Solar flare scorch':  { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Swamp murk':          { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },

  // ── Energy & Power ──
  'Plasma core':         { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Cosmic energy':       { primaryType: 'MYSTIC',   primaryPts: 6, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Solar powered':       { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Shadow aura':         { primaryType: 'SHADOW',   primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Spirit flame':        { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Quantum flux':        { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'ELECTRIC', secondaryPts: 3, natureStat: 'speed',   natureStatPts: 2 },
  'Void energy':         { primaryType: 'SHADOW',   primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Thunder charged':     { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },

  // ── Mystical (was "Magical") ──
  'Enchanted glow':      { primaryType: 'MYSTIC',   primaryPts: 6, secondaryType: 'ELECTRIC', secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Cursed markings':     { primaryType: 'SHADOW',   primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Fire enchant':        { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Frost enchant':       { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Nature vines':        { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Spirit wisps':        { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Arcane circuits':     { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'ELECTRIC', secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Blood magic':         { primaryType: 'SHADOW',   primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },

  // ── Material Swap ──
  'Stone carved':        { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Ice sculpture':       { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Wood grain':          { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Cloud material':      { primaryType: 'AIR',      primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Ghost form':          { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'SHADOW',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Sand form':           { primaryType: 'EARTH',    primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Coral growth':        { primaryType: 'WATER',    primaryPts: 5, secondaryType: 'GRASS',    secondaryPts: 3, natureStat: 'defense', natureStatPts: 2 },
  'Lava stone':          { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },
  'Mushroom growth':     { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },

  // ── Fantasy clothes ──
  'Druid robes':         { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Necromancer cloak':   { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'SHADOW',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Sea serpent armor':   { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Storm mage robes':    { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Phoenix feather cape': { primaryType: 'FIRE',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Crystal armor':       { primaryType: 'ICE',      primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 3, natureStat: 'defense', natureStatPts: 2 },
  'Shadow cloak':        { primaryType: 'SHADOW',   primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Fairy wings vest':    { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 3, natureStat: 'speed',   natureStatPts: 2 },

  // ── Fantasy & Creature head ──
  'Dragon horns':        { primaryType: 'DRAGON',   primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Unicorn horn':        { primaryType: 'MYSTIC',   primaryPts: 6, secondaryType: 'ELECTRIC', secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Dark elf ears':       { primaryType: 'SHADOW',   primaryPts: 6, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Phoenix crest':       { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Medusa snakes':       { primaryType: 'VENOM',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Troll tusks':         { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Kraken tentacles':    { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Fairy crown':         { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'ELECTRIC', secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },
  'Demon horns':         { primaryType: 'SHADOW',   primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },

  // ── Nature & Wild backgrounds ──
  'Tropical beach':      { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'GRASS',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Deep forest':         { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'INSECT',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Volcanic crater':     { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Arctic tundra':       { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Coral reef':          { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'GRASS',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Mountain peak':       { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
  'Swamp bayou':         { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },
  'Desert oasis':        { primaryType: 'EARTH',    primaryPts: 5, secondaryType: 'WATER',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },
  'Thunderstorm field':  { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Crystal cavern':      { primaryType: 'STONE',    primaryPts: 5, secondaryType: 'ICE',      secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },

  // ── Action & Extreme backgrounds ──
  'Race track':          { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'ELECTRIC', secondaryPts: 3, natureStat: 'speed',   natureStatPts: 2 },
  'Lightning storm':     { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Haunted graveyard':   { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'SHADOW',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Underwater ruins':    { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Tornado alley':       { primaryType: 'AIR',      primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Meteor shower':       { primaryType: 'MYSTIC',   primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Tsunami wave':        { primaryType: 'WATER',    primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },
  'Earthquake zone':     { primaryType: 'EARTH',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'defense', natureStatPts: 2 },
};

// ---------- Lookup Function ----------

/**
 * Look up the combat mapping for an AI enhancement.
 * Checks per-option overrides first, falls back to family default.
 *
 * @param familyLabel  The family label from AIStyleFamily (may include emoji prefix)
 * @param optionLabel  The specific option label from AIPresetOption
 */
export function lookupAICombat(
  familyLabel: string,
  optionLabel: string,
): AICombatMapping | undefined {
  // 1. Check per-option overrides first (most specific)
  const override = OPTION_OVERRIDES[optionLabel];
  if (override) return override;

  // 2. Strip emoji prefix if present (family labels start with emoji + space)
  const cleanLabel = familyLabel.replace(/^[^\w\s]+\s*/, '').trim();

  // 3. Fall back to family default
  return FAMILY_DEFAULTS[cleanLabel] ?? FAMILY_DEFAULTS[familyLabel];
}
