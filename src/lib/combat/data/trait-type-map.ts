// src/lib/combat/data/trait-type-map.ts
//
// Maps every trait (by manifest ID) to its combat type points, nature stat,
// and colorable flag. Derived from docs/TRAIT-COMBAT-MAPPING.csv.
//
// 129 entries total (all CSV rows except "Solid Color" which is determined
// dynamically via color hue mapping).

import type { CombatType, StatName, TraitCombatEntry } from '../types';

// ---------- helpers ----------

function e(
  traitId: string,
  layer: string,
  name: string,
  colorable: boolean,
  primary: CombatType,
  primaryPts: number,
  secondary: CombatType | null,
  secondaryPts: number,
  natureStat: StatName | null,
  natureStatPts: number,
): TraitCombatEntry {
  const typePoints = secondary
    ? { primary, primaryPts, secondary, secondaryPts }
    : { primary, primaryPts };
  return { traitId, layer, name, colorable, typePoints, natureStat, natureStatPts };
}

// ---------- data ----------

export const TRAIT_COMBAT_MAP: Record<string, TraitCombatEntry> = {

  // ── Background (16) ────────────────────────────────────────────────
  'Background_Bepe-Barracks': e('Background_Bepe-Barracks', 'Background', 'Bepe Barracks', false, 'MARTIAL', 6, 'NEUTRAL', 2, 'attack', 3),
  'Background_Chia-Farm': e('Background_Chia-Farm', 'Background', 'Chia Farm', false, 'GRASS', 6, 'EARTH', 2, 'defense', 3),
  'Background_Hell': e('Background_Hell', 'Background', 'Hell', false, 'FIRE', 5, 'SHADOW', 2, 'attack', 3),
  'Background_Matrix': e('Background_Matrix', 'Background', 'Matrix', false, 'ELECTRIC', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Background_Moms-Basement': e('Background_Moms-Basement', 'Background', 'Moms Basement', false, 'NEUTRAL', 8, 'PSYCHE', 2, 'sp_def', 3),
  'Background_Moon': e('Background_Moon', 'Background', 'Moon', false, 'AIR', 5, 'PSYCHE', 2, 'sp_def', 3),
  'Background_Nesting-Grounds': e('Background_Nesting-Grounds', 'Background', 'Nesting Grounds', false, 'GRASS', 6, 'WATER', 2, 'sp_def', 3),
  'Background_NYSE-Dump': e('Background_NYSE-Dump', 'Background', 'NYSE Dump', false, 'SHADOW', 4, 'NEUTRAL', 2, 'speed', 3),
  'Background_NYSE-Pump': e('Background_NYSE-Pump', 'Background', 'NYSE Pump', false, 'ELECTRIC', 5, 'DRAGON', 2, 'speed', 3),
  'Background_One-Market': e('Background_One-Market', 'Background', 'One Market', false, 'METAL', 6, 'NEUTRAL', 2, 'defense', 3),
  'Background_Orange-Grove': e('Background_Orange-Grove', 'Background', 'Orange Grove', false, 'GRASS', 6, 'FIRE', 2, 'sp_def', 3),
  'Background_Ronin-Dojo': e('Background_Ronin-Dojo', 'Background', 'Ronin Dojo', false, 'MARTIAL', 6, 'EARTH', 2, 'attack', 3),
  'Background_Route-66': e('Background_Route-66', 'Background', 'Route 66', false, 'EARTH', 6, 'AIR', 2, 'speed', 3),
  'Background_Silicon.net-Data-Center': e('Background_Silicon.net-Data-Center', 'Background', 'Silicon.net Data Center', false, 'ELECTRIC', 5, 'METAL', 2, 'sp_atk', 3),
  'Background_Spell-Room': e('Background_Spell-Room', 'Background', 'Spell Room', false, 'PSYCHE', 5, 'MYSTIC', 2, 'sp_atk', 3),
  'Background_White-House': e('Background_White-House', 'Background', 'White House', false, 'STONE', 8, 'MARTIAL', 2, 'defense', 3),
  // Solid Color: types determined dynamically by chosen color via hue mapping
  'Background_Solid-Color': e('Background_Solid-Color', 'Background', 'Solid Color', true, 'NEUTRAL', 0, null, 0, null, 0),

  // ── Background — Phase 6 (NEW) (14) ───────────────────────────────
  'Background_Frozen-Tundra': e('Background_Frozen-Tundra', 'Background', 'Frozen Tundra', false, 'ICE', 6, 'WATER', 2, 'sp_def', 3),
  'Background_Deep-Ocean': e('Background_Deep-Ocean', 'Background', 'Deep Ocean', false, 'WATER', 6, 'ICE', 2, 'sp_def', 3),
  'Background_Jungle-Canopy': e('Background_Jungle-Canopy', 'Background', 'Jungle Canopy', false, 'GRASS', 6, 'INSECT', 2, 'sp_atk', 3),
  'Background_Sky-Fortress': e('Background_Sky-Fortress', 'Background', 'Sky Fortress', false, 'AIR', 5, 'DRAGON', 2, 'speed', 3),
  'Background_Ancient-Quarry': e('Background_Ancient-Quarry', 'Background', 'Ancient Quarry', false, 'STONE', 8, 'EARTH', 2, 'defense', 3),
  'Background_Thunderstorm': e('Background_Thunderstorm', 'Background', 'Thunderstorm', false, 'ELECTRIC', 5, 'AIR', 2, 'sp_atk', 3),
  'Background_Toxic-Swamp': e('Background_Toxic-Swamp', 'Background', 'Toxic Swamp', false, 'VENOM', 8, 'GRASS', 2, 'sp_atk', 3),
  'Background_Dragons-Lair': e('Background_Dragons-Lair', 'Background', 'Dragons Lair', false, 'DRAGON', 6, 'FIRE', 2, 'attack', 3),
  'Background_Graveyard': e('Background_Graveyard', 'Background', 'Graveyard', false, 'GHOST', 5, 'SHADOW', 2, 'sp_atk', 3),
  'Background_Colosseum-Arena': e('Background_Colosseum-Arena', 'Background', 'Colosseum Arena', false, 'STONE', 8, 'MARTIAL', 2, 'attack', 3),
  'Background_Crystal-Cave': e('Background_Crystal-Cave', 'Background', 'Crystal Cave', false, 'MYSTIC', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Background_Dark-Alley': e('Background_Dark-Alley', 'Background', 'Dark Alley', false, 'SHADOW', 4, 'VENOM', 2, 'speed', 3),
  'Background_Steel-Forge': e('Background_Steel-Forge', 'Background', 'Steel Forge', false, 'METAL', 6, 'FIRE', 2, 'defense', 3),

  // ── Background — Phase 7 (NEW) (12) ───────────────────────────────
  'Background_Casino': e('Background_Casino', 'Background', 'Casino', false, 'SHADOW', 4, 'NEUTRAL', 2, 'speed', 3),
  'Background_Circus': e('Background_Circus', 'Background', 'Circus', false, 'GHOST', 5, 'SHADOW', 2, 'speed', 3),
  'Background_Everythings-Fine': e('Background_Everythings-Fine', 'Background', 'Everything is Fine', false, 'FIRE', 5, 'WATER', 2, 'defense', 3),
  'Background_Bunker': e('Background_Bunker', 'Background', 'Bunker', false, 'STONE', 8, 'EARTH', 2, 'defense', 3),
  'Background_Home-Office': e('Background_Home-Office', 'Background', 'Home Office', false, 'ELECTRIC', 5, 'NEUTRAL', 2, 'sp_atk', 3),
  'Background_Padded-Cell': e('Background_Padded-Cell', 'Background', 'Padded Cell', false, 'PSYCHE', 5, 'GHOST', 2, 'sp_def', 3),
  'Background_Space-Station': e('Background_Space-Station', 'Background', 'Space Station', false, 'METAL', 6, 'AIR', 2, 'defense', 3),
  'Background_Swamp': e('Background_Swamp', 'Background', 'Swamp', false, 'WATER', 6, 'GRASS', 2, 'sp_def', 3),
  'Background_Tavern': e('Background_Tavern', 'Background', 'Tavern', false, 'VENOM', 8, 'NEUTRAL', 2, 'attack', 3),
  'Background_Vaporwave': e('Background_Vaporwave', 'Background', 'Vaporwave', false, 'ELECTRIC', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Background_Viking-Ship': e('Background_Viking-Ship', 'Background', 'Viking Ship', false, 'DRAGON', 6, 'MARTIAL', 2, 'attack', 3),
  'Background_Volcano': e('Background_Volcano', 'Background', 'Volcano', false, 'FIRE', 5, 'EARTH', 2, 'attack', 3),
  'Background_Wizard-Tower': e('Background_Wizard-Tower', 'Background', 'Wizard Tower', false, 'MYSTIC', 5, 'DRAGON', 2, 'sp_atk', 3),

  // ── Background — Price Overlays (2) ──────────────────────────────────
  'Background_Price-Up': e('Background_Price-Up', 'Background', 'Price Up', true, 'ELECTRIC', 5, 'DRAGON', 2, 'speed', 3),
  'Background_Price-Down': e('Background_Price-Down', 'Background', 'Price Down', true, 'SHADOW', 4, 'GHOST', 2, 'sp_def', 3),

  // ── Background — NYSE Rug ────────────────────────────────────────────
  'Background_NYSE-Rug': e('Background_NYSE-Rug', 'Background', 'NYSE Rug', false, 'SHADOW', 4, 'NEUTRAL', 2, 'speed', 3),

  // ── Background — Plain (10) ──────────────────────────────────────────
  'Background_Chia-Green': e('Background_Chia-Green', 'Background', 'Chia Green', false, 'GRASS', 6, 'EARTH', 2, 'sp_def', 3),
  'Background_Golden-Hour': e('Background_Golden-Hour', 'Background', 'Golden Hour', false, 'FIRE', 5, 'DRAGON', 2, 'sp_atk', 3),
  'Background_Green-Candle': e('Background_Green-Candle', 'Background', 'Green Candle', false, 'GRASS', 6, 'ELECTRIC', 2, 'speed', 3),
  'Background_Hot-Coral': e('Background_Hot-Coral', 'Background', 'Hot Coral', false, 'FIRE', 5, 'MYSTIC', 2, 'attack', 3),
  'Background_Mellow-Yellow': e('Background_Mellow-Yellow', 'Background', 'Mellow Yellow', false, 'ELECTRIC', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Background_Neo-Mint': e('Background_Neo-Mint', 'Background', 'Neo Mint', false, 'ICE', 6, 'GRASS', 2, 'sp_def', 3),
  'Background_Radioactive-Forest': e('Background_Radioactive-Forest', 'Background', 'Radioactive Forest', false, 'VENOM', 8, 'GRASS', 2, 'sp_atk', 3),
  'Background_Sky-Dive': e('Background_Sky-Dive', 'Background', 'Sky Dive', false, 'AIR', 5, 'WATER', 2, 'speed', 3),
  'Background_Sky-Shock-Blue': e('Background_Sky-Shock-Blue', 'Background', 'Sky Shock Blue', false, 'WATER', 6, 'ELECTRIC', 2, 'sp_def', 3),
  'Background_Tangerine-Pop': e('Background_Tangerine-Pop', 'Background', 'Tangerine Pop', false, 'DRAGON', 6, 'FIRE', 2, 'attack', 3),

  // ── Background — $CASHTAG (8) ────────────────────────────────────────
  'Background_$BEPE': e('Background_$BEPE', 'Background', '$BEPE', false, 'INSECT', 8, 'MARTIAL', 2, 'attack', 3),
  'Background_$CASTER': e('Background_$CASTER', 'Background', '$CASTER', false, 'MYSTIC', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Background_$CHIA': e('Background_$CHIA', 'Background', '$CHIA', false, 'GRASS', 6, 'EARTH', 2, 'defense', 3),
  'Background_$HOA': e('Background_$HOA', 'Background', '$HOA', false, 'DRAGON', 6, 'METAL', 2, 'sp_atk', 3),
  'Background_$HONK': e('Background_$HONK', 'Background', '$HONK', false, 'AIR', 5, 'NEUTRAL', 2, 'speed', 3),
  'Background_$LOVE': e('Background_$LOVE', 'Background', '$LOVE', false, 'MYSTIC', 5, 'FIRE', 2, 'sp_def', 3),
  'Background_$NECKCOIN': e('Background_$NECKCOIN', 'Background', '$NECKCOIN', false, 'GHOST', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Background_$PIZZA': e('Background_$PIZZA', 'Background', '$PIZZA', false, 'EARTH', 6, 'INSECT', 2, 'sp_def', 3),

  // ── Base (5) ───────────────────────────────────────────────────────
  'Base_Classic': e('Base_Classic', 'Base', 'Classic', false, 'NEUTRAL', 8, null, 0, null, 0),
  'Base_Rekt': e('Base_Rekt', 'Base', 'Rekt', false, 'GHOST', 5, 'SHADOW', 2, 'sp_def', 3),
  'Base_Rugged': e('Base_Rugged', 'Base', 'Rugged', false, 'EARTH', 6, 'MARTIAL', 2, 'defense', 3),
  'Base_Bleeding-Bags': e('Base_Bleeding-Bags', 'Base', 'Bleeding Bags', false, 'GHOST', 5, 'VENOM', 2, 'sp_def', 3),
  'Base_Terminator': e('Base_Terminator', 'Base', 'Terminator', false, 'METAL', 6, 'ELECTRIC', 2, 'attack', 3),

  // ── Clothes (30) ──────────────────────────────────────────────────
  'Clothes_Astronaut': e('Clothes_Astronaut', 'Clothes', 'Astronaut', true, 'AIR', 5, 'METAL', 2, 'sp_def', 3),
  'Clothes_Bathrobe': e('Clothes_Bathrobe', 'Clothes', 'Bathrobe', true, 'WATER', 6, 'MYSTIC', 2, 'sp_def', 3),
  'Clothes_Bepe-army': e('Clothes_Bepe-army', 'Clothes', 'Bepe Army', true, 'INSECT', 8, 'MARTIAL', 2, 'attack', 3),
  'Clothes_Bepe-suit': e('Clothes_Bepe-suit', 'Clothes', 'Bepe Suit', false, 'INSECT', 8, 'NEUTRAL', 2, 'speed', 3),
  'Clothes_Born-to-ride': e('Clothes_Born-to-ride', 'Clothes', 'Born to Ride', true, 'SHADOW', 4, 'FIRE', 2, 'speed', 3),
  'Clothes_Chia-farmer': e('Clothes_Chia-farmer', 'Clothes', 'Chia Farmer', true, 'GRASS', 6, 'EARTH', 2, 'defense', 3),
  'Clothes_Drac-suit': e('Clothes_Drac-suit', 'Clothes', 'Drac Suit', false, 'GHOST', 5, 'SHADOW', 2, 'sp_atk', 3),
  'Clothes_fire-figther': e('Clothes_fire-figther', 'Clothes', 'Firefighter Uniform', true, 'FIRE', 5, 'MARTIAL', 2, 'defense', 3),
  'Clothes_Goose-suit': e('Clothes_Goose-suit', 'Clothes', 'Goose Suit', false, 'AIR', 5, 'NEUTRAL', 2, 'speed', 3),
  'Clothes_Leather-jacket': e('Clothes_Leather-jacket', 'Clothes', 'Leather Jacket', true, 'SHADOW', 4, 'MARTIAL', 2, 'attack', 3),
  'Clothes_Military-jacket': e('Clothes_Military-jacket', 'Clothes', 'Military Jacket', true, 'EARTH', 6, 'MARTIAL', 2, 'defense', 3),
  'Clothes_Ninja-turtle-fit': e('Clothes_Ninja-turtle-fit', 'Clothes', 'Ninja Turtle Fit', true, 'WATER', 6, 'MARTIAL', 2, 'speed', 3),
  'Clothes_Pepe-suit': e('Clothes_Pepe-suit', 'Clothes', 'Pepe Suit', false, 'INSECT', 8, 'WATER', 2, 'sp_def', 3),
  'Clothes_Pickle-suit': e('Clothes_Pickle-suit', 'Clothes', 'Pickle Suit', false, 'GRASS', 6, 'VENOM', 2, 'sp_def', 3),
  'Clothes_Proof-of-prayer': e('Clothes_Proof-of-prayer', 'Clothes', 'Proof of Prayer', false, 'MYSTIC', 5, 'PSYCHE', 2, 'sp_def', 3),
  'Clothes_Roman-drip': e('Clothes_Roman-drip', 'Clothes', 'Roman Drip', true, 'STONE', 8, 'MARTIAL', 2, 'attack', 3),
  'Clothes_Ronin': e('Clothes_Ronin', 'Clothes', 'Ronin', true, 'MARTIAL', 6, 'SHADOW', 2, 'attack', 3),
  'Clothes_SWAT': e('Clothes_SWAT', 'Clothes', 'SWAT', true, 'METAL', 6, 'MARTIAL', 2, 'defense', 3),
  'Clothes_Sonic-suit': e('Clothes_Sonic-suit', 'Clothes', 'Sonic Suit', true, 'AIR', 5, 'ELECTRIC', 2, 'speed', 3),
  'Clothes_Sports-jacket': e('Clothes_Sports-jacket', 'Clothes', 'Sports Jacket', true, 'MARTIAL', 6, 'NEUTRAL', 2, 'speed', 3),
  'Clothes_Straigth-jacket': e('Clothes_Straigth-jacket', 'Clothes', 'Straight Jacket', true, 'PSYCHE', 5, 'GHOST', 2, 'attack', 3),
  'Clothes_Suit': e('Clothes_Suit', 'Clothes', 'Suit', true, 'METAL', 6, 'SHADOW', 2, 'sp_atk', 3),
  'Clothes_Super-Saiyan': e('Clothes_Super-Saiyan', 'Clothes', 'Super Saiyan', true, 'DRAGON', 6, 'FIRE', 2, 'attack', 3),
  'Clothes_Tank-top': e('Clothes_Tank-top', 'Clothes', 'Tank Top', true, 'NEUTRAL', 8, 'MARTIAL', 2, 'attack', 3),
  'Clothes_Tee': e('Clothes_Tee', 'Clothes', 'Tee', true, 'INSECT', 8, 'EARTH', 2, 'speed', 3),
  'Clothes_Viking-Armor': e('Clothes_Viking-Armor', 'Clothes', 'Viking Armor', true, 'ICE', 6, 'MARTIAL', 2, 'attack', 3),
  'Clothes_Wizard-drip': e('Clothes_Wizard-drip', 'Clothes', 'Wizard Drip', true, 'PSYCHE', 5, 'MYSTIC', 2, 'sp_atk', 3),
  'Clothes_gods-robe': e('Clothes_gods-robe', 'Clothes', 'Gods Robe', true, 'MYSTIC', 5, 'DRAGON', 2, 'sp_def', 3),
  'Clothes_gopher-suit': e('Clothes_gopher-suit', 'Clothes', 'Gopher Suit', false, 'EARTH', 6, 'INSECT', 2, 'defense', 3),
  'Clothes_topless': e('Clothes_topless', 'Clothes', 'Topless', false, 'NEUTRAL', 8, 'MARTIAL', 2, 'attack', 3),

  // ── Facial Hair (2) ───────────────────────────────────────────────
  'Facial-Hair_Neckbeard': e('Facial-Hair_Neckbeard', 'FacialHair', 'Neckbeard', false, 'ICE', 6, 'PSYCHE', 2, 'defense', 3),
  'Facial-Hair_Stache': e('Facial-Hair_Stache', 'FacialHair', 'Stache', false, 'FIRE', 5, 'NEUTRAL', 2, 'attack', 3),

  // ── Mouth (8) ─────────────────────────────────────────────────────
  'Mouth_Numb': e('Mouth_Numb', 'Mouth', 'Numb', false, 'ICE', 6, 'PSYCHE', 2, 'defense', 3),
  'Mouth_Cig': e('Mouth_Cig', 'Mouth', 'Cig', false, 'SHADOW', 4, 'FIRE', 2, 'speed', 3),
  'Mouth_Smile': e('Mouth_Smile', 'Mouth', 'Smile', false, 'MYSTIC', 5, 'NEUTRAL', 2, 'sp_def', 3),
  'Mouth_Screaming': e('Mouth_Screaming', 'Mouth', 'Screaming', false, 'DRAGON', 6, 'FIRE', 2, 'attack', 3),
  'Mouth_Teeth': e('Mouth_Teeth', 'Mouth', 'Teeth', false, 'SHADOW', 4, 'MARTIAL', 2, 'attack', 3),
  'Mouth_Gold-Teeth': e('Mouth_Gold-Teeth', 'Mouth', 'Gold Teeth', false, 'DRAGON', 6, 'METAL', 2, 'sp_atk', 3),
  'Mouth_Pizza': e('Mouth_Pizza', 'Mouth', 'Pizza', false, 'INSECT', 8, 'EARTH', 2, 'sp_def', 3),
  'Mouth_Pipe': e('Mouth_Pipe', 'Mouth', 'Pipe', true, 'PSYCHE', 5, 'FIRE', 2, 'sp_atk', 3),
  'Mouth_BubbleGum': e('Mouth_BubbleGum', 'Mouth', 'Bubble Gum', true, 'MYSTIC', 5, 'VENOM', 2, 'sp_def', 3),

  // ── Mouth Item (3) ────────────────────────────────────────────────
  'MouthItem_Cig': e('MouthItem_Cig', 'Mouth Item', 'Cig', false, 'VENOM', 8, 'SHADOW', 2, 'speed', 3),
  'MouthItem_Joint': e('MouthItem_Joint', 'Mouth Item', 'Joint', false, 'GRASS', 6, 'VENOM', 2, 'sp_def', 3),
  'MouthItem_Cohiba': e('MouthItem_Cohiba', 'Mouth Item', 'Cohiba', false, 'FIRE', 5, 'SHADOW', 2, 'sp_atk', 3),

  // ── Mask (5) ──────────────────────────────────────────────────────
  'Mask_Bandana-mask': e('Mask_Bandana-mask', 'Mask', 'Bandana Mask', true, 'SHADOW', 4, 'MARTIAL', 2, 'speed', 3),
  'Mask_Hannibal-Mask': e('Mask_Hannibal-Mask', 'Mask', 'Hannibal Mask', false, 'GHOST', 5, 'SHADOW', 2, 'sp_def', 3),
  'Mask_Copium-Mask': e('Mask_Copium-Mask', 'Mask', 'Copium Mask', false, 'VENOM', 8, 'PSYCHE', 2, 'sp_def', 3),
  'Mask_Hand-Mask': e('Mask_Hand-Mask', 'Mask', 'Hand Mask', false, 'GHOST', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Mask_Skull-Mask': e('Mask_Skull-Mask', 'Mask', 'Skull Mask', false, 'GHOST', 5, 'SHADOW', 2, 'attack', 3),

  // ── Eyes (15) ─────────────────────────────────────────────────────
  // NOTE: The CSV layer is "Eyes" but the manifest stores these under
  // "Face-wear" / "Face-laser". IDs use manifest IDs where they exist,
  // constructed "Eyes_*" IDs otherwise.
  'Face-wear_3d-glases': e('Face-wear_3d-glases', 'Eyes', '3D Glasses', true, 'PSYCHE', 5, 'ELECTRIC', 2, 'sp_atk', 3),
  'Face-wear_alpha-shades': e('Face-wear_alpha-shades', 'Eyes', 'Alpha Shades', true, 'SHADOW', 4, 'DRAGON', 2, 'attack', 3),
  'Face-wear_aviators': e('Face-wear_aviators', 'Eyes', 'Aviators', true, 'AIR', 5, 'INSECT', 2, 'speed', 3),
  'Eyes_Cool-Glasses': e('Eyes_Cool-Glasses', 'Eyes', 'Cool Glasses', false, 'ICE', 6, 'NEUTRAL', 2, 'defense', 3),
  'Face-wear_cyber-shades': e('Face-wear_cyber-shades', 'Eyes', 'Cyber Shades', true, 'ELECTRIC', 5, 'METAL', 2, 'sp_atk', 3),
  'Eyes_Eye-Patch': e('Eyes_Eye-Patch', 'Eyes', 'Eye Patch', false, 'WATER', 6, 'SHADOW', 2, 'defense', 3),
  'Face-laser_Laser-Eyes': e('Face-laser_Laser-Eyes', 'Eyes', 'Laser Eyes', true, 'FIRE', 5, 'ELECTRIC', 2, 'sp_atk', 3),
  'Face-wear_Matrix-Lenses': e('Face-wear_Matrix-Lenses', 'Eyes', 'Matrix Lenses', true, 'PSYCHE', 5, 'SHADOW', 2, 'sp_atk', 3),
  'Face-wear_MOG-Glasses': e('Face-wear_MOG-Glasses', 'Eyes', 'MOG Glasses', false, 'MYSTIC', 5, 'NEUTRAL', 2, 'sp_def', 3),
  'Eyes_Ninja-Turtle-Mask': e('Eyes_Ninja-Turtle-Mask', 'Eyes', 'Ninja Turtle Mask', true, 'WATER', 6, 'MARTIAL', 2, 'defense', 3),
  'Eyes_Night-Vision': e('Eyes_Night-Vision', 'Eyes', 'Night Vision', true, 'ELECTRIC', 5, 'EARTH', 2, 'sp_atk', 3),
  'Face-wear_shades': e('Face-wear_shades', 'Eyes', 'Shades', true, 'SHADOW', 4, 'NEUTRAL', 2, 'speed', 3),
  'Eyes_Tyson-Tattoo': e('Eyes_Tyson-Tattoo', 'Eyes', 'Tyson Tattoo', false, 'MARTIAL', 6, 'SHADOW', 2, 'attack', 3),
  'Face-wear_VR-headset': e('Face-wear_VR-headset', 'Eyes', 'VR Headset', true, 'AIR', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Eyes_Wizard-Glasses': e('Eyes_Wizard-Glasses', 'Eyes', 'Wizard Glasses', false, 'PSYCHE', 5, 'MYSTIC', 2, 'sp_atk', 3),

  // ── Head (30) ─────────────────────────────────────────────────────
  'Head_2Pac-Bandana': e('Head_2Pac-Bandana', 'Head', '2Pac Bandana', true, 'SHADOW', 4, 'MARTIAL', 2, 'attack', 3),
  'Head_Spikes': e('Head_Spikes', 'Head', 'Anarchy Spikes', true, 'VENOM', 8, 'SHADOW', 2, 'attack', 3),
  'Head_Beanie': e('Head_Beanie', 'Head', 'Beanie', true, 'ICE', 6, 'NEUTRAL', 2, 'sp_def', 3),
  'Head_Beer-Hat': e('Head_Beer-Hat', 'Head', 'Beer Hat', false, 'VENOM', 8, 'NEUTRAL', 2, 'sp_def', 3),
  'Head_Cap': e('Head_Cap', 'Head', 'Cap', true, 'AIR', 5, 'NEUTRAL', 2, 'speed', 3),
  'Head_Centurion': e('Head_Centurion', 'Head', 'Centurion', true, 'STONE', 8, 'MARTIAL', 2, 'defense', 3),
  'Head_Clown': e('Head_Clown', 'Head', 'Clown', true, 'MYSTIC', 5, 'PSYCHE', 2, 'sp_atk', 3),
  'Head_Comrad-Hat': e('Head_Comrad-Hat', 'Head', 'Comrade Hat', true, 'MARTIAL', 6, 'FIRE', 2, 'attack', 3),
  'Head_Construction-Helmet': e('Head_Construction-Helmet', 'Head', 'Construction Helmet', true, 'EARTH', 6, 'METAL', 2, 'defense', 3),
  'Head_Cowboy-Hat': e('Head_Cowboy-Hat', 'Head', 'Cowboy Hat', true, 'EARTH', 6, 'AIR', 2, 'speed', 3),
  'Head_Crown': e('Head_Crown', 'Head', 'Crown', true, 'DRAGON', 6, 'METAL', 2, 'sp_atk', 3),
  'Head_Devil-horns': e('Head_Devil-horns', 'Head', 'Devil Horns', true, 'FIRE', 5, 'SHADOW', 2, 'attack', 3),
  'Head_Fedora': e('Head_Fedora', 'Head', 'Fedora', true, 'GHOST', 5, 'SHADOW', 2, 'sp_atk', 3),
  'Head_Field-Cap': e('Head_Field-Cap', 'Head', 'Field Cap', false, 'EARTH', 6, 'MARTIAL', 2, 'defense', 3),
  'Head_Firefigther-Helmet': e('Head_Firefigther-Helmet', 'Head', 'Firefighter Helmet', true, 'FIRE', 5, 'METAL', 2, 'defense', 3),
  'Head_Hard-hat': e('Head_Hard-hat', 'Head', 'Hard Hat', true, 'EARTH', 6, 'STONE', 2, 'defense', 3),
  'Head_Headphones': e('Head_Headphones', 'Head', 'Headphones', false, 'ELECTRIC', 5, 'PSYCHE', 2, 'sp_def', 3),
  'Head_military-beret': e('Head_military-beret', 'Head', 'Military Beret', true, 'MARTIAL', 6, 'AIR', 2, 'speed', 3),
  'Head_Piccolo-Hat': e('Head_Piccolo-Hat', 'Head', 'Piccolo Hat', false, 'MYSTIC', 5, 'DRAGON', 2, 'sp_atk', 3),
  'Head_Pirate-hat': e('Head_Pirate-hat', 'Head', 'Pirate Hat', true, 'WATER', 6, 'SHADOW', 2, 'attack', 3),
  'Head_Propeller-Hat': e('Head_Propeller-Hat', 'Head', 'Propeller Hat', true, 'AIR', 5, 'NEUTRAL', 2, 'speed', 3),
  'Head_Ronin-helmet': e('Head_Ronin-helmet', 'Head', 'Ronin Helmet', true, 'METAL', 6, 'MARTIAL', 2, 'defense', 3),
  'Head_SWAT-helmet': e('Head_SWAT-helmet', 'Head', 'SWAT Helmet', true, 'MARTIAL', 6, 'METAL', 2, 'defense', 3),
  'Head_Standard-Cut': e('Head_Standard-Cut', 'Head', 'Standard Cut', true, 'NEUTRAL', 8, null, 0, null, 0),
  'Head_Super-wojak': e('Head_Super-wojak', 'Head', 'Super Mario Cap', true, 'FIRE', 5, 'EARTH', 2, 'speed', 3),
  'Head_Super-Saiyan': e('Head_Super-Saiyan', 'Head', 'Super Saiyan Hair', true, 'DRAGON', 6, 'ELECTRIC', 2, 'attack', 3),
  'Head_Tin-Foil-Hat': e('Head_Tin-Foil-Hat', 'Head', 'Tin Foil Hat', false, 'GHOST', 5, 'ELECTRIC', 2, 'sp_def', 3),
  'Head_Trump-Wave': e('Head_Trump-Wave', 'Head', 'Trump Wave', false, 'DRAGON', 6, 'NEUTRAL', 2, 'sp_atk', 3),
  'Head_viking-helmet': e('Head_viking-helmet', 'Head', 'Viking Helmet', true, 'ICE', 6, 'MARTIAL', 2, 'attack', 3),
  'Head_Wiz-Hat': e('Head_Wiz-Hat', 'Head', 'Wiz Hat', true, 'PSYCHE', 5, 'MYSTIC', 2, 'sp_atk', 3),

  // ── Extras (hand items + wings) (9) ────────────────────────────────
  'EXTRA_EXTRA_hand_diamond': e('EXTRA_EXTRA_hand_diamond', 'Extra', 'Diamond', false, 'DRAGON', 3, 'METAL', 1, 'defense', 2),
  'EXTRA_EXTRA_hand_goose': e('EXTRA_EXTRA_hand_goose', 'Extra', 'Goose', false, 'WATER', 3, 'AIR', 1, 'attack', 2),
  'EXTRA_EXTRA_hand_orange': e('EXTRA_EXTRA_hand_orange', 'Extra', 'Orange', false, 'GRASS', 3, 'EARTH', 1, 'sp_def', 2),
  'EXTRA_EXTRA_hand_TangTalk': e('EXTRA_EXTRA_hand_TangTalk', 'Extra', 'TangTalk', false, 'ELECTRIC', 3, 'NEUTRAL', 1, 'sp_atk', 2),
  'EXTRA_EXTRA_hand_coffee': e('EXTRA_EXTRA_hand_coffee', 'Extra', 'Coffee', false, 'FIRE', 3, 'NEUTRAL', 1, 'speed', 2),
  'EXTRA_EXTRA_hand_gun_left': e('EXTRA_EXTRA_hand_gun_left', 'Extra', 'Handgun', false, 'METAL', 3, 'SHADOW', 1, 'attack', 2),
  'EXTRA_EXTRA_hand_gfy_right': e('EXTRA_EXTRA_hand_gfy_right', 'Extra', 'GFY Right', false, 'MARTIAL', 3, 'SHADOW', 1, 'attack', 2),
  'EXTRA_EXTRA_hand_gfy_left': e('EXTRA_EXTRA_hand_gfy_left', 'Extra', 'GFY Left', false, 'MARTIAL', 3, 'SHADOW', 1, 'attack', 2),
  'EXTRA_EXTRA_wings': e('EXTRA_EXTRA_wings', 'Extra', 'Wings', false, 'AIR', 3, 'MYSTIC', 1, 'speed', 2),
};

// ---------- accessor ----------

/** Look up combat data for a trait by its manifest ID. */
export function getTraitCombat(traitId: string): TraitCombatEntry | undefined {
  return TRAIT_COMBAT_MAP[traitId];
}
