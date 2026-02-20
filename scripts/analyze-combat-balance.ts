/**
 * Deep analysis of combat system balance issues.
 * Run with: npx tsx scripts/analyze-combat-balance.ts
 */

import { TRAIT_COMBAT_MAP } from '../src/lib/combat/data/trait-type-map';
import { COMBAT_TYPES, STAT_NAMES } from '../src/lib/combat/types';
import { NATURES } from '../src/lib/combat/data/natures';
import type { CombatType, StatName } from '../src/lib/combat/types';

console.log('═'.repeat(70));
console.log('COMBAT BALANCE ANALYSIS');
console.log('═'.repeat(70));

// ============================================================================
// PART 1: TRAIT → TYPE POINT DISTRIBUTION
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('PART 1: TYPE POINTS FROM TRAITS');
console.log('═'.repeat(70));

// Count primary and secondary type points from all traits
const typePointsFromTraits: Record<CombatType, { primary: number; secondary: number; traits: string[] }> = {} as any;
for (const t of COMBAT_TYPES) {
  typePointsFromTraits[t] = { primary: 0, secondary: 0, traits: [] };
}

for (const [traitId, entry] of Object.entries(TRAIT_COMBAT_MAP)) {
  const { typePoints } = entry;
  typePointsFromTraits[typePoints.primary].primary += typePoints.primaryPts;
  typePointsFromTraits[typePoints.primary].traits.push(traitId);
  if (typePoints.secondary && typePoints.secondaryPts) {
    typePointsFromTraits[typePoints.secondary].secondary += typePoints.secondaryPts;
  }
}

// Sort by total points
const sortedTypes = COMBAT_TYPES.map(t => ({
  type: t,
  primaryPts: typePointsFromTraits[t].primary,
  secondaryPts: typePointsFromTraits[t].secondary,
  totalPts: typePointsFromTraits[t].primary + typePointsFromTraits[t].secondary,
  traitCount: typePointsFromTraits[t].traits.length,
})).sort((a, b) => b.totalPts - a.totalPts);

const avgTotal = sortedTypes.reduce((sum, t) => sum + t.totalPts, 0) / sortedTypes.length;
const avgTraits = sortedTypes.reduce((sum, t) => sum + t.traitCount, 0) / sortedTypes.length;

console.log('\nType points from trait map (sorted by total):');
console.log('─'.repeat(70));
console.log('Type         Primary  Secondary  Total    Traits   Status');
console.log('─'.repeat(70));

for (const t of sortedTypes) {
  const deviation = ((t.totalPts - avgTotal) / avgTotal * 100).toFixed(0);
  const status = t.totalPts > avgTotal * 1.3 ? '⚠️ OVER' : t.totalPts < avgTotal * 0.7 ? '⚠️ UNDER' : '✓';
  console.log(
    `${t.type.padEnd(12)} ${t.primaryPts.toString().padStart(7)}  ${t.secondaryPts.toString().padStart(9)}  ${t.totalPts.toString().padStart(5)}    ${t.traitCount.toString().padStart(6)}   ${status} (${deviation > 0 ? '+' : ''}${deviation}%)`
  );
}

console.log('─'.repeat(70));
console.log(`Average: ${avgTotal.toFixed(1)} pts, ${avgTraits.toFixed(1)} traits per type`);

// Show which traits feed each overrepresented type
console.log('\n\n🔥 OVERREPRESENTED TYPES — Which traits cause this?');
const overTypes = sortedTypes.filter(t => t.totalPts > avgTotal * 1.2);
for (const t of overTypes.slice(0, 5)) {
  console.log(`\n${t.type} (${t.traitCount} traits, ${t.totalPts} pts):`);
  const traits = typePointsFromTraits[t.type as CombatType].traits;
  // Group by layer
  const byLayer: Record<string, string[]> = {};
  for (const traitId of traits) {
    const layer = TRAIT_COMBAT_MAP[traitId].layer;
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(TRAIT_COMBAT_MAP[traitId].name);
  }
  for (const [layer, names] of Object.entries(byLayer)) {
    console.log(`  ${layer}: ${names.join(', ')}`);
  }
}

// Show underrepresented types
console.log('\n\n❄️ UNDERREPRESENTED TYPES — Need more traits:');
const underTypes = sortedTypes.filter(t => t.totalPts < avgTotal * 0.8);
for (const t of underTypes) {
  console.log(`  ${t.type.padEnd(12)} only ${t.traitCount} traits, ${t.totalPts} pts (need ~${Math.round(avgTotal)} pts)`);
}

// ============================================================================
// PART 2: NATURE STAT DISTRIBUTION FROM TRAITS
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('PART 2: NATURE STATS FROM TRAITS');
console.log('═'.repeat(70));

const statPointsFromTraits: Record<StatName, number> = {} as any;
for (const s of STAT_NAMES) statPointsFromTraits[s] = 0;

for (const entry of Object.values(TRAIT_COMBAT_MAP)) {
  if (entry.natureStat && entry.natureStatPts) {
    statPointsFromTraits[entry.natureStat] += entry.natureStatPts;
  }
}

const sortedStats = STAT_NAMES.map(s => ({
  stat: s,
  pts: statPointsFromTraits[s],
})).sort((a, b) => b.pts - a.pts);

const avgStatPts = sortedStats.reduce((sum, s) => sum + s.pts, 0) / sortedStats.length;

console.log('\nStat points from trait map:');
console.log('─'.repeat(50));
for (const s of sortedStats) {
  const deviation = ((s.pts - avgStatPts) / avgStatPts * 100).toFixed(0);
  const bar = '█'.repeat(Math.round(s.pts / 10));
  console.log(`${s.stat.padEnd(10)} ${s.pts.toString().padStart(4)} pts  ${bar} (${deviation > 0 ? '+' : ''}${deviation}%)`);
}
console.log('─'.repeat(50));
console.log(`Average: ${avgStatPts.toFixed(1)} pts per stat`);

// ============================================================================
// PART 3: NATURE COVERAGE ANALYSIS
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('PART 3: NATURE COVERAGE ANALYSIS');
console.log('═'.repeat(70));

// What boost/reduce combos are possible from the trait map?
const _possibleCombos = new Set<string>();

// For each pair of stats, check if there's a way to get that combo
// A nature needs: highest stat (boost) and lowest stat (reduce)
// This depends on trait selection AND colors

console.log('\nNature matrix (boost → reduce):');
console.log('Which natures can actually occur based on trait stat distribution?');
console.log('─'.repeat(70));

const natureMatrix: Record<string, Record<string, string | null>> = {};
for (const boost of [...STAT_NAMES, null]) {
  natureMatrix[boost || 'null'] = {};
  for (const reduce of [...STAT_NAMES, null]) {
    if (boost === reduce && boost !== null) {
      natureMatrix[boost || 'null'][reduce || 'null'] = '-';
      continue;
    }
    const nature = NATURES.find(n => n.boost === boost && n.reduce === reduce);
    natureMatrix[boost || 'null'][reduce || 'null'] = nature?.name || '(none)';
  }
}

// Header
console.log('            ' + STAT_NAMES.map(s => s.slice(0, 6).padStart(8)).join('') + '    null');
for (const boost of [...STAT_NAMES, null]) {
  let rowStr = (boost || 'null').padEnd(10) + '  ';
  for (const reduce of [...STAT_NAMES, null]) {
    const val = natureMatrix[boost || 'null'][reduce || 'null'];
    rowStr += val === '-' ? '-'.padStart(8) : (val?.slice(0, 7) ?? '').padStart(8);
  }
  console.log(rowStr);
}

// Just list all natures and their requirements
console.log('\nAll 25 Natures and their stat requirements:');
console.log('─'.repeat(60));
const naturesWithStats = NATURES.filter(n => n.boost || n.reduce);
const neutralNatures = NATURES.filter(n => !n.boost && !n.reduce);

console.log('NEUTRAL NATURES (boost=null, reduce=null):');
for (const n of neutralNatures) {
  console.log(`  ${n.name}`);
}

console.log('\nSTAT-BASED NATURES (need specific high/low stat combo):');
for (const n of naturesWithStats) {
  console.log(`  ${n.name.padEnd(12)} boost=${(n.boost || '-').padEnd(7)} reduce=${n.reduce || '-'}`);
}

// ============================================================================
// PART 4: THE BALANCED PROBLEM
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('PART 4: THE "BALANCED" THRESHOLD PROBLEM');
console.log('═'.repeat(70));

console.log(`
Current logic in identity-calculator.ts (lines 93-101):

  const avgStat = totalStats / STAT_NAMES.length;
  const isBalanced = (maxStatVal - minStatVal) <= Math.ceil(avgStat);

Problem: With 5 stats and typical totals of 15-30 points:
  - avgStat ≈ 3-6 points
  - A spread of 3-6 points triggers "Balanced"
  - This is VERY common because most builds have similar stat totals

Example with 20 total stat points:
  - avgStat = 20/5 = 4
  - If stats are [5, 4, 4, 4, 3], spread = 5-3 = 2 ≤ 4 → BALANCED
  - If stats are [6, 5, 4, 3, 2], spread = 6-2 = 4 ≤ 4 → BALANCED
  - Only [8, 5, 4, 2, 1] with spread = 7 > 4 → NOT balanced

This explains why 21% of Wojaks get "Balanced" nature!
`);

// ============================================================================
// PART 5: LAYER DISTRIBUTION ANALYSIS
// ============================================================================

console.log('\n' + '═'.repeat(70));
console.log('PART 5: TYPE DISTRIBUTION BY LAYER');
console.log('═'.repeat(70));

const typesByLayer: Record<string, Record<CombatType, number>> = {};

for (const entry of Object.values(TRAIT_COMBAT_MAP)) {
  const layer = entry.layer;
  if (!typesByLayer[layer]) {
    typesByLayer[layer] = {} as Record<CombatType, number>;
    for (const t of COMBAT_TYPES) typesByLayer[layer][t] = 0;
  }
  typesByLayer[layer][entry.typePoints.primary]++;
}

for (const [layer, types] of Object.entries(typesByLayer)) {
  const total = Object.values(types).reduce((a, b) => a + b, 0);
  const topTypes = Object.entries(types)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t, v]) => `${t}(${v})`);

  const coverage = Object.values(types).filter(v => v > 0).length;
  console.log(`\n${layer} (${total} traits, ${coverage}/18 types):`);
  console.log(`  Top: ${topTypes.join(', ')}`);

  // Missing types for this layer
  const missing = COMBAT_TYPES.filter(t => types[t] === 0);
  if (missing.length > 0) {
    console.log(`  Missing: ${missing.join(', ')}`);
  }
}

// ============================================================================
// PART 6: RECOMMENDATIONS
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('RECOMMENDATIONS FOR FAIR DISTRIBUTION');
console.log('═'.repeat(70));

console.log(`
🎯 GOAL: Users pick what looks cool → natural diverse distribution

══════════════════════════════════════════════════════════════════════
RECOMMENDATION 1: NORMALIZE TYPE POINTS IN TRAIT MAP
══════════════════════════════════════════════════════════════════════

Current problem: Some types have 5x more trait support than others.

Solution A — Rebalance existing traits:
  - Reduce primary points for overrepresented types (SHADOW, FIRE, PSYCHE)
  - Increase primary points for underrepresented types (WATER, MARTIAL)
  - OR reassign some traits to different primary types

Solution B — Add synthetic "type balancing" in the calculator:
  - After summing all type points, apply a normalization factor
  - Types with fewer traits get a multiplier boost
  - This is invisible to users but evens out distribution

Recommended approach: Solution B (no trait map changes, pure algorithm fix)

══════════════════════════════════════════════════════════════════════
RECOMMENDATION 2: FIX THE BALANCED NATURE THRESHOLD
══════════════════════════════════════════════════════════════════════

Current: isBalanced = (max - min) <= ceil(avgStat)  // ~21% balanced

Options:
  A) Stricter threshold: (max - min) <= ceil(avgStat / 2)  // ~8% balanced
  B) Fixed threshold: (max - min) <= 2  // Very strict
  C) Percentile-based: Only balanced if all stats within 20% of each other
  D) Random tiebreaker: When balanced, randomly pick a nature instead

Recommended: Option A or C — reduce Balanced to ~5-10% of builds

══════════════════════════════════════════════════════════════════════
RECOMMENDATION 3: ENSURE ALL NATURES ARE REACHABLE
══════════════════════════════════════════════════════════════════════

Problem: 8 natures never appeared in 100 samples.

Root cause: The stat distribution from traits doesn't create all
boost/reduce combinations equally.

Solution: In identity calculation, if a rare boost/reduce combo would
occur, don't override it to Balanced. The "isBalanced" check should
only apply when stats are TRULY even, not just "close enough".

══════════════════════════════════════════════════════════════════════
RECOMMENDATION 4: COLOR CONTRIBUTION REBALANCING
══════════════════════════════════════════════════════════════════════

Colors currently add 3-4 points per color. With 1-3 colors per Wojak,
that's 3-12 extra points that can heavily swing the type.

Consider: Reduce color point contribution from 3→2 primary points
so traits (the intentional choices) matter more than colors (often
random or aesthetic).

══════════════════════════════════════════════════════════════════════
IMPLEMENTATION PRIORITY
══════════════════════════════════════════════════════════════════════

1. [HIGH] Fix Balanced threshold — quick code change, big impact
2. [HIGH] Add type normalization — algorithm change, no data changes
3. [MED]  Audit trait map for worst offenders — may need some reassignments
4. [LOW]  Reduce color point contribution — minor tweak

`);

// ============================================================================
// PART 7: SPECIFIC TRAIT REASSIGNMENT SUGGESTIONS
// ============================================================================

console.log('\n' + '═'.repeat(70));
console.log('SPECIFIC TRAIT REASSIGNMENT SUGGESTIONS');
console.log('═'.repeat(70));

// Find traits that could reasonably be reassigned to underrepresented types
const _underrepTypes = new Set(['WATER', 'ELECTRIC', 'MARTIAL', 'DRAGON', 'STONE']);
const _overrepTypes = new Set(['SHADOW', 'GHOST', 'PSYCHE', 'FIRE']);

console.log(`
To improve balance, consider reassigning some traits from overrepresented
types to underrepresented ones. Here are logical candidates:

FROM SHADOW (over) → TO alternatives:
  - Born to Ride → METAL (leather/chrome aesthetic)
  - Bandana Mask → MARTIAL (street fighter vibe)
  - Alpha Shades → DRAGON (power aesthetic)

FROM GHOST (over) → TO alternatives:
  - Fedora → SHADOW or PSYCHE (keep one ghost hat)
  - Rekt (Base) → PSYCHE (mental state, not undead)

FROM FIRE (over) → TO alternatives:
  - Stache → MARTIAL (tough guy, not fire)
  - Super Mario Cap → EARTH (plumber = pipes = earth?)

ADD NEW TRAITS FOR UNDERREPRESENTED TYPES:
  - WATER: Sailor outfit, Fishing hat, Swim goggles, Beach background
  - ELECTRIC: Gamer headset, LED jacket, Rave background
  - MARTIAL: Boxing gloves, Gi outfit, Dojo headband
  - DRAGON: Scale armor, Dragon mask, Throne background
  - STONE: Mining helmet, Quarry background, Boulder shoulders
`);
