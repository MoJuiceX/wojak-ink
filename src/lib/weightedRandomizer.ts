/**
 * Weighted Randomizer for Wojak Generator
 *
 * Uses pre-computed frequencies from NFT collection metadata to select traits
 * with approximate rarity weights. Builds compact weighted arrays once on load
 * for efficient O(1) random selection.
 */

// Pre-computed frequencies from NFT collection metadata analysis
// Values of 0 are set to 1 to ensure all traits have a chance to appear
const frequencies: Record<string, Record<string, number>> = {
  Base: {
    Classic: 2080,
    Rekt: 654,
    Rugged: 413,
    Bleeding: 1,
    Terminator: 435,
  },
  Clothes: {
    'Tank Top Blue': 1,
    'Tank Top Orange': 1,
    'Tank Top Red': 1,
    'Tank Top Neon Green': 1,
    'Tee Blue': 1,
    'Tee Orange': 1,
    'Tee Red': 1,
    Topless: 271,
    'Topless Blue': 1,
    'Leather Jacket': 199,
    'Bathrobe Black': 1,
    'Bathrobe Blue': 1,
    'Bathrobe Red': 1,
    'Sports Jacket Blue': 1,
    'Sports Jacket Green': 1,
    'Sports Jacket Orange': 1,
    'Sports Jacket Red': 1,
    'Suit Black Blue Tie': 1,
    'Suit Black Pink Tie': 1,
    'Suit Black Red Bow': 1,
    'Suit Black Red Tie': 1,
    'Suit Black Yellow Bow': 1,
    'Suit Orange Blue Tie': 1,
    'Suit Orange Pink Tie': 1,
    'Suit Orange Red Bow': 1,
    'Suit Orange Red Tie': 1,
    'Suit Orange Yellow Bow': 1,
    Astronaut: 44,
    'Born to Ride': 205,
    'Firefighter Uniform': 93,
    'Roman Drip': 194,
    Ronin: 168,
    Straitjacket: 86,
    'Viking Armor': 129,
    'Bepe Army': 208,
    'Military Jacket': 1,
    'SWAT Gear': 127,
    'Super Saiyan': 1,
    "God's Robe": 80,
    'Wizard Drip Blue': 1,
    'Wizard Drip Orange': 1,
    'Wizard Drip Pink': 1,
    'Wizard Drip Purple': 1,
    'Wizard Drip Red': 1,
  },
  Eyes: {
    '3D Glasses': 164,
    'Alpha Shades Blue': 1,
    'Alpha Shades Pink': 1,
    'Alpha Shades Red': 1,
    Aviators: 194,
    'Cool Glasses': 161,
    'Cyber Shades Black': 1,
    'Cyber Shades Purple': 1,
    'Eye Patch': 122,
    'Laser Eyes Green': 1,
    'Laser Eyes Red': 1,
    'MOG Glasses': 302,
    'Matrix Lenses Red': 1,
    'Ninja Turtle Mask': 143,
    'Shades Blue': 1,
    'Shades Neon Green': 1,
    'Shades Red': 1,
    'Tyson Tattoo': 97,
    'Wizard Glasses': 145,
  },
  Head: {
    Beanie: 69,
    'Cap Blue': 1,
    'Cap Green': 1,
    'Cap Orange': 1,
    Centurion: 132,
    'Cowboy Hat': 88,
    Crown: 140,
    'Fedora Brown': 1,
    'Fedora Orange': 1,
    'Fedora Purple': 1,
    'Field Cap': 126,
    'Hard Hat': 94,
    'Military Beret': 164,
    'Pirate Hat': 99,
    'Propeller Hat': 137,
    'Tin Foil Hat': 117,
    'Construction Helmet': 140,
    'Firefighter Helmet': 108,
    'Ronin Helmet': 129,
    'SWAT Helmet': 124,
    'Viking Helmet': 135,
    '2Pac Bandana Pink': 1,
    '2Pac Bandana Red': 1,
    Clown: 143,
    'Comrade Cap': 1,
    'Devil Horns': 91,
    Headphones: 13,
    'Piccolo Turban': 9,
    'Super Mario Green': 1,
    'Super Mario Purple': 1,
    'Super Mario Red': 1,
    'Super Saiyan': 195,
    'Trump Wave': 78,
    'Wizard Hat': 248,
    'Wizard Hat Blue': 1,
    'Wizard Hat Green': 1,
    'Wizard Hat Pink': 1,
    'Wizard Hat Purple': 1,
    'Wizard Hat Red': 1,
    'Standard Cut Blond': 1,
    'Standard Cut Brown': 1,
    'Anarchy Spikes Pink': 1,
    'Anarchy Spikes Red': 1,
  },
  Mask: {
    'Bandana Mask': 1,
    'Hannibal Mask': 1,
    'Copium Mask': 1,
    'Skull Mask': 1,
  },
  MouthBase: {
    Numb: 490,
    Smile: 179,
    Screaming: 348,
    Teeth: 248,
    'Gold Teeth': 275,
    Pizza: 220,
    Pipe: 183,
    'Bubble Gum': 187,
  },
  MouthItem: {
    Cigarette: 1,
    Cohiba: 302,
    Joint: 303,
  },
  FacialHair: {
    Neckbeard: 184,
    Stache: 138,
  },
  Background: {
    $BEPE: 82,
    $CASTER: 43,
    $CHIA: 219,
    $HOA: 133,
    $HONK: 38,
    $LOVE: 90,
    $NECKCOIN: 49,
    $PIZZA: 51,
    'Chia Green': 232,
    'Golden Hour': 87,
    'Green Candle': 192,
    'Hot Coral': 94,
    'Mellow Yellow': 127,
    'Neo Mint': 176,
    'Radioactive Forest': 114,
    'Sky Dive': 206,
    'Sky Shock Blue': 205,
    'Tangerine Pop': 148,
    'Bepe Barracks': 145,
    'Chia Farm': 87,
    Hell: 113,
    Matrix: 107,
    "Mom's Basement": 1,
    Moon: 148,
    'Nesting Grounds': 54,
    'NYSE Dump': 63,
    'NYSE Pump': 75,
    'One Market': 79,
    'Orange Grove': 140,
    'Ronin Dojo': 45,
    'Route 66': 73,
    'Silicon.net Data Center': 1,
    'Spell Room': 59,
    'White House': 45,
  },
};

// Scale factor to reduce array size while maintaining proportions
const SCALE_DIVISOR = 10;

// Weighted arrays built once on module load
const weightedArrays: Record<string, string[]> = {};

/**
 * Build weighted arrays for all categories
 * Each trait is repeated proportionally to its frequency (scaled down)
 * This allows O(1) random selection by picking random array index
 */
function buildWeightedArrays(): void {
  for (const [category, traits] of Object.entries(frequencies)) {
    const weighted: string[] = [];

    for (const [trait, count] of Object.entries(traits)) {
      // Scale down but ensure at least 1 entry per trait
      const scaledCount = Math.max(1, Math.round(count / SCALE_DIVISOR));
      for (let i = 0; i < scaledCount; i++) {
        weighted.push(trait);
      }
    }

    weightedArrays[category] = weighted;
  }
}

// Build arrays immediately on module load
buildWeightedArrays();

/**
 * Get a weighted random trait for a category
 * Falls back to uniform random if category not found
 */
export function getWeightedRandomTrait(category: string): string | null {
  const weighted = weightedArrays[category];
  if (!weighted || weighted.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * weighted.length);
  return weighted[randomIndex];
}

/**
 * Check if a category has weighted frequencies defined
 */
export function hasWeightedFrequencies(category: string): boolean {
  return category in weightedArrays && weightedArrays[category].length > 0;
}

/**
 * Get all trait names for a category (for fallback/debugging)
 */
export function getTraitNames(category: string): string[] {
  const freqs = frequencies[category];
  return freqs ? Object.keys(freqs) : [];
}

/**
 * Get the frequency weight for a specific trait (for UI display if needed)
 */
export function getTraitWeight(category: string, trait: string): number {
  return frequencies[category]?.[trait] ?? 1;
}

/**
 * Add a new trait to the frequencies (for dynamically added traits)
 * Rebuilds the weighted array for that category
 */
export function addTrait(category: string, trait: string, weight = 1): void {
  if (!frequencies[category]) {
    frequencies[category] = {};
  }
  frequencies[category][trait] = weight;

  // Rebuild weighted array for this category
  const weighted: string[] = [];
  for (const [t, count] of Object.entries(frequencies[category])) {
    const scaledCount = Math.max(1, Math.round(count / SCALE_DIVISOR));
    for (let i = 0; i < scaledCount; i++) {
      weighted.push(t);
    }
  }
  weightedArrays[category] = weighted;
}

/**
 * Normalize a trait name for matching
 * Handles common variations in naming conventions
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the best matching trait name in frequencies for a given display name
 * Returns the original frequency key if found, null otherwise
 */
export function findMatchingTrait(
  category: string,
  displayName: string
): string | null {
  const freqs = frequencies[category];
  if (!freqs) return null;

  const normalizedInput = normalizeName(displayName);

  // Exact match first
  for (const trait of Object.keys(freqs)) {
    if (normalizeName(trait) === normalizedInput) {
      return trait;
    }
  }

  // Partial match (input contains trait or vice versa)
  for (const trait of Object.keys(freqs)) {
    const normalizedTrait = normalizeName(trait);
    if (
      normalizedInput.includes(normalizedTrait) ||
      normalizedTrait.includes(normalizedInput)
    ) {
      return trait;
    }
  }

  return null;
}

// Export frequencies for debugging/inspection
export { frequencies };
