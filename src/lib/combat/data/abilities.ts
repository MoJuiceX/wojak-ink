import type { CombatType, Ability } from '../types';

/**
 * 36 abilities — 2 per type (variant A = offensive, variant B = defensive).
 * Ported from ClawCombat battle-engine.js ABILITIES section.
 */
export const ABILITIES: Ability[] = [
  // NEUTRAL
  { name: 'Adaptability',   type: 'NEUTRAL',  variant: 'A', description: 'STAB is 2.0 instead of 1.5',                    trigger: 'stab_calc' },
  { name: 'Resilience',     type: 'NEUTRAL',  variant: 'B', description: 'Super-effective hits do 0.75x',                  trigger: 'damage_taken' },
  // FIRE
  { name: 'Blaze',          type: 'FIRE',     variant: 'A', description: '+30% fire moves when HP < 33%',                  trigger: 'damage_calc' },
  { name: 'Inferno',        type: 'FIRE',     variant: 'B', description: '15% chance to burn on hit',                      trigger: 'after_hit' },
  // WATER
  { name: 'Torrent',        type: 'WATER',    variant: 'A', description: '+30% water moves when HP < 33%',                 trigger: 'damage_calc' },
  { name: 'Hydration',      type: 'WATER',    variant: 'B', description: 'Heal 6.25% HP per turn',                         trigger: 'end_turn' },
  // ELECTRIC
  { name: 'Static',         type: 'ELECTRIC', variant: 'A', description: '20% paralyze on contact',                        trigger: 'after_hit' },
  { name: 'Volt Absorb',    type: 'ELECTRIC', variant: 'B', description: 'Immune to electric, heal 25% HP',                trigger: 'before_hit' },
  // GRASS
  { name: 'Overgrow',       type: 'GRASS',    variant: 'A', description: '+30% grass moves when HP < 33%',                 trigger: 'damage_calc' },
  { name: 'Photosynthesis', type: 'GRASS',    variant: 'B', description: 'Heal 6.25% HP per turn',                         trigger: 'end_turn' },
  // ICE
  { name: 'Ice Body',       type: 'ICE',      variant: 'A', description: 'Heal 6.25% HP per turn',                         trigger: 'end_turn' },
  { name: 'Permafrost',     type: 'ICE',      variant: 'B', description: '10% freeze on hit',                              trigger: 'after_hit' },
  // MARTIAL
  { name: 'Guts',           type: 'MARTIAL',  variant: 'A', description: '+30% atk when statused',                         trigger: 'damage_calc' },
  { name: 'Iron Fist',      type: 'MARTIAL',  variant: 'B', description: '+10% physical moves',                            trigger: 'damage_calc' },
  // VENOM
  { name: 'Poison Touch',   type: 'VENOM',    variant: 'A', description: '15% poison on hit',                              trigger: 'after_hit' },
  { name: 'Corrosion',      type: 'VENOM',    variant: 'B', description: 'Ignore 15% defense',                             trigger: 'damage_calc' },
  // EARTH
  { name: 'Sand Force',     type: 'EARTH',    variant: 'A', description: '+15% atk/def',                                   trigger: 'battle_start' },
  { name: 'Sand Veil',      type: 'EARTH',    variant: 'B', description: '10% dodge chance',                               trigger: 'before_hit' },
  // AIR
  { name: 'Aerilate',       type: 'AIR',      variant: 'A', description: '+20% speed',                                     trigger: 'battle_start' },
  { name: 'Gale Wings',     type: 'AIR',      variant: 'B', description: 'Always go first when HP full',                   trigger: 'speed_calc' },
  // PSYCHE
  { name: 'Magic Guard',    type: 'PSYCHE',   variant: 'A', description: 'Immune to status damage',                        trigger: 'status_damage' },
  { name: 'Telepathy',      type: 'PSYCHE',   variant: 'B', description: '10% dodge chance',                               trigger: 'before_hit' },
  // INSECT
  { name: 'Swarm',          type: 'INSECT',   variant: 'A', description: '+30% bug moves when HP < 33%',                   trigger: 'damage_calc' },
  { name: 'Compound Eyes',  type: 'INSECT',   variant: 'B', description: '+30% accuracy',                                  trigger: 'accuracy_calc' },
  // STONE
  { name: 'Sturdy',         type: 'STONE',    variant: 'A', description: 'Survive any hit with 1 HP once',                 trigger: 'before_faint' },
  { name: 'Solid Rock',     type: 'STONE',    variant: 'B', description: 'Super-effective = 1.5x instead of 2.0x',         trigger: 'damage_taken' },
  // GHOST
  { name: 'Levitate',       type: 'GHOST',    variant: 'A', description: 'Immune to ground',                               trigger: 'before_hit' },
  { name: 'Cursed Body',    type: 'GHOST',    variant: 'B', description: '20% reduce opponent best stat by 1',             trigger: 'after_hit_received' },
  // DRAGON
  { name: 'Multiscale',     type: 'DRAGON',   variant: 'A', description: '25% less damage when HP full',                   trigger: 'damage_taken' },
  { name: 'Dragon Force',   type: 'DRAGON',   variant: 'B', description: '+10% Attack and Claw',                           trigger: 'battle_start' },
  // SHADOW
  { name: 'Dark Aura',      type: 'SHADOW',   variant: 'A', description: '+15% vs Psychic/Ghost/Fairy',                    trigger: 'damage_calc' },
  { name: 'Intimidate',     type: 'SHADOW',   variant: 'B', description: '-15% opponent atk at start',                     trigger: 'battle_start' },
  // METAL
  { name: 'Filter',         type: 'METAL',    variant: 'A', description: 'Super-effective = 1.5x',                         trigger: 'damage_taken' },
  { name: 'Heavy Metal',    type: 'METAL',    variant: 'B', description: '+20% def, -10% speed',                           trigger: 'battle_start' },
  // MYSTIC
  { name: 'Pixilate',       type: 'MYSTIC',   variant: 'A', description: '+15% vs Dragon/Dark/Fighting',                   trigger: 'damage_calc' },
  { name: 'Charm',          type: 'MYSTIC',   variant: 'B', description: '-15% opponent atk at start',                     trigger: 'battle_start' },
];

export function getAbilitiesForType(type: CombatType): [Ability, Ability] {
  const pair = ABILITIES.filter(a => a.type === type);
  return pair as [Ability, Ability];
}

export function getAbility(name: string): Ability | undefined {
  return ABILITIES.find(a => a.name === name);
}
