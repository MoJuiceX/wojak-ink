/**
 * Clothing-Aware Name Themes
 *
 * Each clothing type maps to a theme. Each theme has prefixes, suffixes,
 * and hand-crafted full names — all ≤15 characters, all crypto/wojak/degen culture.
 *
 * Combo math: ~18 prefixes × ~18 suffixes = ~324 combos + ~25 full names = ~350 per theme.
 */

// ── Theme Definition ──

export interface NameTheme {
  prefixes: string[];
  suffixes: string[];
  fullNames: string[];
  /** Example name for placeholder hint */
  hint: string;
}

// ── Clothing → Theme Mapping ──

export const CLOTHING_TO_THEME: Record<string, string> = {
  // Military / Tactical
  'Bepe Army': 'military',
  'SWAT Gear': 'military',
  'El Presidente': 'military',
  'Born to Ride': 'military',

  // Space / Sci-Fi
  'Astronaut': 'space',
  'Super Saiyan Uniform': 'space',

  // Fantasy / Magic
  'Wizard Drip': 'fantasy',
  "God's Robe": 'fantasy',
  'Roman Drip': 'fantasy',
  'Ronin': 'fantasy',
  'Viking Armor': 'fantasy',

  // Formal / Business
  'Suit': 'formal',
  'Sports Jacket': 'formal',
  'Bepe Suit': 'formal',

  // Casual / Everyday
  'Tee': 'casual',
  'Tank Top': 'casual',
  'Topless': 'casual',
  'Bathrobe': 'casual',
  'Leather Jacket': 'casual',

  // Costume / Fun
  'Goose Suit': 'costume',
  'Gopher Suit': 'costume',
  'Pepe Suit': 'costume',
  'Sonic Suit': 'costume',
  'Pickle Suit': 'costume',
  'Ninja Turtle Fit': 'costume',
  'Drac': 'costume',
  'Straitjacket': 'costume',

  // Service / Community
  'Firefighter Uniform': 'service',
  'Chia Farmer': 'service',
  'Proof of Prayer': 'service',
};

// ── Theme Pools ──

export const NAME_THEMES: Record<string, NameTheme> = {
  military: {
    hint: 'e.g. Sgt Degen',
    prefixes: [
      'Sgt', 'Cpt', 'Major', 'Pvt', 'Grunt', 'Recon', 'Bravo', 'Tango',
      'Sniper', 'Stealth', 'Warlord', 'Gunner', 'Tank', 'Iron', 'Colonel',
      'Delta', 'Hawk', 'Foxhound',
    ],
    suffixes: [
      'Squad', 'Ops', 'Force', 'Elite', 'Fren', 'Six', 'Chief', 'Arms',
      'Unit', 'Zero', 'Chad', 'Degen', 'Mode', 'Alpha', 'King', 'Actual',
      'Dog', 'Ape',
    ],
    fullNames: [
      'Sgt Degen', 'Pvt HODL', 'Tank Chad', 'Delta Fren',
      'Bravo Six', 'War Ape', 'Shell Shocked', 'Trench Fren',
      'Iron Hands', 'Stealth Whale', 'Grunt Mode', 'Colonel Rekt',
      'Recon Degen', 'Cpt Diamond', 'Tango Down', 'Foxhound OG',
      'Major Bags', 'Boot Camp', 'Gunner Chad', 'Sniper Vibes',
      'Warlord HODL', 'Pvt Paperhands', 'Delta Ape', 'Iron Fist',
      'Hawk Eye',
    ],
  },

  space: {
    hint: 'e.g. Astro Degen',
    prefixes: [
      'Astro', 'Cosmo', 'Lunar', 'Solar', 'Nebula', 'Orbit', 'Star',
      'Nova', 'Galaxy', 'Rocket', 'Void', 'Neutron', 'Plasma', 'Comet',
      'Cosmic', 'Zero G', 'Mars', 'Pulsar',
    ],
    suffixes: [
      'Pilot', 'Cadet', 'Degen', 'Walker', 'Fren', 'Chad', 'Naut',
      'Rider', 'Born', 'Bound', 'Core', 'Mode', 'Sage', 'Ape', 'King',
      'Base', 'Force', 'OG',
    ],
    fullNames: [
      'Moon Boy', 'Astro Degen', 'Zero G Chad', 'Star Fren',
      'Void Pilot', 'Lunar Ape', 'Orbit Sage', 'Cosmo HODL',
      'Rocket Fren', 'Solar Flare', 'Nebula King', 'Mars Degen',
      'Nova Chad', 'Galaxy Brain', 'Comet Rider', 'Space Cadet',
      'Dark Matter', 'Star Born', 'Pulsar OG', 'Plasma Hands',
      'Orbit Mode', 'Cosmic Whale', 'Neutron Star', 'Rocket Ape',
      'Moon Soon',
    ],
  },

  fantasy: {
    hint: 'e.g. Arcane Chad',
    prefixes: [
      'Arcane', 'Mystic', 'Elder', 'Dark', 'Shadow', 'Storm', 'Rune',
      'Crystal', 'Frost', 'Flame', 'Void', 'Iron', 'Dragon', 'Savage',
      'Noble', 'Ancient', 'Chaos', 'Blood',
    ],
    suffixes: [
      'Wizard', 'Knight', 'Lord', 'Sage', 'King', 'Monk', 'Slayer',
      'Walker', 'Blade', 'Fang', 'Eye', 'Born', 'Fren', 'Chad',
      'Bane', 'Guard', 'Master', 'OG',
    ],
    fullNames: [
      'Arcane Chad', 'Dark Wizard', 'Rune Master', 'Void Walker',
      'Dragon Born', 'Shadow King', 'Frost Sage', 'Iron Knight',
      'Crystal Fren', 'Storm Lord', 'Flame Blade', 'Elder Monk',
      'Chaos Mage', 'Noble Degen', 'Savage Fang', 'Blood Moon',
      'Mystic Ape', 'Rune Degen', 'Dark Lord', 'Dragon Slayer',
      'Shadow Fren', 'Ancient OG', 'Frost Giant', 'Storm Born',
      'Void King',
    ],
  },

  formal: {
    hint: 'e.g. Wolf of Wall',
    prefixes: [
      'CEO', 'Boss', 'Chief', 'Don', 'Baron', 'Duke', 'Big', 'Top',
      'Wolf', 'Bull', 'Shark', 'Hedge', 'Whale', 'Alpha', 'Elite',
      'Grand', 'Royal', 'Prime',
    ],
    suffixes: [
      'Fund', 'Gang', 'Money', 'Bags', 'Stack', 'Pump', 'Chad',
      'King', 'Mode', 'Club', 'Maxi', 'Mogul', 'OG', 'Fren',
      'Class', 'Degen', 'Suite', 'Trader',
    ],
    fullNames: [
      'Wolf of Wall', 'CEO of Bags', 'Don Degen', 'Bull Chad',
      'Whale Alert', 'Shark Mode', 'Big Money', 'Top Trader',
      'Alpha Fund', 'Duke Degen', 'Boss Fren', 'Chief Maxi',
      'Baron Bags', 'Elite Club', 'Grand Pump', 'Royal Flush',
      'Hedge Lord', 'Bull Market', 'Bear Trap', 'Pump King',
      'Stack Sats', 'Prime Degen', 'Suit Chad', 'Money Mode',
      'Profit King',
    ],
  },

  casual: {
    hint: 'e.g. Chill Degen',
    prefixes: [
      'Chill', 'Lazy', 'Comfy', 'Based', 'Vibes', 'Easy', 'Smooth',
      'Sleepy', 'Mellow', 'Cool', 'Cozy', 'Warm', 'Zen', 'Bliss',
      'Soft', 'Fresh', 'Lucky', 'Pure',
    ],
    suffixes: [
      'Fren', 'Degen', 'Mode', 'Vibes', 'Gang', 'Life', 'Chad',
      'King', 'OG', 'Ape', 'Maxi', 'Brain', 'Soul', 'Guy',
      'Bro', 'Fam', 'Sage', 'Zone',
    ],
    fullNames: [
      'Chill Degen', 'Comfy Fren', 'Based Chad', 'Vibe Check',
      'Lazy Ape', 'Touch Grass', 'Easy Mode', 'Smooth Brain',
      'Zen Degen', 'Cozy Fren', 'Mellow OG', 'Fresh Vibes',
      'Cool Guy', 'Sleepy Chad', 'Bliss Mode', 'Lucky Degen',
      'Pure Vibes', 'Warm Fren', 'Comfy Zone', 'Soft Hands',
      'Chill Gang', 'Based Bro', 'Easy Fren', 'Smooth Ape',
      'Feels Good',
    ],
  },

  costume: {
    hint: 'e.g. Chaos Goblin',
    prefixes: [
      'Chaos', 'Turbo', 'Mega', 'Ultra', 'Hyper', 'Wild', 'Cursed',
      'Sneaky', 'Weird', 'Toxic', 'Cringe', 'Clown', 'Meme', 'Rare',
      'Epic', 'Giga', 'Super', 'Wacky',
    ],
    suffixes: [
      'Goblin', 'Fren', 'Lord', 'Degen', 'Mode', 'Chad', 'Brain',
      'Hands', 'King', 'Gang', 'Ape', 'NPC', 'Vibes', 'OG',
      'Beast', 'Fiend', 'Maniac', 'Sage',
    ],
    fullNames: [
      'Chaos Goblin', 'Turbo Degen', 'Mega Brain', 'Ultra Rare',
      'Hyper Chad', 'Clown World', 'Meme Lord', 'Wild Card',
      'Cursed Hands', 'Sneaky Fren', 'Toxic King', 'Epic Fail',
      'Giga Chad', 'NPC Brain', 'Cringe Lord', 'Super Degen',
      'Weird Flex', 'Wacky Ape', 'Chaos Mode', 'Rare Pepe',
      'Turbo Ape', 'Wild Fren', 'Mega Degen', 'Ultra Vibes',
      'This Is Fine',
    ],
  },

  service: {
    hint: 'e.g. Chief Sower',
    prefixes: [
      'Chief', 'Noble', 'Brave', 'True', 'Farm', 'Seed', 'Saint',
      'Guard', 'Hero', 'Humble', 'Honest', 'Sworn', 'Blessed', 'Sacred',
      'Strong', 'Good', 'Captain', 'Steady',
    ],
    suffixes: [
      'Hands', 'Fren', 'Soul', 'Heart', 'Guard', 'Sower', 'Seed',
      'Faith', 'Hope', 'Chad', 'King', 'Degen', 'OG', 'Mode',
      'Duty', 'Crew', 'Guild', 'Force',
    ],
    fullNames: [
      'Chief Sower', 'Farm Degen', 'Seed Lord', 'Noble Fren',
      'Brave Heart', 'True Hands', 'Hero Mode', 'Saint HODL',
      'Guard Duty', 'Humble Chad', 'Sacred Ape', 'Blessed Fren',
      'Strong Hands', 'Good Vibes', 'Honest OG', 'Sworn Degen',
      'Farm Chad', 'Seed Fren', 'Captain Good', 'Steady Hands',
      'Noble Heart', 'Brave Degen', 'True Fren', 'Hero King',
      'Chia Farmer',
    ],
  },

  generic: {
    hint: 'e.g. Diamond Hands',
    prefixes: [
      'Tang', 'Honk', 'Bepe', 'Pulp', 'Citrus', 'Zesty', 'Tangy',
      'Orange', 'Degen', 'Diamond', 'Laser', 'HODL', 'Rekt', 'Wagmi',
      'Whale', 'Based', 'Sigma', 'Alpha',
    ],
    suffixes: [
      'Maxi', 'Lord', 'King', 'OG', 'Fren', 'Sage', 'Wizard',
      'Knight', 'Chad', 'Hands', 'Eyes', 'Pilled', 'Gang', 'Brain',
      'Mode', 'Vibes', 'Ape', 'Master',
    ],
    fullNames: [
      'Winners Win', 'Orange Maxi', 'Honk Pilled', 'Tang Lord',
      'Pulp Gang', 'Bepe Maxi', 'Zesty Chad', 'Citrus King',
      'Juice Wizard', 'Feels Good', 'This Is Fine', 'Doomer Mode',
      'Gigachad OG', 'Big Brain', 'Clown World', 'Touch Grass',
      'Diamond Hands', 'Paper Hands', 'Laser Eyes', 'Wagmi Fren',
      'Rekt Again', 'Degen Lord', 'Whale Alert', 'Moon Soon',
      'Void Walker',
    ],
  },
};

// ── Helpers ──

/** Get the theme key for a clothing display name */
export function getThemeForClothing(clothingName: string): string {
  return CLOTHING_TO_THEME[clothingName] || 'generic';
}

/** Get a theme's pools */
export function getNameTheme(clothingName?: string): NameTheme {
  if (!clothingName) return NAME_THEMES.generic;
  const themeKey = getThemeForClothing(clothingName);
  return NAME_THEMES[themeKey] || NAME_THEMES.generic;
}
