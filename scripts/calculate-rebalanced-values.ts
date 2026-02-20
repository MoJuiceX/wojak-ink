/**
 * Calculate exact rebalanced point values for all combat sources.
 * Run with: npx tsx scripts/calculate-rebalanced-values.ts
 */

import { TRAIT_COMBAT_MAP } from '../src/lib/combat/data/trait-type-map';
import { DETAIL_COMBAT_MAP } from '../src/lib/combat/data/detail-combat-map';
import { COMBAT_TYPES } from '../src/lib/combat/types';
import type { CombatType } from '../src/lib/combat/types';

console.log('═'.repeat(70));
console.log('COMPLETE COMBAT SOURCE ANALYSIS & REBALANCING');
console.log('═'.repeat(70));

// ============================================================================
// SOURCE 1: TRAITS (trait-type-map.ts)
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('SOURCE 1: TRAITS (trait-type-map.ts)');
console.log('═'.repeat(70));

interface TraitInfo {
  traitId: string;
  layer: string;
  name: string;
  primaryType: CombatType;
  currentPts: number;
  secondaryType: CombatType | null;
  secondaryPts: number;
}

const allTraits: TraitInfo[] = [];
const traitsByType: Record<CombatType, TraitInfo[]> = {} as any;
for (const t of COMBAT_TYPES) traitsByType[t] = [];

for (const [traitId, entry] of Object.entries(TRAIT_COMBAT_MAP)) {
  const info: TraitInfo = {
    traitId,
    layer: entry.layer,
    name: entry.name,
    primaryType: entry.typePoints.primary,
    currentPts: entry.typePoints.primaryPts,
    secondaryType: entry.typePoints.secondary || null,
    secondaryPts: entry.typePoints.secondaryPts || 0,
  };
  allTraits.push(info);
  traitsByType[info.primaryType].push(info);
}

console.log(`\nTotal traits: ${allTraits.length}`);

// Count by type
const traitCountByType: Record<CombatType, number> = {} as any;
const currentPointsByType: Record<CombatType, number> = {} as any;

for (const t of COMBAT_TYPES) {
  traitCountByType[t] = traitsByType[t].length;
  currentPointsByType[t] = traitsByType[t].reduce((sum, tr) => sum + tr.currentPts, 0);
}

// Calculate rebalanced points
// Target: each type should have roughly equal "max potential"
// Formula: newPts = targetTotal / traitCount
const TARGET_TOTAL = 45; // Target max potential per type

console.log('\nTrait distribution and rebalanced points:');
console.log('─'.repeat(70));
console.log('Type         Traits  CurPts  CurMax   NewPts  NewMax   Change');
console.log('─'.repeat(70));

const rebalancedTraitPts: Record<CombatType, number> = {} as any;

const sortedByCount = COMBAT_TYPES.map(t => ({
  type: t,
  count: traitCountByType[t],
  currentPts: currentPointsByType[t],
})).sort((a, b) => b.count - a.count);

for (const { type, count, currentPts } of sortedByCount) {
  // Calculate new points per trait to achieve target total
  const newPts = count > 0 ? Math.round(TARGET_TOTAL / count) : 5;
  // Clamp between 2 and 9 to avoid extremes
  const clampedPts = Math.max(2, Math.min(9, newPts));
  rebalancedTraitPts[type] = clampedPts;

  const newMax = count * clampedPts;
  const change = newMax - currentPts;
  const changeStr = change > 0 ? `+${change}` : change.toString();

  console.log(
    `${type.padEnd(12)} ${count.toString().padStart(6)}  ${currentPts.toString().padStart(6)}  ${currentPts.toString().padStart(6)}   ${clampedPts.toString().padStart(6)}  ${newMax.toString().padStart(6)}   ${changeStr.padStart(6)}`
  );
}

// ============================================================================
// SOURCE 2: COLORS (color-type-map.ts)
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('SOURCE 2: COLORS (color-type-map.ts)');
console.log('═'.repeat(70));

console.log(`
Color mapping is CONTINUOUS (hue-based), not discrete.
Current: 3-4 points per color picked.

Hue Range Analysis:
─────────────────────────────────────────────────────────────────
Hue Range      Degrees  % of Spectrum  Primary Type
─────────────────────────────────────────────────────────────────
0-20, 340-360     40°      11.1%       FIRE
20-45             25°       6.9%       DRAGON
45-65             20°       5.6%       ELECTRIC
65-90             25°       6.9%       INSECT
90-150            60°      16.7%       GRASS
150-195           45°      12.5%       WATER
195-230 (L>60)    35°       9.7%       AIR (light blues only)
195-250           55°      15.3%       WATER/PSYCHE
250-280           30°       8.3%       PSYCHE
280-320           40°      11.1%       VENOM
320-340           20°       5.6%       MYSTIC

Plus achromatic (grays): maps to ICE/AIR/METAL/NEUTRAL/STONE/SHADOW by lightness

Color distribution is relatively balanced by design (hue wheel coverage).
The main skew comes from TRAITS, not colors.

RECOMMENDATION: Keep colors at 3 pts (or reduce to 2 for less noise).
No rebalancing needed for colors.
`);

// ============================================================================
// SOURCE 3: DETAILS (detail-combat-map.ts)
// ============================================================================

console.log('\n' + '═'.repeat(70));
console.log('SOURCE 3: DETAILS (detail-combat-map.ts)');
console.log('═'.repeat(70));

const detailsByType: Record<CombatType, string[]> = {} as any;
for (const t of COMBAT_TYPES) detailsByType[t] = [];

let totalDetails = 0;
for (const [parentTrait, options] of Object.entries(DETAIL_COMBAT_MAP)) {
  for (const [optionName, entry] of Object.entries(options)) {
    totalDetails++;
    if (entry.typeBonus) {
      detailsByType[entry.typeBonus.type].push(`${parentTrait}:${optionName}`);
    }
  }
}

console.log(`\nTotal detail options: ${totalDetails}`);
console.log('\nDetail options by type:');
console.log('─'.repeat(50));

for (const t of COMBAT_TYPES) {
  const count = detailsByType[t].length;
  if (count > 0) {
    console.log(`${t.padEnd(12)} ${count} options`);
  }
}

const typesWithNoDetails = COMBAT_TYPES.filter(t => detailsByType[t].length === 0);
console.log(`\nTypes with NO detail options: ${typesWithNoDetails.join(', ')}`);

console.log(`
Detail options contribute only 1-2 pts each and are OPTIONAL.
They have minimal impact on overall distribution.

RECOMMENDATION: No changes needed for details.
`);

// ============================================================================
// FINAL REBALANCED VALUES
// ============================================================================

console.log('\n' + '═'.repeat(70));
console.log('FINAL REBALANCED TRAIT POINT VALUES');
console.log('═'.repeat(70));

console.log(`
Target: ~45 pts max potential per type
Formula: points = round(45 / traitCount), clamped to [2, 9]
`);

console.log('Copy-paste ready values for trait-type-map.ts:');
console.log('─'.repeat(50));
console.log('\nconst TYPE_POINTS: Record<CombatType, number> = {');
for (const t of COMBAT_TYPES) {
  console.log(`  '${t}': ${rebalancedTraitPts[t]},`);
}
console.log('};');

// ============================================================================
// GENERATE UPDATED TRAIT MAP ENTRIES
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('UPDATED TRAIT-TYPE-MAP ENTRIES');
console.log('═'.repeat(70));

console.log(`
Below are the trait entries that need point value changes.
Only showing traits where currentPts ≠ newPts.
`);

const changes: { traitId: string; name: string; type: CombatType; oldPts: number; newPts: number }[] = [];

for (const trait of allTraits) {
  const newPts = rebalancedTraitPts[trait.primaryType];
  if (trait.currentPts !== newPts) {
    changes.push({
      traitId: trait.traitId,
      name: trait.name,
      type: trait.primaryType,
      oldPts: trait.currentPts,
      newPts,
    });
  }
}

console.log(`\nTotal changes needed: ${changes.length} out of ${allTraits.length} traits`);

// Group by type for easier review
const changesByType: Record<CombatType, typeof changes> = {} as any;
for (const t of COMBAT_TYPES) changesByType[t] = [];
for (const c of changes) changesByType[c.type].push(c);

for (const t of COMBAT_TYPES) {
  const typeChanges = changesByType[t];
  if (typeChanges.length === 0) continue;

  const newPts = rebalancedTraitPts[t];
  const oldPts = typeChanges[0].oldPts;

  console.log(`\n${t} (${oldPts} → ${newPts} pts):`);
  for (const c of typeChanges) {
    console.log(`  '${c.traitId}': ${c.oldPts} → ${c.newPts}`);
  }
}

// ============================================================================
// VERIFICATION: PROJECTED NEW DISTRIBUTION
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('VERIFICATION: PROJECTED DISTRIBUTION AFTER REBALANCE');
console.log('═'.repeat(70));

console.log('\nProjected max potential per type (traits only):');
console.log('─'.repeat(50));

const projected = COMBAT_TYPES.map(t => ({
  type: t,
  count: traitCountByType[t],
  oldMax: currentPointsByType[t],
  newMax: traitCountByType[t] * rebalancedTraitPts[t],
})).sort((a, b) => b.newMax - a.newMax);

const avgNewMax = projected.reduce((sum, p) => sum + p.newMax, 0) / projected.length;

for (const p of projected) {
  const deviation = ((p.newMax - avgNewMax) / avgNewMax * 100).toFixed(0);
  const status = Math.abs(parseFloat(deviation)) <= 20 ? '✓' : '⚠️';
  console.log(
    `${p.type.padEnd(12)} ${p.count} traits × ${rebalancedTraitPts[p.type as CombatType]} pts = ${p.newMax.toString().padStart(3)} max  (was ${p.oldMax})  ${status} ${deviation}%`
  );
}

console.log(`\nAverage max: ${avgNewMax.toFixed(1)} pts`);
console.log(`Range: ${Math.min(...projected.map(p => p.newMax))} - ${Math.max(...projected.map(p => p.newMax))} pts`);

const oldRange = Math.max(...projected.map(p => p.oldMax)) - Math.min(...projected.map(p => p.oldMax));
const newRange = Math.max(...projected.map(p => p.newMax)) - Math.min(...projected.map(p => p.newMax));

console.log(`\nImprovement:`);
console.log(`  Old range: ${oldRange} pts (${Math.min(...projected.map(p => p.oldMax))} - ${Math.max(...projected.map(p => p.oldMax))})`);
console.log(`  New range: ${newRange} pts (${Math.min(...projected.map(p => p.newMax))} - ${Math.max(...projected.map(p => p.newMax))})`);
console.log(`  Reduction: ${((1 - newRange / oldRange) * 100).toFixed(0)}% tighter distribution`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n\n' + '═'.repeat(70));
console.log('IMPLEMENTATION SUMMARY');
console.log('═'.repeat(70));

console.log(`
WHAT TO CHANGE:

1. trait-type-map.ts — Update primaryPts for ${changes.length} traits
   - File: src/lib/combat/data/trait-type-map.ts
   - Change the 5th parameter in each e() call to the new value

2. identity-calculator.ts — Fix Balanced threshold (line 98)
   - Change: (maxStatVal - minStatVal) <= Math.ceil(avgStat)
   - To:     (maxStatVal - minStatVal) <= 2

NO CHANGES NEEDED:
- color-type-map.ts (already balanced by hue coverage)
- color-nature-map.ts (follows same hue logic)
- detail-combat-map.ts (minimal impact, 1-2 pts each)
- moves.ts (unchanged)
- abilities.ts (unchanged)
- natures.ts (unchanged)

EXPECTED RESULTS:
- Type distribution range: ${oldRange} pts → ${newRange} pts (${((1 - newRange / oldRange) * 100).toFixed(0)}% improvement)
- Balanced nature: ~21% → ~5-8%
- All 18 types and ~22-25 natures should appear in random samples
`);
