// src/lib/combat/ability-effects.ts
// Ability trigger handlers for all 36 abilities
// Ported from ClawCombat battle-engine.js applyAbilityEffects()

import type { FighterState } from './battle-state';
import type { CombatType, MoveCategory } from './types';

export interface AbilityContext {
  self: FighterState;
  opponent: FighterState;
  moveType?: CombatType;
  moveCategory?: MoveCategory;
  movePower?: number;
}

export interface AbilityEffect {
  damageMultiplier?: number;
  healPercent?: number;
  statusToApply?: string;
  statusChance?: number;
  opponentStatMultipliers?: Partial<Record<string, number>>;
  selfStatMultipliers?: Partial<Record<string, number>>;
  immuneTo?: string;
  dodgeChance?: number;
  surviveWith1HP?: boolean;
  speedMultiplier?: number;
  accuracyMultiplier?: number;
  priorityBoost?: number;
  defenseIgnorePercent?: number;
  opponentStatDrop?: boolean;
}

/**
 * Get the effect of an ability at a given trigger point.
 * Returns null if the ability doesn't trigger at this point or conditions aren't met.
 */
export function getAbilityEffect(
  abilityName: string,
  trigger: string,
  context: AbilityContext,
): AbilityEffect | null {
  const { self, opponent, moveType, moveCategory } = context;
  const hpRatio = self.currentHP / self.maxHP;

  // battle_start
  if (trigger === 'battle_start') {
    switch (abilityName) {
      case 'Sand Force':
        return { selfStatMultipliers: { attack: 1.15, defense: 1.15 } };
      case 'Aerilate':
        return { selfStatMultipliers: { speed: 1.2 } };
      case 'Dragon Force':
        return { selfStatMultipliers: { attack: 1.1, sp_atk: 1.1 } };
      case 'Intimidate':
        return { opponentStatMultipliers: { attack: 0.85 } };
      case 'Charm':
        return { opponentStatMultipliers: { attack: 0.85 } };
      case 'Heavy Metal':
        return { selfStatMultipliers: { defense: 1.2, speed: 0.9 } };
    }
  }

  // damage_calc — modifies outgoing damage
  if (trigger === 'damage_calc') {
    switch (abilityName) {
      case 'Blaze':
        if (hpRatio < 0.33 && moveType === 'FIRE') return { damageMultiplier: 1.3 };
        return null;
      case 'Torrent':
        if (hpRatio < 0.33 && moveType === 'WATER') return { damageMultiplier: 1.3 };
        return null;
      case 'Overgrow':
        if (hpRatio < 0.33 && moveType === 'GRASS') return { damageMultiplier: 1.3 };
        return null;
      case 'Swarm':
        if (hpRatio < 0.33 && moveType === 'INSECT') return { damageMultiplier: 1.3 };
        return null;
      case 'Guts':
        if (self.status) return { damageMultiplier: 1.3 };
        return null;
      case 'Iron Fist':
        if (moveCategory === 'physical') return { damageMultiplier: 1.1 };
        return null;
      case 'Dark Aura':
        if (opponent.type === 'PSYCHE' || opponent.type === 'GHOST' || opponent.type === 'MYSTIC')
          return { damageMultiplier: 1.15 };
        return null;
      case 'Pixilate':
        if (opponent.type === 'DRAGON' || opponent.type === 'SHADOW' || opponent.type === 'MARTIAL')
          return { damageMultiplier: 1.15 };
        return null;
      case 'Corrosion':
        return { defenseIgnorePercent: 0.15 };
    }
  }

  // damage_taken — modifies incoming damage on the defender
  if (trigger === 'damage_taken') {
    switch (abilityName) {
      case 'Resilience':
        return { damageMultiplier: 0.75 };
      case 'Solid Rock':
        // Already handled by type eff cap, but signals the engine
        return { damageMultiplier: 0.75 };
      case 'Filter':
        return { damageMultiplier: 0.75 };
      case 'Multiscale':
        if (self.currentHP === self.maxHP) return { damageMultiplier: 0.75 };
        return null;
    }
  }

  // before_hit — type immunities and dodge
  if (trigger === 'before_hit') {
    switch (abilityName) {
      case 'Volt Absorb':
        if (moveType === 'ELECTRIC') return { immuneTo: 'ELECTRIC', healPercent: 0.25 };
        return null;
      case 'Levitate':
        if (moveType === 'EARTH') return { immuneTo: 'EARTH' };
        return null;
      case 'Telepathy':
        return { dodgeChance: 0.1 };
      case 'Sand Veil':
        return { dodgeChance: 0.1 };
    }
  }

  // after_hit — effects on the attacker after hitting
  if (trigger === 'after_hit') {
    switch (abilityName) {
      case 'Inferno':
        return { statusToApply: 'burn', statusChance: 0.15 };
      case 'Permafrost':
        return { statusToApply: 'freeze', statusChance: 0.1 };
      case 'Poison Touch':
        return { statusToApply: 'poison', statusChance: 0.15 };
    }
  }

  // after_hit_received — defender's ability triggers after being hit
  if (trigger === 'after_hit_received') {
    switch (abilityName) {
      case 'Static':
        if (moveCategory === 'physical') return { statusToApply: 'paralysis', statusChance: 0.2 };
        return null;
      case 'Cursed Body':
        return { opponentStatDrop: true, statusChance: 0.2 };
    }
  }

  // before_faint — last-chance survival
  if (trigger === 'before_faint') {
    switch (abilityName) {
      case 'Sturdy':
        if (!self.sturdyUsed) return { surviveWith1HP: true };
        return null;
    }
  }

  // end_turn — passive healing
  if (trigger === 'end_turn') {
    switch (abilityName) {
      case 'Hydration':
      case 'Photosynthesis':
      case 'Ice Body':
        return { healPercent: 0.0625 };
    }
  }

  // status_damage — immunity
  if (trigger === 'status_damage') {
    switch (abilityName) {
      case 'Magic Guard':
        return { immuneTo: 'status_damage' };
    }
  }

  // accuracy_calc
  if (trigger === 'accuracy_calc') {
    switch (abilityName) {
      case 'Compound Eyes':
        return { accuracyMultiplier: 1.3 };
    }
  }

  // speed_calc
  if (trigger === 'speed_calc') {
    switch (abilityName) {
      case 'Gale Wings':
        if (self.currentHP === self.maxHP) return { priorityBoost: 1 };
        return null;
    }
  }

  return null;
}
