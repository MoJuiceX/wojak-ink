// Random name generator for Your Wojak NFTs
// Generates fun, meme-culture names. Max 15 characters.

const PREFIXES = [
  // Tang Gang — orange / citrus / Chia community
  'Tang', 'Honk', 'Bepe', 'Pulp', 'Citrus', 'Zesty', 'Tangy', 'Orange',
  'Peel', 'Rind', 'Juice', 'Juicy', 'Wedge', 'Navel', 'Squeeze',
  // Wojak / Internet
  'Doomer', 'Bloomer', 'Coomer', 'Feels', 'Based', 'Cursed', 'Gigachad', 'Brainlet',
  // Crypto
  'Degen', 'Diamond', 'Laser', 'HODL', 'Rekt', 'Wagmi', 'Whale', 'Bullish', 'Rugged',
  // Gaming / Dark
  'Shadow', 'Iron', 'Ghost', 'Hyper', 'Ultra', 'Void', 'Chaos', 'Neon',
  // Internet
  'Turbo', 'Sigma', 'Alpha', 'Omega', 'Clown', 'Cringe', 'NPC',
];

const SUFFIXES = [
  'Maxi', 'Lord', 'King', 'OG', 'Fren', 'Sage', 'Wizard', 'Knight', 'Monk', 'Chad',
  'Hands', 'Eyes', 'Pilled', 'Gang', 'Brain', 'Mode', 'Vibes', '9000', 'IRL', 'Ape',
  'Slayer', 'Master',
];

const FULL_NAMES = [
  // Tang Gang
  'Winners Win', 'Orange Maxi', 'Honk Pilled', 'Tang Lord', 'Pulp Gang',
  'Bepe Maxi', 'Neck Growth', 'Zesty Chad', 'Citrus King', 'Peel Gang',
  'Juice Wizard', 'Navel Sage',
  // Wojak / Internet
  'Feels Good', 'This Is Fine', 'Doomer Mode', 'Gigachad OG', 'Big Brain',
  'Clown World', 'NPC Brain', 'Touch Grass', 'Brainlet IRL', 'Based Lord',
  // Crypto
  'Diamond Hands', 'Paper Hands', 'Laser Eyes', 'Wagmi Fren', 'Rekt Again',
  'Degen Lord', 'Rug Survivor', 'Whale Alert', 'Moon Soon', 'NGMI Steve',
  // Gaming / Dark
  'Void Walker', 'Shadow King', 'Iron Fist', 'Chaos Mode', 'Neon Ghost', 'Coomer IRL',
];

export const MAX_NAME_LENGTH = 15;

export function generateRandomName(): string {
  // 50% chance to use a full premade name, 50% to combine
  if (Math.random() < 0.5 && FULL_NAMES.length > 0) {
    const name = FULL_NAMES[Math.floor(Math.random() * FULL_NAMES.length)];
    return name.slice(0, MAX_NAME_LENGTH);
  }

  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const name = `${prefix} ${suffix}`;
  return name.slice(0, MAX_NAME_LENGTH);
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
  // Alphanumeric + spaces only
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, numbers, and spaces' };
  }
  return { valid: true };
}
