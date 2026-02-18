// src/lib/combat/turn-resolver.ts
// Turn resolution engine — ported from ClawCombat battle-engine.js resolveTurn()
// This is the core battle logic: status checks → move order → execute → end-of-turn

import type { BattleState, FighterState, TurnResult } from './battle-state';
import { calculateDamage, getStatStageMultiplier } from './damage-calculator';
import { applyStatusDamage, checkStatusSkip, tickStatus } from './status-effects';
import { getAbilityEffect } from './ability-effects';
import { getMoveById } from './data/moves';
import { getEffectiveness } from './data/type-chart';
import type { CombatType } from './types';

type RNG = () => number;

/**
 * Get effective speed for move ordering, including stat stages and paralysis.
 */
function getEffectiveSpeed(fighter: FighterState): number {
  let speed = fighter.effectiveStats.speed * getStatStageMultiplier(fighter.statStages.spe);
  if (fighter.status === 'paralysis') speed *= 0.75;
  return speed;
}

/**
 * Determine effectiveness label for TurnResult.
 */
function getEffectivenessLabel(raw: number): 'super_effective' | 'not_very_effective' | 'neutral' | 'immune' {
  if (raw === 0) return 'immune';
  if (raw > 1) return 'super_effective';
  if (raw < 1) return 'not_very_effective';
  return 'neutral';
}

/**
 * Apply a move from attacker to defender.
 * Returns damage dealt, crit, status applied, heal amount.
 */
function applyMove(
  battle: BattleState,
  attacker: FighterState,
  defender: FighterState,
  moveId: string,
  rng: RNG,
): { damage: number; crit: boolean; effectiveness: number; statusApplied: string | null; healAmount: number; skipped: boolean } {
  const move = getMoveById(moveId);
  if (!move) return { damage: 0, crit: false, effectiveness: 1.0, statusApplied: null, healAmount: 0, skipped: false };

  // Flinch check
  if (attacker.flinched) {
    attacker.flinched = false;
    return { damage: 0, crit: false, effectiveness: 1.0, statusApplied: null, healAmount: 0, skipped: true };
  }

  // Status skip checks
  if (attacker.status === 'freeze' || attacker.status === 'sleep') {
    return { damage: 0, crit: false, effectiveness: 1.0, statusApplied: null, healAmount: 0, skipped: true };
  }
  if (attacker.status === 'paralysis' && checkStatusSkip('paralysis', rng())) {
    return { damage: 0, crit: false, effectiveness: 1.0, statusApplied: null, healAmount: 0, skipped: true };
  }
  if (attacker.status === 'confusion') {
    if (checkStatusSkip('confusion', rng())) {
      // Self-hit: deal damage to self
      const selfDmg = Math.max(1, Math.floor(attacker.maxHP * 0.1));
      attacker.currentHP = Math.max(0, attacker.currentHP - selfDmg);
      return { damage: 0, crit: false, effectiveness: 1.0, statusApplied: null, healAmount: 0, skipped: true };
    }
  }

  // Defender ability: before_hit (dodge, immunity)
  const defBeforeHit = getAbilityEffect(defender.ability, 'before_hit', {
    self: defender, opponent: attacker, moveType: move.type, moveCategory: move.category, movePower: move.power,
  });
  if (defBeforeHit) {
    // Immunity (Volt Absorb, Levitate)
    if (defBeforeHit.immuneTo === move.type) {
      if (defBeforeHit.healPercent) {
        const heal = Math.floor(defender.maxHP * defBeforeHit.healPercent);
        defender.currentHP = Math.min(defender.maxHP, defender.currentHP + heal);
      }
      return { damage: 0, crit: false, effectiveness: 0, statusApplied: null, healAmount: 0, skipped: false };
    }
    // Dodge (Telepathy, Sand Veil)
    if (defBeforeHit.dodgeChance && rng() < defBeforeHit.dodgeChance && move.power > 0) {
      return { damage: 0, crit: false, effectiveness: 1.0, statusApplied: null, healAmount: 0, skipped: false };
    }
  }

  // Accuracy check
  let accuracy = move.accuracy;
  const accAbility = getAbilityEffect(attacker.ability, 'accuracy_calc', {
    self: attacker, opponent: defender,
  });
  if (accAbility?.accuracyMultiplier) accuracy = Math.min(100, accuracy * accAbility.accuracyMultiplier);
  if (rng() * 100 > accuracy) {
    return { damage: 0, crit: false, effectiveness: 1.0, statusApplied: null, healAmount: 0, skipped: false };
  }

  let statusApplied: string | null = null;
  let healAmount = 0;
  const rawTypeEff = getEffectiveness(move.type, defender.type);

  // --- DAMAGE MOVES ---
  if (move.power > 0) {
    // Check attacker damage_calc ability
    const atkAbility = getAbilityEffect(attacker.ability, 'damage_calc', {
      self: attacker, opponent: defender, moveType: move.type, moveCategory: move.category,
    });
    // Check defender damage_taken ability
    const defAbility = getAbilityEffect(defender.ability, 'damage_taken', {
      self: defender, opponent: attacker, moveType: move.type, moveCategory: move.category,
    });

    const critRoll = rng() < 0.0625;
    const randomFactor = 0.85 + rng() * 0.15;

    const result = calculateDamage({
      attacker, defender, moveId,
      randomFactor,
      forceCrit: critRoll,
    });

    let dmg = result.damage;

    // Apply attacker ability damage multiplier
    if (atkAbility?.damageMultiplier) dmg = Math.floor(dmg * atkAbility.damageMultiplier);
    // Apply Corrosion defense ignore
    if (atkAbility?.defenseIgnorePercent) dmg = Math.floor(dmg * (1 + atkAbility.defenseIgnorePercent));
    // Apply defender ability damage reduction
    if (defAbility?.damageMultiplier && rawTypeEff > 1) dmg = Math.floor(dmg * defAbility.damageMultiplier);
    // Apply Multiscale
    if (defAbility?.damageMultiplier && rawTypeEff <= 1) {
      // Multiscale applies regardless of effectiveness
      if (defender.ability === 'Multiscale') dmg = Math.floor(dmg * defAbility.damageMultiplier);
    }

    dmg = Math.max(1, dmg);

    // Sturdy: survive with 1 HP
    if (defender.currentHP - dmg <= 0 && !defender.sturdyUsed) {
      const sturdyEffect = getAbilityEffect(defender.ability, 'before_faint', {
        self: defender, opponent: attacker,
      });
      if (sturdyEffect?.surviveWith1HP) {
        dmg = defender.currentHP - 1;
        defender.sturdyUsed = true;
      }
    }

    defender.currentHP = Math.max(0, defender.currentHP - dmg);

    // Sleep: wake on damage
    if (defender.status === 'sleep' && dmg > 0) {
      defender.status = null;
      defender.statusTurns = 0;
    }

    // Recoil
    if (move.effects) {
      const recoilEffect = move.effects.find(e => e.type === 'recoil');
      if (recoilEffect?.percent) {
        const recoil = Math.max(1, Math.floor(dmg * recoilEffect.percent / 100));
        attacker.currentHP = Math.max(0, attacker.currentHP - recoil);
      }

      // Drain
      const drainEffect = move.effects.find(e => e.type === 'drain');
      if (drainEffect?.percent) {
        const heal = Math.max(1, Math.floor(dmg * drainEffect.percent / 100));
        attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + heal);
        healAmount += heal;
      }

      // Heal based on damage (e.g. Bloom Doom)
      const healEffect = move.effects.find(e => e.type === 'heal' && move.power > 0);
      if (healEffect?.percent) {
        const heal = Math.max(1, Math.floor(dmg * healEffect.percent / 100));
        attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + heal);
        healAmount += heal;
      }

      // Flinch
      const flinchEffect = move.effects.find(e => e.type === 'flinch');
      if (flinchEffect?.chance && rng() * 100 < flinchEffect.chance) {
        defender.flinched = true;
      }

      // Status infliction from move
      const statusEffect = move.effects.find(e => e.type === 'status');
      if (statusEffect && statusEffect.chance && !defender.status) {
        if (statusEffect.target === 'self' && statusEffect.status) {
          // Self-confusion (e.g. Outrage)
          attacker.status = statusEffect.status;
          attacker.statusTurns = 0;
        } else if (rng() * 100 < statusEffect.chance && statusEffect.status && !defender.status) {
          defender.status = statusEffect.status;
          defender.statusTurns = 0;
          statusApplied = statusEffect.status;
        }
      }

      // Stat drop on opponent from damaging move
      const statDropOpp = move.effects.find(e => e.type === 'stat_drop' && e.target === 'opponent');
      if (statDropOpp?.stat) {
        const chance = statDropOpp.chance ?? 100;
        if (rng() * 100 < chance) {
          const statKey = mapStatToStageKey(statDropOpp.stat);
          if (statKey) {
            defender.statStages[statKey] = Math.max(-6, defender.statStages[statKey] - (statDropOpp.stages ?? 1));
          }
        }
      }

      // Stat boost on self from damaging move (e.g. Flame Charge, Metal Claw)
      const statBoostSelf = move.effects.find(e => e.type === 'stat_boost' && e.target === 'self');
      if (statBoostSelf?.stat) {
        const chance = statBoostSelf.chance ?? 100;
        if (rng() * 100 < chance) {
          const statKey = mapStatToStageKey(statBoostSelf.stat);
          if (statKey) {
            attacker.statStages[statKey] = Math.min(6, attacker.statStages[statKey] + (statBoostSelf.stages ?? 1));
          }
        }
      }

      // Stat drop on self from damaging move (e.g. Draco Meteor, Close Combat)
      const statDropSelf = move.effects.find(e => e.type === 'stat_drop' && e.target === 'self');
      if (statDropSelf?.stat) {
        const statKey = mapStatToStageKey(statDropSelf.stat);
        if (statKey) {
          attacker.statStages[statKey] = Math.max(-6, attacker.statStages[statKey] - (statDropSelf.stages ?? 1));
        }
      }
    }

    // Attacker after_hit ability (Inferno, Permafrost, Poison Touch)
    const atkAfterHit = getAbilityEffect(attacker.ability, 'after_hit', {
      self: attacker, opponent: defender, moveType: move.type, moveCategory: move.category,
    });
    if (atkAfterHit?.statusToApply && atkAfterHit.statusChance && !defender.status) {
      if (rng() < atkAfterHit.statusChance) {
        defender.status = atkAfterHit.statusToApply;
        defender.statusTurns = 0;
        statusApplied = atkAfterHit.statusToApply;
      }
    }

    // Defender after_hit_received ability (Static, Cursed Body)
    const defAfterHitReceived = getAbilityEffect(defender.ability, 'after_hit_received', {
      self: defender, opponent: attacker, moveType: move.type, moveCategory: move.category,
    });
    if (defAfterHitReceived?.statusToApply && defAfterHitReceived.statusChance && !attacker.status) {
      if (rng() < defAfterHitReceived.statusChance) {
        attacker.status = defAfterHitReceived.statusToApply;
        attacker.statusTurns = 0;
      }
    }
    if (defAfterHitReceived?.opponentStatDrop && defAfterHitReceived.statusChance) {
      if (rng() < defAfterHitReceived.statusChance) {
        // Drop attacker's highest stat stage by 1
        const stages = attacker.statStages;
        let bestKey: keyof typeof stages = 'atk';
        let bestVal = -Infinity;
        for (const k of ['atk', 'def', 'spa', 'spd', 'spe'] as const) {
          if (stages[k] > bestVal) { bestVal = stages[k]; bestKey = k; }
        }
        stages[bestKey] = Math.max(-6, stages[bestKey] - 1);
      }
    }

    return {
      damage: dmg, crit: result.crit, effectiveness: Math.min(rawTypeEff, 1.5),
      statusApplied, healAmount, skipped: false,
    };

  } else {
    // --- STATUS / UTILITY MOVES ---
    if (move.effects) {
      // Stat boost (self, guaranteed)
      const statBoost = move.effects.find(e => e.type === 'stat_boost' && e.target === 'self');
      if (statBoost?.stat) {
        const statKey = mapStatToStageKey(statBoost.stat);
        if (statKey) {
          attacker.statStages[statKey] = Math.min(6, attacker.statStages[statKey] + (statBoost.stages ?? 1));
        }
      }

      // Stat drop (opponent)
      const statDrop = move.effects.find(e => e.type === 'stat_drop' && e.target === 'opponent');
      if (statDrop?.stat) {
        const chance = statDrop.chance ?? 100;
        if (rng() * 100 < chance) {
          const statKey = mapStatToStageKey(statDrop.stat);
          if (statKey) {
            defender.statStages[statKey] = Math.max(-6, defender.statStages[statKey] - (statDrop.stages ?? 1));
          }
        }
      }

      // Status infliction
      const statusInflict = move.effects.find(e => e.type === 'status');
      if (statusInflict && !defender.status && statusInflict.status) {
        const chance = statusInflict.chance ?? 100;
        if (rng() * 100 < chance) {
          defender.status = statusInflict.status;
          defender.statusTurns = 0;
          statusApplied = statusInflict.status;
        }
      }

      // Heal (self)
      const healEffect = move.effects.find(e => e.type === 'heal');
      if (healEffect?.percent) {
        const heal = Math.max(1, Math.floor(attacker.maxHP * healEffect.percent / 100));
        attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + heal);
        healAmount += heal;
      }

      // Leech Seed
      const leechSeed = move.effects.find(e => e.type === 'leech_seed');
      if (leechSeed && !defender.leechSeeded) {
        defender.leechSeeded = true;
      }

      // Curse
      const curse = move.effects.find(e => e.type === 'curse');
      if (curse) {
        const sacrifice = Math.max(1, Math.floor(attacker.maxHP * 0.25));
        attacker.currentHP = Math.max(0, attacker.currentHP - sacrifice);
        defender.cursed = true;
      }

      // Reset stats (Haze)
      const resetStats = move.effects.find(e => e.type === 'reset_stats');
      if (resetStats) {
        for (const k of ['atk', 'def', 'spa', 'spd', 'spe'] as const) {
          battle.fighterA.statStages[k] = 0;
          battle.fighterB.statStages[k] = 0;
        }
      }
    }

    return { damage: 0, crit: false, effectiveness: 1.0, statusApplied, healAmount, skipped: false };
  }
}

/**
 * Map stat name (from move effects) to stat stage key.
 */
function mapStatToStageKey(stat: string): keyof FighterState['statStages'] | null {
  const map: Record<string, keyof FighterState['statStages']> = {
    attack: 'atk', defense: 'def', sp_atk: 'spa', sp_def: 'spd', speed: 'spe',
  };
  return map[stat] ?? null;
}

/**
 * Apply end-of-turn effects: status damage, leech seed, curse, ability heals, status ticking.
 */
function applyEndOfTurnEffects(battle: BattleState, fighter: FighterState, opponent: FighterState): string | null {
  let abilityTriggered: string | null = null;

  // Status damage (burn/poison) — check Magic Guard immunity
  const magicGuard = getAbilityEffect(fighter.ability, 'status_damage', {
    self: fighter, opponent,
  });
  if (!magicGuard?.immuneTo) {
    const statusDmg = applyStatusDamage(fighter.status, fighter.maxHP);
    if (statusDmg > 0) {
      fighter.currentHP = Math.max(0, fighter.currentHP - statusDmg);
    }
  }

  // Leech seed drain
  if (fighter.leechSeeded) {
    const drain = Math.max(1, Math.floor(fighter.maxHP / 12));
    fighter.currentHP = Math.max(0, fighter.currentHP - drain);
    opponent.currentHP = Math.min(opponent.maxHP, opponent.currentHP + drain);
  }

  // Curse damage
  if (fighter.cursed) {
    const curseDmg = Math.max(1, Math.floor(fighter.maxHP * 0.125));
    fighter.currentHP = Math.max(0, fighter.currentHP - curseDmg);
  }

  // End-turn ability heals (Hydration, Photosynthesis, Ice Body)
  const endTurnAbility = getAbilityEffect(fighter.ability, 'end_turn', {
    self: fighter, opponent,
  });
  if (endTurnAbility?.healPercent) {
    const heal = Math.max(1, Math.floor(fighter.maxHP * endTurnAbility.healPercent));
    const oldHP = fighter.currentHP;
    fighter.currentHP = Math.min(fighter.maxHP, fighter.currentHP + heal);
    if (fighter.currentHP > oldHP) abilityTriggered = fighter.ability;
  }

  // Tick status duration
  fighter.statusTurns++;
  const tick = tickStatus(fighter.status, fighter.statusTurns);
  if (tick.cured) {
    fighter.status = null;
    fighter.statusTurns = 0;
  }

  return abilityTriggered;
}

/**
 * Resolve a single turn of combat.
 * MUTATES battle state and pushes TurnResult to battle.turns.
 */
export function resolveTurn(
  battle: BattleState,
  moveA: string,
  moveB: string,
  rng?: RNG,
): TurnResult {
  const randomFn: RNG = rng ?? Math.random;

  battle.turnNumber++;

  // Reset per-turn flags
  battle.fighterA.flinched = false;
  battle.fighterB.flinched = false;

  // --- Determine move order ---
  let firstSide: 'a' | 'b' = 'a';

  // Check for priority moves
  const moveAData = getMoveById(moveA);
  const moveBData = getMoveById(moveB);
  const aPriority = (moveAData?.effects?.find(e => e.type === 'priority')) ? 1 : 0;
  const bPriority = (moveBData?.effects?.find(e => e.type === 'priority')) ? 1 : 0;

  // Gale Wings ability: +1 priority when HP full
  const aGaleWings = battle.fighterA.ability === 'Gale Wings' && battle.fighterA.currentHP === battle.fighterA.maxHP ? 1 : 0;
  const bGaleWings = battle.fighterB.ability === 'Gale Wings' && battle.fighterB.currentHP === battle.fighterB.maxHP ? 1 : 0;

  const aFinalPriority = aPriority + aGaleWings;
  const bFinalPriority = bPriority + bGaleWings;

  if (bFinalPriority > aFinalPriority) {
    firstSide = 'b';
  } else if (aFinalPriority === bFinalPriority) {
    const speedA = getEffectiveSpeed(battle.fighterA);
    const speedB = getEffectiveSpeed(battle.fighterB);
    if (speedB > speedA) {
      firstSide = 'b';
    } else if (speedB === speedA) {
      // Level tiebreak, then random
      if (battle.fighterB.level > battle.fighterA.level) {
        firstSide = 'b';
      } else if (battle.fighterB.level === battle.fighterA.level && randomFn() < 0.5) {
        firstSide = 'b';
      }
    }
  }

  const first = firstSide === 'a' ? battle.fighterA : battle.fighterB;
  const second = firstSide === 'a' ? battle.fighterB : battle.fighterA;
  const firstMove = firstSide === 'a' ? moveA : moveB;
  const secondMove = firstSide === 'a' ? moveB : moveA;

  // --- Execute first mover ---
  const hpABefore = battle.fighterA.currentHP;
  const hpBBefore = battle.fighterB.currentHP;

  const firstResult = applyMove(
    battle, first, second, firstMove, randomFn,
  );

  // Check if second mover fainted
  let secondResult = { damage: 0, crit: false, effectiveness: 1.0 as number, statusApplied: null as string | null, healAmount: 0, skipped: false };
  if (second.currentHP > 0) {
    secondResult = applyMove(
      battle, second, first, secondMove, randomFn,
    );
  }

  // --- End-of-turn effects ---
  let abilityA: string | null = null;
  let abilityB: string | null = null;

  if (battle.fighterA.currentHP > 0) {
    abilityA = applyEndOfTurnEffects(battle, battle.fighterA, battle.fighterB);
  }
  if (battle.fighterB.currentHP > 0) {
    abilityB = applyEndOfTurnEffects(battle, battle.fighterB, battle.fighterA);
  }

  // --- Check for faints ---
  if (battle.fighterA.currentHP <= 0 && battle.fighterB.currentHP <= 0) {
    battle.status = 'finished';
    // Both fainted — first mover wins
    battle.winnerId = first.nftId;
  } else if (battle.fighterA.currentHP <= 0) {
    battle.status = 'finished';
    battle.winnerId = battle.fighterB.nftId;
  } else if (battle.fighterB.currentHP <= 0) {
    battle.status = 'finished';
    battle.winnerId = battle.fighterA.nftId;
  }

  // Build TurnResult
  const rawEffA = moveAData ? getEffectiveness(moveAData.type, battle.fighterB.type) : 1.0;
  const rawEffB = moveBData ? getEffectiveness(moveBData.type, battle.fighterA.type) : 1.0;

  const aResult = firstSide === 'a' ? firstResult : secondResult;
  const bResult = firstSide === 'a' ? secondResult : firstResult;
  const aHpBefore = firstSide === 'a' ? hpBBefore : hpABefore; // defender's HP before A attacked
  const bHpBefore = firstSide === 'a' ? hpABefore : hpBBefore;

  const turnResult: TurnResult = {
    turn: battle.turnNumber,
    fighter_a: {
      move: moveA,
      damage_dealt: aResult.damage,
      critical: aResult.crit,
      effectiveness: getEffectivenessLabel(rawEffA),
      status_applied: aResult.statusApplied,
      hp_before: hpABefore,
      hp_after: battle.fighterA.currentHP,
      ...(aResult.healAmount > 0 ? { heal_amount: aResult.healAmount } : {}),
    },
    fighter_b: {
      move: moveB,
      damage_dealt: bResult.damage,
      critical: bResult.crit,
      effectiveness: getEffectivenessLabel(rawEffB),
      status_applied: bResult.statusApplied,
      hp_before: hpBBefore,
      hp_after: battle.fighterB.currentHP,
      ...(bResult.healAmount > 0 ? { heal_amount: bResult.healAmount } : {}),
    },
    order: firstSide === 'a' ? 'a_first' : 'b_first',
    end_of_turn: {
      fighter_a_hp: battle.fighterA.currentHP,
      fighter_b_hp: battle.fighterB.currentHP,
      fighter_a_status: battle.fighterA.status,
      fighter_b_status: battle.fighterB.status,
      fighter_a_stat_stages: { ...battle.fighterA.statStages },
      fighter_b_stat_stages: { ...battle.fighterB.statStages },
      ability_triggered: abilityA ?? abilityB ?? null,
    },
  };

  battle.turns.push(turnResult);
  return turnResult;
}
