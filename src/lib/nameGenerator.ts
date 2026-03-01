// Random name generator for Your Wojak NFTs
// Generates fun, meme-culture names themed to the selected clothing or resolved moods.
// Max 15 characters.

import { getNameTheme } from './nameThemes';
import { resolveMoods } from './moodMap';
import type { MoodTag } from './moodMap';
import { MOOD_POOLS, MOOD_COMBOS } from './moodPools';

export const MAX_NAME_LENGTH = 15;

/** Minimal trait input for mood resolution. */
export interface TraitInput {
  trait_type: string;
  value: string;
}

/** Pick a random element from an array. */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a name from resolved primary + secondary moods.
 *
 * Roll distribution:
 *   < 0.25 — combo name (if any exist for this pair)
 *   < 0.50 — primary pool fullName
 *   < 0.75 — primary adjective + noun (70% primary noun, 30% secondary noun)
 *   < 0.90 — primary title + noun (50/50 primary/secondary noun)
 *   else   — secondary pool fullName
 */
function generateFromMoods(primary: MoodTag, secondary: MoodTag): string {
  const primaryPool = MOOD_POOLS[primary];
  const secondaryPool = MOOD_POOLS[secondary];
  const comboNames = MOOD_COMBOS[primary]?.[secondary] ?? [];

  const roll = Math.random();
  let name: string;

  if (roll < 0.25 && comboNames.length > 0) {
    // Combo name
    name = pickRandom(comboNames);
  } else if (roll < 0.50) {
    // Primary full name
    name = pickRandom(primaryPool.fullNames);
  } else if (roll < 0.75) {
    // Adjective + noun (70% primary noun, 30% secondary noun)
    const adj = pickRandom(primaryPool.adjectives);
    const noun = Math.random() < 0.7
      ? pickRandom(primaryPool.nouns)
      : pickRandom(secondaryPool.nouns);
    name = `${adj} ${noun}`;
  } else if (roll < 0.90) {
    // Title + noun (50/50 primary/secondary noun)
    const title = pickRandom(primaryPool.titles);
    const noun = Math.random() < 0.5
      ? pickRandom(primaryPool.nouns)
      : pickRandom(secondaryPool.nouns);
    name = `${title} ${noun}`;
  } else {
    // Secondary full name
    name = pickRandom(secondaryPool.fullNames);
  }

  return name.slice(0, MAX_NAME_LENGTH);
}

/**
 * Generate a random name, themed by traits (mood system) or clothing string (legacy).
 *
 * Signatures:
 *   generateRandomName()                     — default chill/degen moods
 *   generateRandomName('Suit')               — legacy: default chill/degen moods
 *   generateRandomName([{trait_type, value}]) — mood-aware from traits
 */
export function generateRandomName(traitsOrClothing?: TraitInput[] | string): string {
  if (typeof traitsOrClothing === 'string' || traitsOrClothing === undefined) {
    // Legacy path: use default moods
    return generateFromMoods('chill', 'degen');
  }

  // Array path: resolve moods from traits
  const { primary, secondary } = resolveMoods(traitsOrClothing);
  return generateFromMoods(primary, secondary);
}

/**
 * Get a placeholder hint name for the input field.
 *
 * Signatures:
 *   getPlaceholderHint()                     — legacy clothing theme hint
 *   getPlaceholderHint('Suit')               — legacy clothing theme hint
 *   getPlaceholderHint([{trait_type, value}]) — mood-based hint
 */
export function getPlaceholderHint(traitsOrClothing?: TraitInput[] | string): string {
  if (typeof traitsOrClothing === 'string' || traitsOrClothing === undefined) {
    // Legacy: use old clothing theme system
    const theme = getNameTheme(
      typeof traitsOrClothing === 'string' ? traitsOrClothing : undefined,
    );
    return theme.hint;
  }

  // New: use mood system
  const { primary } = resolveMoods(traitsOrClothing);
  return MOOD_POOLS[primary].hint;
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (name.length === 0) return { valid: true }; // Empty = no custom name, that's fine
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name must be ${MAX_NAME_LENGTH} characters or less` };
  }
  // Alphanumeric + spaces + basic punctuation
  if (!/^[a-zA-Z0-9 .,!?'-]+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, spaces, and basic punctuation' };
  }
  // No leading/trailing spaces
  if (name !== name.trim()) {
    return { valid: false, error: 'Name cannot start or end with spaces' };
  }
  return { valid: true };
}

export function formatFullName(editionNumber: number, customName?: string): string {
  if (customName && customName.trim()) {
    return `Your Wojak #${editionNumber}: ${customName.trim()}`;
  }
  return `Your Wojak #${editionNumber}`;
}

// DID Display Name Generator — generates names like "BasedHolder42"
const DID_ADJECTIVES = [
  'Based', 'Degen', 'Chad', 'Sigma', 'Alpha', 'Mega', 'Ultra', 'Epic',
  'Turbo', 'Hyper', 'Cosmic', 'Atomic', 'Blazing', 'Frozen', 'Shadow',
  'Golden', 'Diamond', 'Crystal', 'Iron', 'Toxic', 'Neon', 'Stealth',
  'Savage', 'Noble', 'Mystic', 'Rogue', 'Swift', 'Mighty', 'Dark', 'Bright',
];

const DID_NOUNS = [
  'Wojak', 'Farmer', 'Holder', 'Trader', 'Degen', 'Ape', 'Bull', 'Bear',
  'Whale', 'Shark', 'Wolf', 'Lion', 'Eagle', 'Dragon', 'Knight', 'King',
  'Chief', 'Boss', 'Legend', 'Champion', 'Wizard', 'Ninja', 'Samurai',
  'Viking', 'Spartan', 'Titan', 'Phoenix', 'Ranger', 'Hunter', 'Pilot',
];

export function generateDIDName(): string {
  const adj = DID_ADJECTIVES[Math.floor(Math.random() * DID_ADJECTIVES.length)];
  const noun = DID_NOUNS[Math.floor(Math.random() * DID_NOUNS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
}

export function validateDIDName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Name must be 20 characters or less' };
  }
  // Alphanumeric + spaces + common punctuation (apostrophes, hyphens, periods, underscores)
  if (!/^[a-zA-Z0-9 '\-._]+$/.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, numbers, spaces, and basic punctuation' };
  }
  return { valid: true };
}
