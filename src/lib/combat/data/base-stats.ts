import type { CombatType, BaseStats } from '../types';

export const BASE_STATS: Record<CombatType, BaseStats> = {
  NEUTRAL:  { hp: 85, attack: 80,  defense: 80,  sp_atk: 80,  sp_def: 80,  speed: 80  },
  FIRE:     { hp: 75, attack: 90,  defense: 65,  sp_atk: 100, sp_def: 70,  speed: 85  },
  WATER:    { hp: 85, attack: 75,  defense: 85,  sp_atk: 85,  sp_def: 90,  speed: 65  },
  ELECTRIC: { hp: 65, attack: 70,  defense: 60,  sp_atk: 105, sp_def: 65,  speed: 120 },
  GRASS:    { hp: 85, attack: 80,  defense: 85,  sp_atk: 85,  sp_def: 90,  speed: 60  },
  ICE:      { hp: 75, attack: 85,  defense: 70,  sp_atk: 100, sp_def: 75,  speed: 80  },
  MARTIAL:  { hp: 80, attack: 110, defense: 75,  sp_atk: 50,  sp_def: 70,  speed: 100 },
  VENOM:    { hp: 75, attack: 85,  defense: 70,  sp_atk: 95,  sp_def: 80,  speed: 80  },
  EARTH:    { hp: 90, attack: 95,  defense: 100, sp_atk: 55,  sp_def: 70,  speed: 75  },
  AIR:      { hp: 75, attack: 80,  defense: 65,  sp_atk: 80,  sp_def: 65,  speed: 120 },
  PSYCHE:   { hp: 70, attack: 55,  defense: 65,  sp_atk: 115, sp_def: 85,  speed: 95  },
  INSECT:   { hp: 75, attack: 95,  defense: 80,  sp_atk: 70,  sp_def: 75,  speed: 90  },
  STONE:    { hp: 80, attack: 100, defense: 120, sp_atk: 50,  sp_def: 60,  speed: 75  },
  GHOST:    { hp: 70, attack: 80,  defense: 60,  sp_atk: 100, sp_def: 80,  speed: 95  },
  DRAGON:   { hp: 75, attack: 95,  defense: 75,  sp_atk: 95,  sp_def: 75,  speed: 70  },
  SHADOW:   { hp: 75, attack: 95,  defense: 65,  sp_atk: 90,  sp_def: 70,  speed: 90  },
  METAL:    { hp: 75, attack: 80,  defense: 120, sp_atk: 65,  sp_def: 85,  speed: 60  },
  MYSTIC:   { hp: 80, attack: 60,  defense: 70,  sp_atk: 100, sp_def: 110, speed: 65  },
};

export function getBaseStats(type: CombatType): BaseStats {
  return BASE_STATS[type];
}
