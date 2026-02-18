// src/lib/combat/data/natures.ts
// Ported from ClawCombat pokeapi-natures.json — 25 natures

import type { Nature, StatName } from '../types';

export const NATURES: Nature[] = [
  { name: 'Sturdy',     boost: null,      reduce: null      },
  { name: 'Defiant',    boost: 'defense', reduce: 'attack'  },
  { name: 'Calculated', boost: 'sp_atk',  reduce: 'attack'  },
  { name: 'Tranquil',   boost: 'sp_def',  reduce: 'attack'  },
  { name: 'Evasive',    boost: 'speed',   reduce: 'attack'  },
  { name: 'Savage',     boost: 'attack',  reduce: 'sp_def'  },
  { name: 'Balanced',   boost: null,      reduce: null       },
  { name: 'Focused',    boost: 'sp_atk',  reduce: 'defense' },
  { name: 'Mellow',     boost: 'sp_def',  reduce: 'defense' },
  { name: 'Rapid',      boost: 'speed',   reduce: 'defense' },
  { name: 'Brutal',     boost: 'attack',  reduce: 'sp_atk'  },
  { name: 'Vigilant',   boost: 'defense', reduce: 'sp_atk'  },
  { name: 'Quiet',      boost: null,      reduce: null       },
  { name: 'Alert',      boost: 'sp_def',  reduce: 'sp_atk'  },
  { name: 'Impulsive',  boost: 'sp_atk',  reduce: 'sp_def'  },
  { name: 'Energetic',  boost: 'speed',   reduce: 'sp_atk'  },
  { name: 'Wild',       boost: 'attack',  reduce: 'defense' },
  { name: 'Relaxed',    boost: 'defense', reduce: 'sp_def'  },
  { name: 'Eccentric',  boost: null,      reduce: null       },
  { name: 'Innocent',   boost: 'speed',   reduce: 'sp_def'  },
  { name: 'Fearless',   boost: 'attack',  reduce: 'speed'   },
  { name: 'Sluggish',   boost: 'defense', reduce: 'speed'   },
  { name: 'Silent',     boost: 'sp_atk',  reduce: 'speed'   },
  { name: 'Stubborn',   boost: 'sp_def',  reduce: 'speed'   },
  { name: 'Grim',       boost: null,      reduce: null       },
];

/** Lookup a nature by name (case-insensitive) */
export function getNature(name: string): Nature | undefined {
  const lower = name.toLowerCase();
  return NATURES.find((n) => n.name.toLowerCase() === lower);
}

/** Find the nature matching a given boost/reduce combo, or fall back to Balanced */
export function getNatureByStats(
  boost: StatName | null,
  reduce: StatName | null,
): Nature {
  if (boost === null && reduce === null) {
    return NATURES.find((n) => n.name === 'Balanced')!;
  }
  return (
    NATURES.find((n) => n.boost === boost && n.reduce === reduce) ??
    NATURES.find((n) => n.name === 'Balanced')!
  );
}
