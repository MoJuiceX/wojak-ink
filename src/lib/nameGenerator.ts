// Random name generator for Your Wojak NFTs
// Generates fun, meme-culture names themed to the selected clothing. Max 15 characters.

import { getNameTheme } from './nameThemes';
import type { NameTheme } from './nameThemes';

export const MAX_NAME_LENGTH = 15;

/**
 * Generate a random name, optionally themed to the selected clothing.
 * @param clothingName - Display name of the clothing (e.g. "Bepe Army", "Astronaut")
 */
export function generateRandomName(clothingName?: string): string {
  const theme: NameTheme = getNameTheme(clothingName);

  // 50% chance to use a full premade name, 50% to combine prefix+suffix
  if (Math.random() < 0.5 && theme.fullNames.length > 0) {
    const name = theme.fullNames[Math.floor(Math.random() * theme.fullNames.length)];
    return name.slice(0, MAX_NAME_LENGTH);
  }

  const prefix = theme.prefixes[Math.floor(Math.random() * theme.prefixes.length)];
  const suffix = theme.suffixes[Math.floor(Math.random() * theme.suffixes.length)];
  const name = `${prefix} ${suffix}`;
  return name.slice(0, MAX_NAME_LENGTH);
}

/**
 * Get a placeholder hint name for the input field, themed to clothing.
 * @param clothingName - Display name of the clothing
 */
export function getPlaceholderHint(clothingName?: string): string {
  const theme = getNameTheme(clothingName);
  return theme.hint;
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
