// Random name generator for Your Wojak NFTs
// Generates fun, meme-culture names. Max 15 characters.

const PREFIXES = [
  'Moon', 'Chia', 'Degen', 'Cope', 'Sigma', 'Based', 'Mega', 'Ultra',
  'Pepe', 'Donut', 'Alpha', 'Iron', 'Dark', 'Gold', 'Neon', 'Zen',
  'Pixel', 'Turbo', 'Lil', 'Big', 'Dr', 'King', 'Lord', 'Ser',
  'Bro', 'Papa', 'Baby', 'Mad', 'Chill', 'Hype',
];

const SUFFIXES = [
  'Boy', 'Chad', 'King', 'Lord', 'Dude', 'Man', 'Bro', 'Ape',
  'Punk', 'Bear', 'Bull', 'Dev', 'Whale', 'Frog', 'Sage', 'Boss',
  'Don', 'Sir', 'Mage', 'Chef', 'Monk', 'Slayer', 'Flex',
  'Rick', 'Sensei', 'Tank', 'Pro', 'Max', 'Rex', 'Ace',
];

const FULL_NAMES = [
  'Moon Boy', 'Chia Chad', 'Degen King', 'Cope Lord',
  'Sigma Grind', 'Based Dad', 'Paper Hands', 'Donut Lord',
  'Big Brain', 'Numb Skull', 'Lil Pump', 'Iron Hands',
  'Turbo Nerd', 'Dark Mage', 'Pixel Punk', 'Zen Master',
  'Gold Digger', 'Neon Cowboy', 'Mad Lad', 'Hype Beast',
  'Bag Holder', 'Floor Sniper', 'Rug Puller', 'Chart Wiz',
  'Vibe Check', 'No Chill', 'NGMI Steve', 'WAGMI Bro',
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
