// Mood tag system for the Wojak name randomizer.
// Maps every trait value to 1-3 mood tags, then resolves a primary + secondary
// mood from a full set of equipped traits using tier-weighted scoring.

export const MOOD_TAGS = [
  'aggressive',
  'rebellious',
  'degen',
  'chill',
  'goofy',
  'elite',
  'dark',
  'mystical',
  'warrior',
  'cosmic',
  'wholesome',
  'nerdy',
  'chaotic',
  'spooky',
  'party',
  'grinder',
] as const;

export type MoodTag = (typeof MOOD_TAGS)[number];

export interface MoodResult {
  primary: MoodTag;
  secondary: MoodTag;
  scores: Record<MoodTag, number>;
}

/** Weight multiplier per trait category. Higher = more influence on mood. */
export const TIER_WEIGHTS: Record<string, number> = {
  Clothes: 3,
  Extras: 3,
  Head: 2,
  'Face Wear': 2,
  Face: 2,
  Mouth: 1,
  Background: 1,
};

/** Maps every trait value to 1-3 mood tags. */
export const TRAIT_MOODS: Record<string, MoodTag[]> = {
  // ── Face (Expression) ──
  Classic: ['chill', 'degen'],
  Rekt: ['dark', 'degen'],
  Rugged: ['grinder', 'warrior'],
  'Bleeding Bags': ['dark', 'degen'],
  Terminator: ['aggressive', 'dark'],
  NPC: ['goofy', 'nerdy'],

  // ── Head ──
  'Beer Hat': ['party', 'rebellious'],
  Crown: ['elite', 'warrior'],
  'Wizard Hat': ['mystical', 'dark'],
  'Devil Horns': ['dark', 'chaotic'],
  'Tin Foil Hat': ['nerdy', 'chaotic'],
  'Military Beret': ['warrior', 'grinder'],
  'Propeller Hat': ['goofy', 'nerdy'],
  Clown: ['goofy', 'chaotic'],
  'Viking Helmet': ['warrior', 'aggressive'],
  'Cowboy Hat': ['rebellious', 'chill'],
  Centurion: ['warrior', 'elite'],
  'Comrade Hat': ['rebellious', 'chaotic'],
  'Construction Helmet': ['grinder', 'wholesome'],
  Fedora: ['nerdy', 'dark'],
  'Field Cap': ['warrior', 'grinder'],
  'Firefighter Helmet': ['wholesome', 'warrior'],
  'Hard Hat': ['grinder', 'wholesome'],
  Headphones: ['chill', 'nerdy'],
  Cap: ['chill', 'degen'],
  'Pirate Hat': ['rebellious', 'chaotic'],
  'Ronin Helmet': ['warrior', 'dark'],
  'Standard Cut': ['chill', 'degen'],
  'Super Wojak Hat': ['goofy', 'cosmic'],
  'Super Saiyan': ['aggressive', 'cosmic'],
  'SWAT Helmet': ['warrior', 'aggressive'],
  'Trump Wave': ['elite', 'chaotic'],
  'Piccolo Turban': ['mystical', 'warrior'],
  Beanie: ['chill', 'degen'],
  '2Pac Bandana': ['rebellious', 'grinder'],
  Spikes: ['rebellious', 'aggressive'],

  // ── Face Wear ──
  'Laser Eyes': ['aggressive', 'cosmic', 'degen'],
  '3D Glasses': ['nerdy', 'goofy'],
  'Alpha Shades': ['elite', 'degen'],
  Aviators: ['chill', 'elite'],
  'Cool Glasses': ['chill', 'party'],
  'Cyber Shades': ['nerdy', 'cosmic'],
  'Eye Patch': ['dark', 'warrior'],
  'Matrix Lenses': ['nerdy', 'dark'],
  'MOG Glasses': ['degen', 'goofy'],
  'Ninja Turtle Mask': ['goofy', 'warrior'],
  Shades: ['chill', 'elite'],
  'Tyson Tattoo': ['aggressive', 'rebellious'],
  'Wizard Glasses': ['mystical', 'nerdy'],
  'Night Vision': ['warrior', 'grinder'],
  'VR Headset': ['nerdy', 'cosmic'],
  'Fake It Mask': ['dark', 'spooky'],
  'MedievalBepe Cowboy': ['rebellious', 'goofy'],
  'MedievalBepe Emo': ['dark', 'chaotic'],
  'MedievalBepe Wizard': ['mystical', 'goofy'],
  'Tanginium King': ['elite', 'wholesome'],
  'Tanginium Sad': ['dark', 'wholesome'],

  // ── Mouth ──
  Numb: ['chill', 'dark'],
  Smile: ['chill', 'wholesome'],
  Screaming: ['aggressive', 'chaotic'],
  Teeth: ['aggressive', 'goofy'],
  'Gold Teeth': ['elite', 'degen'],
  Pizza: ['party', 'goofy'],
  Stunned: ['chaotic', 'degen'],
  'Sexy Lip Bite': ['party', 'goofy'],
  'Glossed Lips': ['party', 'elite'],
  Cig: ['rebellious', 'grinder'],
  Cohiba: ['elite', 'chill'],
  Joint: ['chill', 'party'],
  Pipe: ['nerdy', 'chill'],
  'Bubble Gum': ['goofy', 'chill'],
  'Bandana Mask': ['rebellious', 'warrior'],
  'Hannibal Mask': ['dark', 'spooky'],
  'Copium Mask': ['degen', 'chaotic'],
  Neckbeard: ['nerdy', 'degen'],
  Stache: ['grinder', 'elite'],

  // ── Clothes ──
  Astronaut: ['cosmic', 'grinder'],
  Bathrobe: ['chill', 'degen'],
  'Bepe Army': ['warrior', 'wholesome'],
  'Bepe Suit': ['elite', 'wholesome'],
  'Born to Ride': ['rebellious', 'aggressive'],
  'Chia Farmer': ['wholesome', 'grinder'],
  Drac: ['dark', 'spooky'],
  'El Presidente': ['elite', 'warrior'],
  'Firefighter Uniform': ['wholesome', 'warrior'],
  "God's Robe": ['mystical', 'elite'],
  'Goose Suit': ['goofy', 'chaotic'],
  'Gopher Suit': ['goofy', 'nerdy'],
  'Leather Jacket': ['rebellious', 'dark'],
  'Ninja Turtle Fit': ['goofy', 'warrior'],
  'Pepe Suit': ['goofy', 'degen'],
  'Pickle Suit': ['goofy', 'chaotic'],
  'Proof of Prayer': ['wholesome', 'mystical'],
  'Roman Drip': ['warrior', 'elite'],
  Ronin: ['warrior', 'dark'],
  'Sonic Suit': ['goofy', 'grinder'],
  'Sports Jacket': ['elite', 'chill'],
  Straitjacket: ['chaotic', 'dark'],
  Suit: ['elite', 'grinder'],
  'Super Saiyan Uniform': ['aggressive', 'cosmic'],
  'SWAT Gear': ['warrior', 'aggressive'],
  'Tank Top': ['chill', 'aggressive'],
  Tee: ['chill', 'degen'],
  Topless: ['chill', 'rebellious'],
  'Viking Armor': ['warrior', 'aggressive'],
  'Wizard Drip': ['mystical', 'dark'],

  // ── Extras ──
  'GFY Right': ['rebellious', 'aggressive'],
  'GFY Left': ['rebellious', 'aggressive'],
  Diamond: ['elite', 'degen'],
  Handgun: ['aggressive', 'dark'],
  Orange: ['wholesome', 'party'],
  TangTalk: ['nerdy', 'wholesome'],
  Coffee: ['grinder', 'chill'],
  Goose: ['goofy', 'chaotic'],
  Seedling: ['wholesome', 'grinder'],
  Wings: ['cosmic', 'mystical'],

  // ── Backgrounds (scene) ──
  Hell: ['dark', 'spooky'],
  Moon: ['cosmic', 'degen'],
  Casino: ['degen', 'party'],
  'Wizard Tower': ['mystical', 'dark'],
  Matrix: ['nerdy', 'dark'],
  'Moms Basement': ['nerdy', 'degen'],
  'NYSE Pump': ['elite', 'degen'],
  'NYSE Dump': ['dark', 'degen'],
  'NYSE Rug': ['chaotic', 'degen'],
  'Chia Farm': ['wholesome', 'grinder'],
  'Orange Grove': ['wholesome', 'party'],
  'Bepe Barracks': ['warrior', 'wholesome'],
  'Ronin Dojo': ['warrior', 'dark'],
  'Space Station': ['cosmic', 'nerdy'],
  'White House': ['elite', 'chaotic'],
  'Spell Room': ['mystical', 'dark'],
  'Nesting Grounds': ['wholesome', 'chill'],
  'Route 66': ['rebellious', 'chill'],
  'Silicon Data Center': ['nerdy', 'grinder'],
  'One Market': ['elite', 'grinder'],
  'Padded Cell': ['chaotic', 'dark'],
  Circus: ['goofy', 'chaotic'],
  Bunker: ['warrior', 'dark'],
  'Home Office': ['grinder', 'chill'],
  Swamp: ['dark', 'goofy'],
  Tavern: ['party', 'chill'],
  Vaporwave: ['chill', 'cosmic'],
  'Viking Ship': ['warrior', 'aggressive'],
  Volcano: ['aggressive', 'dark'],
};

/**
 * Resolve the primary and secondary mood tags from a set of equipped traits.
 *
 * Algorithm:
 * 1. Init scores with 0 for every mood tag
 * 2. For each trait, look up tier weight (default 1)
 * 3. Handle Extras comma-separated values by splitting on ", "
 * 4. For each trait value, look up mood tags and add weight to each
 * 5. Sort by score desc, alphabetical tiebreaker
 * 6. If no matches, default to chill/degen
 * 7. primary = top, secondary = next different tag
 */
export function resolveMoods(
  traits: { trait_type: string; value: string }[],
): MoodResult {
  // 1. Init scores
  const scores = {} as Record<MoodTag, number>;
  for (const tag of MOOD_TAGS) {
    scores[tag] = 0;
  }

  // 2-4. Tally weighted scores
  for (const trait of traits) {
    const weight = TIER_WEIGHTS[trait.trait_type] ?? 1;

    // Handle Extras comma-separated values
    const values =
      trait.trait_type === 'Extras'
        ? trait.value.split(', ')
        : [trait.value];

    for (const val of values) {
      const moods = TRAIT_MOODS[val];
      if (moods) {
        for (const mood of moods) {
          scores[mood] += weight;
        }
      }
    }
  }

  // 5. Sort by score desc, alphabetical tiebreaker
  const sorted = [...MOOD_TAGS].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return a.localeCompare(b);
  });

  // 6. Check if total score is 0
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
  if (totalScore === 0) {
    return { primary: 'chill', secondary: 'degen', scores };
  }

  // 7. primary = top, secondary = next different
  const primary = sorted[0];
  const secondary = sorted.find((tag) => tag !== primary) ?? sorted[1];

  return { primary, secondary, scores };
}
