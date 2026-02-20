/**
 * Trait Name Map — Definitive lookup for NFT metadata trait values
 *
 * Maps generator file identifiers (lowercase) to their correct Phase 1 display names.
 * Source of truth: Wojak_Farmers_Plot metadata (4200 NFTs, 7 trait_types, 179 unique values).
 *
 * Key derivation:
 *   G1 files  — strip path, extension, ALL-CAPS prefix, replace -/_ with spaces, lowercase
 *   G2 traits — strip category prefix, replace -/_ with spaces, lowercase
 *
 * Color variants all map to the base Phase 1 name (e.g. "alpha shades blue" → "Alpha Shades").
 *
 * IMPORTANT: When `super saiyan` appears as a Clothes trait, it should be
 * "Super Saiyan Uniform". The map returns "Super Saiyan" (the Head value)
 * because both layers share the same key. MetadataPreview handles this
 * via LAYER_OVERRIDES.
 */

export const TRAIT_NAME_MAP: Record<string, string> = {

  // === Face (Base layer files → "Face" trait_type in Phase 1) ===
  'classic': 'Classic',
  'rekt': 'Rekt',
  'rugged': 'Rugged',
  'bleeding bags': 'Bleeding Bags',
  'terminator': 'Terminator',
  'npc': 'NPC',

  // === Face Wear (EYE + Mask layers → "Face Wear" trait_type in Phase 1) ===
  '3d glasses': '3D Glasses',
  '3d glases': '3D Glasses',               // G2 typo
  'alpha shades': 'Alpha Shades',
  'alpha shades blue': 'Alpha Shades',
  'alpha shades pink': 'Alpha Shades',
  'alpha shades red': 'Alpha Shades',
  'aviators': 'Aviators',
  'cool glasses': 'Cool Glasses',
  'cyber shades': 'Cyber Shades',
  'cyber shades black': 'Cyber Shades',
  'cyber shades purple': 'Cyber Shades',
  'eye patch': 'Eye Patch',
  'laser eyes': 'Laser Eyes',
  'laser eyes green': 'Laser Eyes',
  'laser eyes red': 'Laser Eyes',
  'matrix lenses': 'Matrix Lenses',
  'matrix lenses red': 'Matrix Lenses',
  'mog glasses': 'MOG Glasses',
  'ninja turtle mask': 'Ninja Turtle Mask',
  'shades': 'Shades',
  'shades blue': 'Shades',
  'shades neon green': 'Shades',
  'shades red': 'Shades',
  'tyson tattoo': 'Tyson Tattoo',
  'wizard glasses': 'Wizard Glasses',
  'wizard glasses new': 'Wizard Glasses',
  'night vision': 'Night Vision',
  'vr headset': 'VR Headset',

  // === Mouth (MOUTH + EXTRA_MOUTH + FacialHair → "Mouth" trait_type in Phase 1) ===
  'numb': 'Numb',
  'smile': 'Smile',
  'screeming': 'Screaming',                // G1 typo
  'screaming': 'Screaming',
  'teeth': 'Teeth',
  'gold teeth': 'Gold Teeth',
  'pizza': 'Pizza',
  'pipe': 'Pipe',
  'pipe when rekt': 'Pipe',                  // G1 rekt-variant file
  'bubble gum': 'Bubble Gum',
  'bubble gum rekt': 'Bubble Gum',
  'bubblegum': 'Bubble Gum',               // G2 no-space variant
  'cig': 'Cig',
  'cohiba': 'Cohiba',
  'joint': 'Joint',
  'bandana mask': 'Bandana Mask',
  'hannibal mask': 'Hannibal Mask',
  'copium mask': 'Copium Mask',
  'neckbeard': 'Neckbeard',
  'stach': 'Stache',                       // G1 typo
  'stache': 'Stache',

  // === Head (HEAD layer → "Head" trait_type in Phase 1) ===
  '2pac bandana': '2Pac Bandana',
  '2pac bandana pink': '2Pac Bandana',
  '2pac bandana red': '2Pac Bandana',
  'anarchy spikes': 'Spikes',
  'anarchy spikes pink': 'Spikes',
  'anarchy spikes red': 'Spikes',
  'spikes': 'Spikes',
  'beanie': 'Beanie',
  'beer hat': 'Beer Hat',
  'cap': 'Cap',
  'cap blue': 'Cap',
  'cap green': 'Cap',
  'cap mcd': 'Cap',
  'cap orange': 'Cap',
  'centurion': 'Centurion',
  'centurion mask': 'Centurion',
  'clown': 'Clown',
  'comrade cap': 'Comrade Hat',
  'comrad hat': 'Comrade Hat',              // G2 typo
  'comrade hat': 'Comrade Hat',
  'construction helmet': 'Construction Helmet',
  'cowboy hat': 'Cowboy Hat',
  'cowboy hat brown': 'Cowboy Hat',
  'crown': 'Crown',
  'devil horns': 'Devil Horns',
  'fedora': 'Fedora',
  'fedora brown': 'Fedora',
  'fedora orange': 'Fedora',
  'fedora purple': 'Fedora',
  'field cap': 'Field Cap',
  'firefigther helmet': 'Firefighter Helmet', // G1 typo
  'firefighter helmet': 'Firefighter Helmet',
  'hard hat': 'Hard Hat',
  'headphones': 'Headphones',
  'military beret': 'Military Beret',
  'piccolo hat': 'Piccolo Turban',
  'piccolo turban': 'Piccolo Turban',
  'pirate hat': 'Pirate Hat',
  'propeller hat': 'Propeller Hat',
  'ronin helmet': 'Ronin Helmet',
  'standard cut': 'Standard Cut',
  'standard cut blond': 'Standard Cut',
  'standard cut brown': 'Standard Cut',
  'super mario': 'Super Wojak Hat',
  'super mario green': 'Super Wojak Hat',
  'super mario purple': 'Super Wojak Hat',
  'super mario red': 'Super Wojak Hat',
  'super wojak': 'Super Wojak Hat',
  'super wojak hat': 'Super Wojak Hat',
  'super saiyan': 'Super Saiyan',           // Head value; Clothes override in MetadataPreview
  'swat helmet': 'SWAT Helmet',
  'tin foil': 'Tin Foil Hat',
  'tin foil hat': 'Tin Foil Hat',
  'trump wave': 'Trump Wave',
  'vikings hat': 'Viking Helmet',
  'viking helmet': 'Viking Helmet',
  'wizard hat': 'Wizard Hat',
  'wizard hat man': 'Wizard Hat',
  'wizard hat man blue': 'Wizard Hat',
  'wizard hat man green': 'Wizard Hat',
  'wizard hat man pink': 'Wizard Hat',
  'wizard hat man purple': 'Wizard Hat',
  'wizard hat man red': 'Wizard Hat',
  'wiz hat': 'Wizard Hat',

  // === Clothes (CLOTHES layer → "Clothes" trait_type in Phase 1) ===
  'astronaut': 'Astronaut',
  'bathrobe': 'Bathrobe',
  'bathrobe black': 'Bathrobe',
  'bathrobe blue': 'Bathrobe',
  'bathrobe red': 'Bathrobe',
  'bepe army': 'Bepe Army',
  'bepe suit': 'Bepe Suit',
  'born to ride': 'Born to Ride',
  'chia farmer': 'Chia Farmer',
  'drac': 'Drac',
  'drac suit': 'Drac',
  'el presidente': 'El Presidente',
  'fire figther': 'Firefighter Uniform',    // G2 typo
  'firefigther uniform': 'Firefighter Uniform', // G1 typo
  'firefighter uniform': 'Firefighter Uniform',
  'god rope': "God's Robe",
  'gods robe': "God's Robe",
  "god's robe": "God's Robe",
  'goose suit': 'Goose Suit',
  'gopher suit': 'Gopher Suit',
  'leather jacket': 'Leather Jacket',
  'military jacket': 'El Presidente',
  'ninja turtle fit': 'Ninja Turtle Fit',
  'pepe suit': 'Pepe Suit',
  'pickle suit': 'Pickle Suit',
  'proof of prayer': 'Proof of Prayer',
  'roman drip': 'Roman Drip',
  'ronin': 'Ronin',
  'sonic suit': 'Sonic Suit',
  'sports jacket': 'Sports Jacket',
  'sports jacket blue': 'Sports Jacket',
  'sports jacket green': 'Sports Jacket',
  'sports jacket orange': 'Sports Jacket',
  'sports jacket red': 'Sports Jacket',
  'straigth jacket': 'Straitjacket',       // G2 typo
  'straitjacket': 'Straitjacket',
  'suit': 'Suit',
  'suit black blue tie': 'Suit',
  'suit black pink tie': 'Suit',
  'suit black red bow': 'Suit',
  'suit black red tie': 'Suit',
  'suit black yellow bow': 'Suit',
  'suit orange blue tie': 'Suit',
  'suit orange pink tie': 'Suit',
  'suit orange red bow': 'Suit',
  'suit orange red tie': 'Suit',
  'suit orange yellow bow': 'Suit',
  'super saiyan uniform': 'Super Saiyan Uniform',
  'swat': 'SWAT Gear',
  'swat gear': 'SWAT Gear',
  'tank top': 'Tank Top',
  'tank top blue': 'Tank Top',
  'tank top neon green': 'Tank Top',
  'tank top orange': 'Tank Top',
  'tank top red': 'Tank Top',
  'tee': 'Tee',
  'tee blue': 'Tee',
  'tee orange': 'Tee',
  'tee red': 'Tee',
  'topless': 'Topless',
  'topless blue': 'Topless',
  'viking armor': 'Viking Armor',
  'wizard drip': 'Wizard Drip',
  'wizard drip blue': 'Wizard Drip',
  'wizard drip orange': 'Wizard Drip',
  'wizard drip pink': 'Wizard Drip',
  'wizard drip purple': 'Wizard Drip',
  'wizard drip red': 'Wizard Drip',

  // === Mask (generator face overlays → all map to Phase 1 "Fake It Mask") ===
  'medievalbepe cowboy': 'Fake It Mask',
  'medievalbepe emo': 'Fake It Mask',
  'medievalbepe wizard': 'Fake It Mask',
  'tanginium king': 'Fake It Mask',
  'tanginium sad': 'Fake It Mask',
  'wojak hand mask': 'Fake It Mask',

  // === Mask skull variants (Mask-skull-01 through Mask-skull-50) ===
  'mask skull 01 hypno': 'Fake It Mask',
  'mask skull 02 mystic': 'Fake It Mask',
  'mask skull 03 frost': 'Fake It Mask',
  'mask skull 04 mayor': 'Fake It Mask',
  'mask skull 05 verdant': 'Fake It Mask',
  'mask skull 06 sorting': 'Fake It Mask',
  'mask skull 07 rally': 'Fake It Mask',
  'mask skull 08 void': 'Fake It Mask',
  'mask skull 09 love': 'Fake It Mask',
  'skull mask love': 'Fake It Mask',
  'mask skull 10 bengal': 'Fake It Mask',
  'mask skull 11 pumpkinl': 'Fake It Mask',
  'mask skull 12 gilded': 'Fake It Mask',
  'mask skull 13 goblin': 'Fake It Mask',
  'mask skull 14 damask': 'Fake It Mask',
  'mask skull 15 zebra': 'Fake It Mask',
  'mask skull 16 eldritch': 'Fake It Mask',
  'mask skull 17 waldo': 'Fake It Mask',
  'mask skull 18 lumos': 'Fake It Mask',
  'mask skull 19 gator': 'Fake It Mask',
  'mask skull 20 mesmerpng': 'Fake It Mask',
  'mask skull 21 arachno': 'Fake It Mask',
  'mask skull 22 the': 'Fake It Mask',
  'mask skull 23 storm': 'Fake It Mask',
  'mask skull 24 inferno': 'Fake It Mask',
  'mask skull 25 scream': 'Fake It Mask',
  'mask skull 26 sandworm': 'Fake It Mask',
  'mask skull 27 voorhees': 'Fake It Mask',
  'mask skull 28 enchanter': 'Fake It Mask',
  'mask skull 29 313': 'Fake It Mask',
  'mask skull 30 magus': 'Fake It Mask',
  'mask skull 31 astro': 'Fake It Mask',
  'mask skull 32 nocturnis': 'Fake It Mask',
  'mask skull 33 ghost': 'Fake It Mask',
  'mask skull 34 et': 'Fake It Mask',
  'mask skull 35 cosmic': 'Fake It Mask',
  'mask skull 36 hedera': 'Fake It Mask',
  'mask skull 37 martian': 'Fake It Mask',
  'mask skull 38 magenta': 'Fake It Mask',
  'mask skull 39 speechless': 'Fake It Mask',
  'mask skull 40 aster': 'Fake It Mask',
  'mask skull 41 static': 'Fake It Mask',
  'mask skull 42 rage': 'Fake It Mask',
  'mask skull 43 gooey': 'Fake It Mask',
  'mask skull 44 tang': 'Fake It Mask',
  'mask skull 45 9mm': 'Fake It Mask',
  'mask skull 46 skelly': 'Fake It Mask',
  'mask skull 47 degen': 'Fake It Mask',
  'mask skull 48 neck': 'Fake It Mask',
  'mask skull 49 crown': 'Fake It Mask',
  'mask skull 50 bepe': 'Fake It Mask',

  // === Mask composites (WojakFakemask overlays) ===
  'wojakfakemask1': 'Fake It Mask',
  'wojakfakemask2': 'Fake It Mask',
  'wojakfakemask3': 'Fake It Mask',
  'wojakfakemask4': 'Fake It Mask',
  'wojakfakemask5': 'Fake It Mask',

  // === Clothes EXTRA overlays (Chia Farmer composites on tee/tank-top) ===
  'extra on tee,tank top clothes chia farmer blue': 'Chia Farmer',
  'extra on tee,tank top clothes chia farmer brown': 'Chia Farmer',
  'extra on tee,tank top clothes chia farmer orange': 'Chia Farmer',
  'extra on tee,tank top clothes chia farmer red': 'Chia Farmer',

  // === Background ($CASHTAG) ===
  '$bepe': '$BEPE',
  '$caster': '$CASTER',
  '$chia': '$CHIA',
  '$hoa': '$HOA',
  '$honk': '$HONK',
  '$love': '$LOVE',
  '$neckcoin': '$NECKCOIN',
  '$pizza': '$PIZZA',

  // === Background (Plain) ===
  'chia green': 'Chia Green',
  'golden hour': 'Golden Hour',
  'green candle': 'Green Candle',
  'hot coral': 'Hot Coral',
  'mellow yellow': 'Mellow Yellow',
  'neo mint': 'Neo Mint',
  'radioactive forest': 'Radioactive Forest',
  'sky dive': 'Sky Dive',
  'sky shock blue': 'Sky Shock Blue',
  'tangerine pop': 'Tangerine Pop',

  // === Background (Scene) ===
  'bepe barracks': 'Bepe Barracks',
  'chia farm': 'Chia Farm',
  'hell': 'Hell',
  'matrix': 'Matrix',
  "mom'''s basement": 'Moms Basement',   // ΓÇÖ → three apostrophes after regex
  'moms basement': 'Moms Basement',
  "mom's basement": 'Moms Basement',
  'moon': 'Moon',
  'nesting grounds': 'Nesting Grounds',
  'nyse dump': 'NYSE Dump',
  'nyse pump': 'NYSE Pump',
  'nyse rug': 'NYSE Rug',
  'one market': 'One Market',
  'orange grove': 'Orange Grove',
  'ronin dojo': 'Ronin Dojo',
  'route 66': 'Route 66',
  'silicon.net data center': 'Silicon Data Center',
  'silicon data center': 'Silicon Data Center',
  'spell room': 'Spell Room',
  'white house': 'White House',
  'casino': 'Casino',
  'circus': 'Circus',
  'bunker': 'Bunker',
  'home office': 'Home Office',
  'padded cell': 'Padded Cell',
  'space station': 'Space Station',
  'swamp': 'Swamp',
  'tavern': 'Tavern',
  'vaporwave': 'Vaporwave',
  'viking ship': 'Viking Ship',
  'volcano': 'Volcano',
  'wizard tower': 'Wizard Tower',
};

/**
 * Background color names — maps hex codes to trait display names.
 * Used when the user selects "Solid color" background in the generator.
 * Keys are uppercase hex (e.g. "#FF0000"). Names follow Phase 1 naming style.
 */
export const BACKGROUND_COLOR_NAMES: Record<string, string> = {
  // Default
  '#1A1A2E': 'Midnight Void',

  // Reds
  '#FFC0CB': 'Blush',
  '#FF69B4': 'Hot Pink',
  '#FF6347': 'Tomato Red',
  '#FF0000': 'Red Candle',
  '#FF1493': 'Deep Pink',
  '#8B0000': 'Blood Red',

  // Oranges
  '#FFFF00': 'Canary Yellow',
  '#FFD700': 'Gold Rush',
  '#FACC15': 'Sunflower',
  '#FFA500': 'Pure Orange',
  '#FF8C00': 'Dark Orange',
  '#FF6B00': 'Wojak Orange',

  // Greens
  '#00FF00': 'Neon Green',
  '#7CFC00': 'Lawn Green',
  '#32CD32': 'Lime Green',
  '#16A34A': 'Emerald',
  '#2E8B57': 'Sea Green',
  '#228B22': 'Forest Green',

  // Teals & Cyan
  '#00FFFF': 'Cyan',
  '#00D4FF': 'Electric Blue',
  '#40E0D0': 'Turquoise',
  '#00CED1': 'Dark Turquoise',
  '#20B2AA': 'Light Sea Green',
  '#0891B2': 'Deep Teal',

  // Blues
  '#00BFFF': 'Sky Blue',
  '#1E90FF': 'Dodger Blue',
  '#3B82F6': 'Royal Blue',
  '#2563EB': 'Cobalt',
  '#0000CD': 'Medium Blue',
  '#000080': 'Navy',

  // Purples
  '#BA55D3': 'Medium Orchid',
  '#A855F7': 'Amethyst',
  '#A020F0': 'Purple Rain',
  '#7C3AED': 'Violet',
  '#800080': 'Deep Purple',
  '#6D28D9': 'Royal Purple',

  // Pinks & Magenta
  '#F9A8D4': 'Cotton Candy',
  '#EC4899': 'Rose',
  '#FF00FF': 'Magenta',

  // Browns
  '#D2B48C': 'Tan',
  '#D4AF37': 'Metallic Gold',
  '#CD7F32': 'Bronze',
  '#A0522D': 'Sienna',
  '#8B4513': 'Saddle Brown',
  '#633800': 'Dark Chocolate',

  // Neutrals
  '#FFFFFF': 'White',
  '#F5F5DC': 'Beige',
  '#C0C0C0': 'Silver',
  '#808080': 'Gray',
  '#404040': 'Charcoal',
  '#262626': 'Near Black',

  // Quick-access extras (not already covered above)
  '#22C55E': 'Green Candle',
};

/**
 * Look up a trait display name from the map.
 * Returns the mapped name if found, or null if not in the map.
 */
export function lookupTraitName(rawIdentifier: string): string | null {
  return TRAIT_NAME_MAP[rawIdentifier.toLowerCase().trim()] ?? null;
}

/**
 * Look up a background color name from a hex code.
 * Returns the named background if found, or a formatted hex string as fallback.
 */
export function lookupBackgroundColorName(hex: string): string | null {
  return BACKGROUND_COLOR_NAMES[hex.toUpperCase().trim()] ?? null;
}
