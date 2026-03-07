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

  // === Extras (hand items + wings) ===
  'hand diamond': 'Diamond',
  'hand goose': 'Goose',
  'hand orange': 'Orange',
  'hand tangtalk': 'TangTalk',
  'hand coffee': 'Coffee',
  'hand gun left': 'Handgun',
  'hand gfy right': 'GFY Right',
  'hand gfy left': 'GFY Left',
  'hand left seedling': 'Seedling',
  'hand left brick': 'Brick',
  'wings': 'Wings',

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
  'everythings fine': 'Everything is Fine',
  "everything's fine": 'Everything is Fine',
  'everything is fine': 'Everything is Fine',
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
  'gym': 'Gym',
};

/**
 * Background color names — maps hex codes to trait display names.
 * Used when the user selects "Solid color" background in the generator.
 * Keys are uppercase hex (e.g. "#FF0000"). Names follow Phase 1 naming style.
 *
 * IMPORTANT: Every color in GENERATOR_PALETTE_HEX (ColorPicker.tsx) MUST have
 * an entry here. If you add a color to the palette, add a name here too.
 */
export const BACKGROUND_COLOR_NAMES: Record<string, string> = {
  // ── Row 1: Reds (FIRE) ──
  '#FF6347': 'Tomato Red',
  '#FF0000': 'Red Candle',
  '#DC143C': 'Crimson',
  '#C0392B': 'Brick Red',
  '#B22222': 'Firebrick',
  '#992222': 'Blood Moon',

  // ── Row 2: Crimsons (MARTIAL) ──
  '#7B1111': 'Dark Crimson',
  '#6B0000': 'Maroon',
  '#5C0000': 'Wine',
  '#4A0000': 'Oxblood',
  '#380000': 'Black Cherry',
  '#1A0000': 'Void Red',

  // ── Row 3: Oranges (DRAGON) ──
  '#FFA500': 'Pure Orange',
  '#FF8C00': 'Dark Orange',
  '#FF6B00': 'Wojak Orange',
  '#E65C00': 'Burnt Orange',
  '#CC5200': 'Rust',
  '#B34400': 'Copper',

  // ── Row 4: Yellows (ELECTRIC) ──
  '#FFFF00': 'Canary Yellow',
  '#FFD700': 'Gold Rush',
  '#CCFF00': 'Chartreuse',
  '#D4E500': 'Acid Yellow',
  '#C8D600': 'Pear',
  '#A8B800': 'Olive Gold',

  // ── Row 5: Yellow-Greens (INSECT) ──
  '#ADFF2F': 'Green Yellow',
  '#9ACD32': 'Yellow Green',
  '#8DB600': 'Apple Green',
  '#7CB518': 'Sap Green',
  '#6B8E23': 'Olive Drab',
  '#4A6520': 'Dark Olive',

  // ── Row 6: Greens (GRASS) ──
  '#00FF00': 'Neon Green',
  '#32CD32': 'Lime Green',
  '#22C55E': 'Green Candle',
  '#16A34A': 'Emerald',
  '#2E8B57': 'Sea Green',
  '#1A5C38': 'Deep Forest',

  // ── Row 7: Teals (WATER / ICE) ──
  '#00FFFF': 'Cyan',
  '#40E0D0': 'Turquoise',
  '#00CED1': 'Dark Turquoise',
  '#20B2AA': 'Light Sea Green',
  '#0891B2': 'Deep Teal',
  '#0E7490': 'Ocean Teal',

  // ── Row 8: Sky Blues (AIR) ──
  '#E0F7FF': 'Ice Mist',
  '#BAE6FD': 'Powder Blue',
  '#7DD3FC': 'Sky Blue',
  '#60A5FA': 'Cornflower',
  '#93C5FD': 'Baby Blue',
  '#38BDF8': 'Bright Sky',

  // ── Row 9: Blues (WATER / PSYCHE) ──
  '#1E90FF': 'Dodger Blue',
  '#3B82F6': 'Royal Blue',
  '#2563EB': 'Cobalt',
  '#1D4ED8': 'Sapphire',
  '#1E3A8A': 'Deep Navy',
  '#172554': 'Midnight Blue',

  // ── Row 10: Purples (PSYCHE) ──
  '#C084FC': 'Lavender',
  '#A855F7': 'Amethyst',
  '#9333EA': 'Vivid Purple',
  '#7C3AED': 'Violet',
  '#6D28D9': 'Royal Purple',
  '#5B21B6': 'Deep Violet',

  // ── Row 11: Indigos (GHOST) ──
  '#4B0082': 'Indigo',
  '#3B006B': 'Dark Indigo',
  '#2E0054': 'Midnight Purple',
  '#210040': 'Deep Plum',
  '#170030': 'Abyss Violet',
  '#0D001A': 'Void',

  // ── Row 12: Magentas (VENOM) ──
  '#FF00FF': 'Magenta',
  '#E879F9': 'Orchid',
  '#D946EF': 'Fuchsia',
  '#A21CAF': 'Purple Poison',
  '#86198F': 'Dark Magenta',
  '#6B1278': 'Deep Fuchsia',

  // ── Row 13: Pinks (MYSTIC) ──
  '#FFB3D9': 'Cotton Candy',
  '#FF69B4': 'Hot Pink',
  '#EC4899': 'Rose',
  '#DB2777': 'Deep Rose',
  '#BE185D': 'Ruby',
  '#9D174D': 'Wine Rose',

  // ── Row 14: Earth & Olive (EARTH) ──
  '#C8A87A': 'Sand',
  '#A67C52': 'Mocha',
  '#8B7355': 'Earth Brown',
  '#6B5C3E': 'Dark Earth',
  '#5C4A1E': 'Raw Umber',
  '#3D2B1F': 'Dark Chocolate',

  // ── Row 15: Neutrals ──
  '#FFFFFF': 'White',
  '#C8C8C8': 'Light Gray',
  '#999999': 'Gray',
  '#666666': 'Slate',
  '#404040': 'Charcoal',
  '#171717': 'Near Black',

  // ── Legacy / extras (keep for backward compat) ──
  '#1A1A2E': 'Midnight Void',
  '#FFC0CB': 'Blush',
  '#FF1493': 'Deep Pink',
  '#8B0000': 'Blood Red',
  '#FACC15': 'Sunflower',
  '#7CFC00': 'Lawn Green',
  '#228B22': 'Forest Green',
  '#00D4FF': 'Electric Blue',
  '#00BFFF': 'Sky Blue',
  '#0000CD': 'Medium Blue',
  '#000080': 'Navy',
  '#BA55D3': 'Medium Orchid',
  '#A020F0': 'Purple Rain',
  '#800080': 'Deep Purple',
  '#F9A8D4': 'Cotton Candy',
  '#D2B48C': 'Tan',
  '#D4AF37': 'Metallic Gold',
  '#CD7F32': 'Bronze',
  '#A0522D': 'Sienna',
  '#8B4513': 'Saddle Brown',
  '#633800': 'Dark Chocolate',
  '#F5F5DC': 'Beige',
  '#C0C0C0': 'Silver',
  '#808080': 'Gray',
  '#262626': 'Near Black',
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
