#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourcePath = path.join(repoRoot, 'public/assets/BigPulp/nft_takes_v2.json');
const outPath = path.join(repoRoot, 'public/assets/BigPulp/nft_takes_lite.json');

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const lite = {};

for (const [edition, entry] of Object.entries(source)) {
  lite[edition] = {
    open_rarity_rank: entry.open_rarity_rank,
    is_top_10: Boolean(entry.flags?.is_top_10),
  };
}

writeFileSync(outPath, `${JSON.stringify(lite)}\n`, 'utf8');
console.log(`[bigpulp-takes-lite] wrote ${path.relative(repoRoot, outPath)}`);
