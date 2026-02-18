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
  'Background_Bepe-Barracks':               e('Background_Bepe-Barracks',               'Background', 'Bepe Barracks',               false, 'MARTIAL',  5, 'NEUTRAL',  2, 'attack',  3),
  'Background_Chia-Farm':                   e('Background_Chia-Farm',                   'Background', 'Chia Farm',                   false, 'GRASS',    5, 'EARTH',    2, 'defense', 3),
  'Background_Hell':                        e('Background_Hell',                        'Background', 'Hell',                        false, 'FIRE',     5, 'SHADOW',   2, 'attack',  3),
  'Background_Matrix':                      e('Background_Matrix',                      'Background', 'Matrix',                      false, 'ELECTRIC', 5, 'PSYCHE',   2, 'sp_atk',  3),
  'Background_Moms-Basement':               e('Background_Moms-Basement',               'Background', 'Moms Basement',               false, 'NEUTRAL',  5, 'PSYCHE',   2, 'sp_def',  3),
  'Background_Moon':                        e('Background_Moon',                        'Background', 'Moon',                        false, 'AIR',      5, 'PSYCHE',   2, 'sp_def',  3),
  'Background_Nesting-Grounds':             e('Background_Nesting-Grounds',             'Background', 'Nesting Grounds',             false, 'GRASS',    5, 'WATER',    2, 'sp_def',  3),
  'Background_NYSE-Dump':                   e('Background_NYSE-Dump',                   'Background', 'NYSE Dump',                   false, 'SHADOW',   5, 'NEUTRAL',  2, 'speed',   3),
  'Background_NYSE-Pump':                   e('Background_NYSE-Pump',                   'Background', 'NYSE Pump',                   false, 'ELECTRIC', 5, 'DRAGON',   2, 'speed',   3),
  'Background_One-Market':                  e('Background_One-Market',                  'Background', 'One Market',                  false, 'NEUTRAL',  5, 'METAL',    2, 'defense', 3),
  'Background_Orange-Grove':                e('Background_Orange-Grove',                'Background', 'Orange Grove',                false, 'GRASS',    5, 'FIRE',     2, 'sp_def',  3),
  'Background_Ronin-Dojo':                  e('Background_Ronin-Dojo',                  'Background', 'Ronin Dojo',                  false, 'MARTIAL',  5, 'EARTH',    2, 'attack',  3),
  'Background_Route-66':                    e('Background_Route-66',                    'Background', 'Route 66',                    false, 'EARTH',    5, 'AIR',      2, 'speed',   3),
  'Background_Silicon.net-Data-Center':     e('Background_Silicon.net-Data-Center',     'Background', 'Silicon.net Data Center',     false, 'ELECTRIC', 5, 'METAL',    2, 'sp_atk',  3),
  'Background_Spell-Room':                  e('Background_Spell-Room',                  'Background', 'Spell Room',                  false, 'PSYCHE',   5, 'MYSTIC',   2, 'sp_atk',  3),
  'Background_White-House':                 e('Background_White-House',                 'Background', 'White House',                 false, 'NEUTRAL',  5, 'MARTIAL',  2, 'defense', 3),
  // Solid Color: types determined dynamically by chosen color via hue mapping
  'Background_Solid-Color':                 e('Background_Solid-Color',                 'Background', 'Solid Color',                 true,  'NEUTRAL',  0, null,       0, null,      0),

  // ── Background — Phase 6 (NEW) (14) ───────────────────────────────
  'Background_Frozen-Tundra':               e('Background_Frozen-Tundra',               'Background', 'Frozen Tundra',               false, 'ICE',      5, 'WATER',    2, 'sp_def',  3),
  'Background_Deep-Ocean':                  e('Background_Deep-Ocean',                  'Background', 'Deep Ocean',                  false, 'WATER',    5, 'ICE',      2, 'sp_def',  3),
  'Background_Jungle-Canopy':               e('Background_Jungle-Canopy',               'Background', 'Jungle Canopy',               false, 'GRASS',    5, 'INSECT',   2, 'sp_atk',  3),
  'Background_Sky-Fortress':                e('Background_Sky-Fortress',                'Background', 'Sky Fortress',                false, 'AIR',      5, 'DRAGON',   2, 'speed',   3),
  'Background_Ancient-Quarry':              e('Background_Ancient-Quarry',              'Background', 'Ancient Quarry',              false, 'STONE',    5, 'EARTH',    2, 'defense', 3),
  'Background_Hive-Nest':                   e('Background_Hive-Nest',                   'Background', 'Hive Nest',                   false, 'INSECT',   5, 'VENOM',    2, 'speed',   3),
  'Background_Thunderstorm':                e('Background_Thunderstorm',                'Background', 'Thunderstorm',                false, 'ELECTRIC', 5, 'AIR',      2, 'sp_atk',  3),
  'Background_Toxic-Swamp':                 e('Background_Toxic-Swamp',                 'Background', 'Toxic Swamp',                 false, 'VENOM',    5, 'GRASS',    2, 'sp_atk',  3),
  'Background_Dragons-Lair':                e('Background_Dragons-Lair',                'Background', 'Dragons Lair',                false, 'DRAGON',   5, 'FIRE',     2, 'attack',  3),
  'Background_Graveyard':                   e('Background_Graveyard',                   'Background', 'Graveyard',                   false, 'GHOST',    5, 'SHADOW',   2, 'sp_atk',  3),
  'Background_Colosseum-Arena':             e('Background_Colosseum-Arena',             'Background', 'Colosseum Arena',             false, 'MARTIAL',  5, 'STONE',    2, 'attack',  3),
  'Background_Crystal-Cave':                e('Background_Crystal-Cave',                'Background', 'Crystal Cave',                false, 'MYSTIC',   5, 'PSYCHE',   2, 'sp_atk',  3),
  'Background_Dark-Alley':                  e('Background_Dark-Alley',                  'Background', 'Dark Alley',                  false, 'SHADOW',   5, 'VENOM',    2, 'speed',   3),
  'Background_Steel-Forge':                 e('Background_Steel-Forge',                 'Background', 'Steel Forge',                 false, 'METAL',    5, 'FIRE',     2, 'defense', 3),

  // ── Base (5) ───────────────────────────────────────────────────────
  'Base_Classic':                           e('Base_Classic',                           'Base', 'Classic',                      false, 'NEUTRAL',  5, null,       0, null,      0),
  'Base_Rekt':                              e('Base_Rekt',                              'Base', 'Rekt',                         false, 'GHOST',    5, 'SHADOW',   2, 'sp_def',  3),
  'Base_Rugged':                            e('Base_Rugged',                            'Base', 'Rugged',                       false, 'EARTH',    5, 'MARTIAL',  2, 'defense', 3),
  'Base_Bleeding-Bags':                     e('Base_Bleeding-Bags',                     'Base', 'Bleeding Bags',                false, 'GHOST',    5, 'VENOM',    2, 'sp_def',  3),
  'Base_Terminator':                        e('Base_Terminator',                        'Base', 'Terminator',                   false, 'METAL',    5, 'ELECTRIC', 2, 'attack',  3),

  // ── Clothes (30) ──────────────────────────────────────────────────
  'Clothes_Astronaut':                      e('Clothes_Astronaut',                      'Clothes', 'Astronaut',                 true,  'AIR',      5, 'METAL',    2, 'sp_def',  3),
  'Clothes_Bathrobe':                       e('Clothes_Bathrobe',                       'Clothes', 'Bathrobe',                  true,  'NEUTRAL',  5, 'MYSTIC',   2, 'sp_def',  3),
  'Clothes_Bepe-army':                      e('Clothes_Bepe-army',                      'Clothes', 'Bepe Army',                 true,  'MARTIAL',  5, 'INSECT',   2, 'attack',  3),
  'Clothes_Bepe-suit':                      e('Clothes_Bepe-suit',                      'Clothes', 'Bepe Suit',                 false, 'INSECT',   5, 'NEUTRAL',  2, 'speed',   3),
  'Clothes_Born-to-ride':                   e('Clothes_Born-to-ride',                   'Clothes', 'Born to Ride',              true,  'SHADOW',   5, 'FIRE',     2, 'speed',   3),
  'Clothes_Chia-farmer':                    e('Clothes_Chia-farmer',                    'Clothes', 'Chia Farmer',               true,  'GRASS',    5, 'EARTH',    2, 'defense', 3),
  'Clothes_Drac-suit':                      e('Clothes_Drac-suit',                      'Clothes', 'Drac Suit',                 false, 'GHOST',    5, 'SHADOW',   2, 'sp_atk',  3),
  'Clothes_fire-figther':                   e('Clothes_fire-figther',                   'Clothes', 'Firefighter Uniform',       true,  'FIRE',     5, 'MARTIAL',  2, 'defense', 3),
  'Clothes_Goose-suit':                     e('Clothes_Goose-suit',                     'Clothes', 'Goose Suit',                false, 'AIR',      5, 'NEUTRAL',  2, 'speed',   3),
  'Clothes_Leather-jacket':                 e('Clothes_Leather-jacket',                 'Clothes', 'Leather Jacket',            true,  'SHADOW',   5, 'MARTIAL',  2, 'attack',  3),
  'Clothes_Military-jacket':                e('Clothes_Military-jacket',                'Clothes', 'Military Jacket',           true,  'MARTIAL',  5, 'EARTH',    2, 'defense', 3),
  'Clothes_Ninja-turtle-fit':               e('Clothes_Ninja-turtle-fit',               'Clothes', 'Ninja Turtle Fit',          true,  'MARTIAL',  5, 'WATER',    2, 'speed',   3),
  'Clothes_Pepe-suit':                      e('Clothes_Pepe-suit',                      'Clothes', 'Pepe Suit',                 false, 'INSECT',   5, 'WATER',    2, 'sp_def',  3),
  'Clothes_Pickle-suit':                    e('Clothes_Pickle-suit',                    'Clothes', 'Pickle Suit',               false, 'GRASS',    5, 'VENOM',    2, 'sp_def',  3),
  'Clothes_Proof-of-prayer':                e('Clothes_Proof-of-prayer',                'Clothes', 'Proof of Prayer',           false, 'MYSTIC',   5, 'PSYCHE',   2, 'sp_def',  3),
  'Clothes_Roman-drip':                     e('Clothes_Roman-drip',                     'Clothes', 'Roman Drip',                true,  'MARTIAL',  5, 'STONE',    2, 'attack',  3),
  'Clothes_Ronin':                          e('Clothes_Ronin',                          'Clothes', 'Ronin',                     true,  'MARTIAL',  5, 'SHADOW',   2, 'attack',  3),
  'Clothes_SWAT':                           e('Clothes_SWAT',                           'Clothes', 'SWAT',                      true,  'MARTIAL',  5, 'METAL',    2, 'defense', 3),
  'Clothes_Sonic-suit':                     e('Clothes_Sonic-suit',                     'Clothes', 'Sonic Suit',                true,  'ELECTRIC', 5, 'AIR',      2, 'speed',   3),
  'Clothes_Sports-jacket':                  e('Clothes_Sports-jacket',                  'Clothes', 'Sports Jacket',             true,  'MARTIAL',  5, 'NEUTRAL',  2, 'speed',   3),
  'Clothes_Straigth-jacket':                e('Clothes_Straigth-jacket',                'Clothes', 'Straight Jacket',           true,  'PSYCHE',   5, 'GHOST',    2, 'attack',  3),
  'Clothes_Suit':                           e('Clothes_Suit',                           'Clothes', 'Suit',                      true,  'NEUTRAL',  5, 'SHADOW',   2, 'sp_atk',  3),
  'Clothes_Super-Saiyan':                   e('Clothes_Super-Saiyan',                   'Clothes', 'Super Saiyan',              true,  'DRAGON',   5, 'FIRE',     2, 'attack',  3),
  'Clothes_Tank-top':                       e('Clothes_Tank-top',                       'Clothes', 'Tank Top',                  true,  'NEUTRAL',  5, 'MARTIAL',  2, 'attack',  3),
  'Clothes_Tee':                            e('Clothes_Tee',                            'Clothes', 'Tee',                       true,  'NEUTRAL',  5, null,       0, null,      0),
  'Clothes_Viking-Armor':                   e('Clothes_Viking-Armor',                   'Clothes', 'Viking Armor',              true,  'MARTIAL',  5, 'ICE',      2, 'attack',  3),
  'Clothes_Wizard-drip':                    e('Clothes_Wizard-drip',                    'Clothes', 'Wizard Drip',               true,  'PSYCHE',   5, 'MYSTIC',   2, 'sp_atk',  3),
  'Clothes_gods-robe':                      e('Clothes_gods-robe',                      'Clothes', 'Gods Robe',                 true,  'MYSTIC',   5, 'DRAGON',   2, 'sp_def',  3),
  'Clothes_gopher-suit':                    e('Clothes_gopher-suit',                    'Clothes', 'Gopher Suit',               false, 'EARTH',    5, 'INSECT',   2, 'defense', 3),
  'Clothes_topless':                        e('Clothes_topless',                        'Clothes', 'Topless',                   false, 'NEUTRAL',  5, 'MARTIAL',  2, 'attack',  3),

  // ── Facial Hair (2) ───────────────────────────────────────────────
  'Facial-Hair_Neckbeard':                  e('Facial-Hair_Neckbeard',                  'Facial Hair', 'Neckbeard',             false, 'NEUTRAL',  5, 'PSYCHE',   2, 'sp_def',  3),
  'Facial-Hair_Stache':                     e('Facial-Hair_Stache',                     'Facial Hair', 'Stache',                false, 'NEUTRAL',  5, 'FIRE',     2, 'attack',  3),

  // ── Mouth (8) ─────────────────────────────────────────────────────
  'Mouth_Numb':                             e('Mouth_Numb',                             'Mouth', 'Numb',                       false, 'NEUTRAL',  5, null,       0, null,      0),
  'Mouth_Smile':                            e('Mouth_Smile',                            'Mouth', 'Smile',                      false, 'MYSTIC',   5, 'NEUTRAL',  2, 'sp_def',  3),
  'Mouth_Screaming':                        e('Mouth_Screaming',                        'Mouth', 'Screaming',                  false, 'DRAGON',   5, 'FIRE',     2, 'attack',  3),
  'Mouth_Teeth':                            e('Mouth_Teeth',                            'Mouth', 'Teeth',                      false, 'SHADOW',   5, 'MARTIAL',  2, 'attack',  3),
  'Mouth_Gold-Teeth':                       e('Mouth_Gold-Teeth',                       'Mouth', 'Gold Teeth',                 false, 'DRAGON',   5, 'METAL',    2, 'sp_atk',  3),
  'Mouth_Pizza':                            e('Mouth_Pizza',                            'Mouth', 'Pizza',                      false, 'NEUTRAL',  5, 'FIRE',     2, 'sp_def',  3),
  'Mouth_Pipe':                             e('Mouth_Pipe',                             'Mouth', 'Pipe',                       true,  'PSYCHE',   5, 'FIRE',     2, 'sp_atk',  3),
  'Mouth_BubbleGum':                        e('Mouth_BubbleGum',                        'Mouth', 'Bubble Gum',                 true,  'MYSTIC',   5, 'VENOM',    2, 'sp_def',  3),

  // ── Mouth Item (3) ────────────────────────────────────────────────
  'MouthItem_Cig':                          e('MouthItem_Cig',                          'Mouth Item', 'Cig',                   false, 'VENOM',    5, 'SHADOW',   2, 'speed',   3),
  'MouthItem_Joint':                        e('MouthItem_Joint',                        'Mouth Item', 'Joint',                 false, 'GRASS',    5, 'VENOM',    2, 'sp_def',  3),
  'MouthItem_Cohiba':                       e('MouthItem_Cohiba',                       'Mouth Item', 'Cohiba',                false, 'FIRE',     5, 'SHADOW',   2, 'sp_atk',  3),

  // ── Mask (5) ──────────────────────────────────────────────────────
  'Mask_Bandana-mask':                      e('Mask_Bandana-mask',                      'Mask', 'Bandana Mask',                true,  'SHADOW',   5, 'MARTIAL',  2, 'speed',   3),
  'Mask_Hannibal-Mask':                     e('Mask_Hannibal-Mask',                     'Mask', 'Hannibal Mask',               false, 'GHOST',    5, 'SHADOW',   2, 'sp_def',  3),
  'Mask_Copium-Mask':                       e('Mask_Copium-Mask',                       'Mask', 'Copium Mask',                 false, 'VENOM',    5, 'PSYCHE',   2, 'sp_def',  3),
  'Mask_Hand-Mask':                         e('Mask_Hand-Mask',                         'Mask', 'Hand Mask',                   false, 'GHOST',    5, 'PSYCHE',   2, 'sp_atk',  3),
  'Mask_Skull-Mask':                        e('Mask_Skull-Mask',                        'Mask', 'Skull Mask',                  false, 'GHOST',    5, 'SHADOW',   2, 'attack',  3),

  // ── Eyes (15) ─────────────────────────────────────────────────────
  // NOTE: The CSV layer is "Eyes" but the manifest stores these under
  // "Face-wear" / "Face-laser". IDs use manifest IDs where they exist,
  // constructed "Eyes_*" IDs otherwise.
  'Face-wear_3d-glases':                    e('Face-wear_3d-glases',                    'Eyes', '3D Glasses',                  true,  'PSYCHE',   5, 'ELECTRIC', 2, 'sp_atk',  3),
  'Face-wear_alpha-shades':                 e('Face-wear_alpha-shades',                 'Eyes', 'Alpha Shades',                true,  'SHADOW',   5, 'DRAGON',   2, 'attack',  3),
  'Face-wear_aviators':                     e('Face-wear_aviators',                     'Eyes', 'Aviators',                    true,  'AIR',      5, 'INSECT',   2, 'speed',   3),
  'Eyes_Cool-Glasses':                      e('Eyes_Cool-Glasses',                      'Eyes', 'Cool Glasses',                false, 'NEUTRAL',  5, 'ICE',      2, 'sp_def',  3),
  'Face-wear_cyber-shades':                 e('Face-wear_cyber-shades',                 'Eyes', 'Cyber Shades',                true,  'ELECTRIC', 5, 'METAL',    2, 'sp_atk',  3),
  'Eyes_Eye-Patch':                         e('Eyes_Eye-Patch',                         'Eyes', 'Eye Patch',                   false, 'SHADOW',   5, 'WATER',    2, 'attack',  3),
  'Face-laser_Laser-Eyes':                  e('Face-laser_Laser-Eyes',                  'Eyes', 'Laser Eyes',                  true,  'FIRE',     5, 'ELECTRIC', 2, 'sp_atk',  3),
  'Face-wear_Matrix-Lenses':                e('Face-wear_Matrix-Lenses',                'Eyes', 'Matrix Lenses',               true,  'PSYCHE',   5, 'SHADOW',   2, 'sp_atk',  3),
  'Face-wear_MOG-Glasses':                  e('Face-wear_MOG-Glasses',                  'Eyes', 'MOG Glasses',                 false, 'MYSTIC',   5, 'NEUTRAL',  2, 'sp_def',  3),
  'Eyes_Ninja-Turtle-Mask':                 e('Eyes_Ninja-Turtle-Mask',                 'Eyes', 'Ninja Turtle Mask',           true,  'MARTIAL',  5, 'WATER',    2, 'speed',   3),
  'Eyes_Night-Vision':                      e('Eyes_Night-Vision',                      'Eyes', 'Night Vision',                true,  'ELECTRIC', 5, 'EARTH',    2, 'sp_atk',  3),
  'Face-wear_shades':                       e('Face-wear_shades',                       'Eyes', 'Shades',                      true,  'SHADOW',   5, 'NEUTRAL',  2, 'speed',   3),
  'Eyes_Tyson-Tattoo':                      e('Eyes_Tyson-Tattoo',                      'Eyes', 'Tyson Tattoo',                false, 'MARTIAL',  5, 'SHADOW',   2, 'attack',  3),
  'Face-wear_VR-headset':                   e('Face-wear_VR-headset',                   'Eyes', 'VR Headset',                  true,  'ELECTRIC', 5, 'PSYCHE',   2, 'sp_atk',  3),
  'Eyes_Wizard-Glasses':                    e('Eyes_Wizard-Glasses',                    'Eyes', 'Wizard Glasses',              false, 'PSYCHE',   5, 'MYSTIC',   2, 'sp_atk',  3),

  // ── Head (30) ─────────────────────────────────────────────────────
  'Head_2Pac-Bandana':                      e('Head_2Pac-Bandana',                      'Head', '2Pac Bandana',                true,  'SHADOW',   5, 'MARTIAL',  2, 'attack',  3),
  'Head_Spikes':                            e('Head_Spikes',                            'Head', 'Anarchy Spikes',              true,  'SHADOW',   5, 'FIRE',     2, 'attack',  3),
  'Head_Beanie':                            e('Head_Beanie',                            'Head', 'Beanie',                      true,  'NEUTRAL',  5, 'ICE',      2, 'sp_def',  3),
  'Head_Beer-Hat':                          e('Head_Beer-Hat',                          'Head', 'Beer Hat',                    false, 'NEUTRAL',  5, 'VENOM',    2, 'sp_def',  3),
  'Head_Cap':                               e('Head_Cap',                               'Head', 'Cap',                         true,  'NEUTRAL',  5, 'AIR',      2, 'speed',   3),
  'Head_Centurion':                         e('Head_Centurion',                         'Head', 'Centurion',                   true,  'MARTIAL',  5, 'STONE',    2, 'defense', 3),
  'Head_Clown':                             e('Head_Clown',                             'Head', 'Clown',                       true,  'MYSTIC',   5, 'PSYCHE',   2, 'sp_atk',  3),
  'Head_Comrad-Hat':                        e('Head_Comrad-Hat',                        'Head', 'Comrade Hat',                 true,  'MARTIAL',  5, 'FIRE',     2, 'attack',  3),
  'Head_Construction-Helmet':               e('Head_Construction-Helmet',               'Head', 'Construction Helmet',         true,  'EARTH',    5, 'METAL',    2, 'defense', 3),
  'Head_Cowboy-Hat':                        e('Head_Cowboy-Hat',                        'Head', 'Cowboy Hat',                  true,  'EARTH',    5, 'AIR',      2, 'speed',   3),
  'Head_Crown':                             e('Head_Crown',                             'Head', 'Crown',                       true,  'DRAGON',   5, 'METAL',    2, 'sp_atk',  3),
  'Head_Devil-horns':                       e('Head_Devil-horns',                       'Head', 'Devil Horns',                 true,  'FIRE',     5, 'SHADOW',   2, 'attack',  3),
  'Head_Fedora':                            e('Head_Fedora',                            'Head', 'Fedora',                      true,  'SHADOW',   5, 'PSYCHE',   2, 'sp_atk',  3),
  'Head_Field-Cap':                         e('Head_Field-Cap',                         'Head', 'Field Cap',                   false, 'EARTH',    5, 'MARTIAL',  2, 'defense', 3),
  'Head_Firefigther-Helmet':                e('Head_Firefigther-Helmet',                'Head', 'Firefighter Helmet',          true,  'FIRE',     5, 'METAL',    2, 'defense', 3),
  'Head_Hard-hat':                          e('Head_Hard-hat',                          'Head', 'Hard Hat',                    true,  'EARTH',    5, 'STONE',    2, 'defense', 3),
  'Head_Headphones':                        e('Head_Headphones',                        'Head', 'Headphones',                  false, 'ELECTRIC', 5, 'PSYCHE',   2, 'sp_def',  3),
  'Head_military-beret':                    e('Head_military-beret',                    'Head', 'Military Beret',              true,  'MARTIAL',  5, 'AIR',      2, 'speed',   3),
  'Head_Piccolo-Hat':                       e('Head_Piccolo-Hat',                       'Head', 'Piccolo Hat',                 false, 'MYSTIC',   5, 'DRAGON',   2, 'sp_atk',  3),
  'Head_Pirate-hat':                        e('Head_Pirate-hat',                        'Head', 'Pirate Hat',                  true,  'WATER',    5, 'SHADOW',   2, 'attack',  3),
  'Head_Propeller-Hat':                     e('Head_Propeller-Hat',                     'Head', 'Propeller Hat',               true,  'AIR',      5, 'NEUTRAL',  2, 'speed',   3),
  'Head_Ronin-helmet':                      e('Head_Ronin-helmet',                      'Head', 'Ronin Helmet',                true,  'MARTIAL',  5, 'METAL',    2, 'defense', 3),
  'Head_SWAT-helmet':                       e('Head_SWAT-helmet',                       'Head', 'SWAT Helmet',                 true,  'MARTIAL',  5, 'METAL',    2, 'defense', 3),
  'Head_Standard-Cut':                      e('Head_Standard-Cut',                      'Head', 'Standard Cut',                true,  'NEUTRAL',  5, null,       0, null,      0),
  'Head_Super-wojak':                       e('Head_Super-wojak',                       'Head', 'Super Mario Cap',             true,  'FIRE',     5, 'EARTH',    2, 'speed',   3),
  'Head_Super-Saiyan':                      e('Head_Super-Saiyan',                      'Head', 'Super Saiyan Hair',           true,  'DRAGON',   5, 'ELECTRIC', 2, 'attack',  3),
  'Head_Tin-Foil-Hat':                      e('Head_Tin-Foil-Hat',                      'Head', 'Tin Foil Hat',                false, 'ELECTRIC', 5, 'PSYCHE',   2, 'sp_def',  3),
  'Head_Trump-Wave':                        e('Head_Trump-Wave',                        'Head', 'Trump Wave',                  false, 'NEUTRAL',  5, 'DRAGON',   2, 'sp_atk',  3),
  'Head_viking-helmet':                     e('Head_viking-helmet',                     'Head', 'Viking Helmet',               true,  'ICE',      5, 'MARTIAL',  2, 'attack',  3),
  'Head_Wiz-Hat':                           e('Head_Wiz-Hat',                           'Head', 'Wiz Hat',                     true,  'PSYCHE',   5, 'MYSTIC',   2, 'sp_atk',  3),
};

// ---------- accessor ----------

/** Look up combat data for a trait by its manifest ID. */
export function getTraitCombat(traitId: string): TraitCombatEntry | undefined {
  return TRAIT_COMBAT_MAP[traitId];
}
