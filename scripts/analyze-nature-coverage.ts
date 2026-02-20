/**
 * Analyze nature coverage gaps - which natures never appear and why.
 * Run with: npx tsx scripts/analyze-nature-coverage.ts
 */

import { TRAIT_COMBAT_MAP } from '../src/lib/combat/data/trait-type-map';
import { calculateCombatIdentity } from '../src/lib/combat/identity-calculator';
import { NATURES } from '../src/lib/combat/data/natures';
import { STAT_NAMES } from '../src/lib/combat/types';
import type { StatName } from '../src/lib/combat/types';

// Group traits by layer for random selection
const traitsByLayer: Record<string, string[]> = {};
for (const [traitId, entry] of Object.entries(TRAIT_COMBAT_MAP)) {
  const layer = entry.layer;
  if (!traitsByLayer[layer]) traitsByLayer[layer] = [];
  traitsByLayer[layer].push(traitId);
}

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomWojak(): { traits: { traitId: string; layer: string }[]; colors: Record<string, string> } {
  const traits: { traitId: string; layer: string }[] = [];
  const colors: Record<string, string> = {};

  const base = pick(traitsByLayer['Base']);
  traits.push({ traitId: base, layer: 'Base' });

  const mouth = pick(traitsByLayer['Mouth']);
  traits.push({ traitId: mouth, layer: 'Mouth' });

  const optionalLayers = ['Clothes', 'Head', 'Eyes', 'FacialHair', 'Mask', 'Mouth Item', 'Background'];
  for (const layer of optionalLayers) {
    if (traitsByLayer[layer] && Math.random() > 0.3) {
      const traitId = pick(traitsByLayer[layer]);
      traits.push({ traitId, layer });

      const entry = TRAIT_COMBAT_MAP[traitId];
      if (entry?.colorable && Math.random() > 0.4) {
        colors[traitId] = randomHex();
      }
    }
  }

  return { traits, colors };
}

// Run large simulation
const COUNT = 1000;
console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`NATURE COVERAGE ANALYSIS — ${COUNT} Random Wojaks`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

const natureCount: Record<string, number> = {};
for (const n of NATURES) natureCount[n.name] = 0;

// Track stat combinations that lead to each nature
const _statCombos: Record<string, { boost: StatName | null; reduce: StatName | null; count: number }[]> = {};

for (let i = 0; i < COUNT; i++) {
  const { traits, colors } = generateRandomWojak();
  const identity = calculateCombatIdentity({ traits, colors, details: {} });
  natureCount[identity.nature]++;
}

// Sort by count
const sorted = Object.entries(natureCount).sort((a, b) => b[1] - a[1]);

console.log(`Nature Distribution (${COUNT} samples):`);
console.log(`─────────────────────────────────────────────────────────────────`);
console.log(`Nature          Count    %     Boost      Reduce`);
console.log(`─────────────────────────────────────────────────────────────────`);

for (const [name, count] of sorted) {
  const nature = NATURES.find(n => n.name === name)!;
  const pct = ((count / COUNT) * 100).toFixed(1);
  const boost = nature.boost || '-';
  const reduce = nature.reduce || '-';
  const bar = '█'.repeat(Math.round(count / COUNT * 30));
  const status = count === 0 ? '⚠️ NEVER' : count < 10 ? '⚠️ RARE' : '✓';
  console.log(
    `${name.padEnd(14)} ${count.toString().padStart(5)}  ${pct.padStart(5)}%   ${boost.padEnd(10)} ${reduce.padEnd(10)} ${bar} ${status}`
  );
}

// Analyze missing natures
const missingNatures = sorted.filter(([, count]) => count === 0).map(([name]) => name);
const rareNatures = sorted.filter(([, count]) => count > 0 && count < 10).map(([name]) => name);

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`ANALYSIS`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

console.log(`Coverage: ${sorted.filter(([, c]) => c > 0).length}/25 natures appeared`);
console.log(`Missing: ${missingNatures.length > 0 ? missingNatures.join(', ') : 'None!'}`);
console.log(`Rare (<1%): ${rareNatures.length > 0 ? rareNatures.join(', ') : 'None!'}`);

// Analyze stat distribution from traits
console.log(`\n─────────────────────────────────────────────────────────────────`);
console.log(`STAT DISTRIBUTION FROM TRAITS`);
console.log(`─────────────────────────────────────────────────────────────────\n`);

const statPoints: Record<StatName, number> = {} as any;
const statTraitCount: Record<StatName, number> = {} as any;
for (const s of STAT_NAMES) {
  statPoints[s] = 0;
  statTraitCount[s] = 0;
}

for (const entry of Object.values(TRAIT_COMBAT_MAP)) {
  if (entry.natureStat && entry.natureStatPts) {
    statPoints[entry.natureStat] += entry.natureStatPts;
    statTraitCount[entry.natureStat]++;
  }
}

const sortedStats = STAT_NAMES.map(s => ({
  stat: s,
  pts: statPoints[s],
  traits: statTraitCount[s],
})).sort((a, b) => b.pts - a.pts);

const avgPts = sortedStats.reduce((sum, s) => sum + s.pts, 0) / sortedStats.length;

console.log(`Stat        Traits   Points   Deviation`);
console.log(`─────────────────────────────────────────`);
for (const s of sortedStats) {
  const deviation = ((s.pts - avgPts) / avgPts * 100).toFixed(0);
  const bar = '█'.repeat(Math.round(s.pts / 10));
  console.log(`${s.stat.padEnd(10)} ${s.traits.toString().padStart(6)}   ${s.pts.toString().padStart(6)}   ${deviation.padStart(4)}% ${bar}`);
}

// Explain why certain natures are missing
if (missingNatures.length > 0) {
  console.log(`\n─────────────────────────────────────────────────────────────────`);
  console.log(`WHY CERTAIN NATURES ARE MISSING`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  for (const name of missingNatures) {
    const nature = NATURES.find(n => n.name === name)!;
    const boostStat = nature.boost;
    const reduceStat = nature.reduce;

    if (boostStat && reduceStat) {
      const boostPts = statPoints[boostStat];
      const reducePts = statPoints[reduceStat];
      console.log(`${name}: needs ${boostStat} highest (${boostPts} pts available) and ${reduceStat} lowest (${reducePts} pts available)`);

      if (boostPts < avgPts) {
        console.log(`  → ${boostStat} is underrepresented, rarely becomes highest stat`);
      }
      if (reducePts > avgPts) {
        console.log(`  → ${reduceStat} is overrepresented, rarely becomes lowest stat`);
      }
    }
  }
}

// Summary
console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`RECOMMENDATIONS`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

if (missingNatures.length === 0 && rareNatures.length < 5) {
  console.log(`✅ Nature distribution is healthy!`);
  console.log(`   All or nearly all natures can appear naturally.`);
} else {
  console.log(`To improve nature coverage:`);
  const underrepStats = sortedStats.filter(s => s.pts < avgPts * 0.8);
  const overrepStats = sortedStats.filter(s => s.pts > avgPts * 1.2);

  if (underrepStats.length > 0) {
    console.log(`\n1. Add more traits that boost: ${underrepStats.map(s => s.stat).join(', ')}`);
  }
  if (overrepStats.length > 0) {
    console.log(`\n2. Consider reducing traits that boost: ${overrepStats.map(s => s.stat).join(', ')}`);
  }
}
